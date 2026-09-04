---
name: durable-agent-tree
description: Design or migrate an AI agent execution tree (plan, delegate, tools, tests, final change) onto Temporal so the run outlives its process. Use when placing agent orchestration on Temporal, deciding what belongs in a Workflow, Child Workflow, or Activity, checkpointing long LLM or test calls with heartbeats, making a run survive Worker loss, or stating the at-least-once boundary. Reference implementation is mootrichard/temporal-durable-agents.
---

# Durable agent tree

An agent looks like a conversation; useful agent work is an **execution tree**: plan, delegations, tools, tests, one final change. By default that tree borrows the lifetime of one OS process. The move is ownership: **the Worker executes the work; it does not own the work.** A process is where the work executes; a durable execution is what the work means, what has completed, and what must happen next.

Reference implementation: [temporal-durable-agents](https://github.com/mootrichard/temporal-durable-agents). The same four-node Codex code-repair tree runs process-owned (`src/baseline/orchestrator.ts`) beside Temporal-owned (`src/temporal/workflows.ts`). Paths below are relative to that repo; [docs/how-it-works.md](https://github.com/mootrichard/temporal-durable-agents/blob/main/docs/how-it-works.md) is the long-form walkthrough.

## 1. Draw the tree

List every node: planner turn, each delegated investigation, each tool or test job, the implementing turn, verification, evidence collection. Mark which nodes run concurrently and which node consumes each result.

Done when every node has a name, a parent, and the fact it produces (`coordinator → DelegationPlan`, `test-job → passed files`).

## 2. Write the state ledger

One row per piece of state: state, owner, recovery behavior. Owners are exclusive.

| State | Owner | Recovery |
| --- | --- | --- |
| Plan, fan-out, completed steps | Workflow Execution: Event History | Replayed into the same logical tree |
| Delegated branch identity | Child Workflow with a deterministic ID (`<runId>-<role>`) | Completed child result reused during parent replay |
| Model call, test process, filesystem, Git | Activity | Retried; at-least-once |
| Conversation context | Model provider session, referenced by thread ID | Resume by heartbeated ID; replace from the durable assignment when the session is gone |
| In-flight checkpoint (thread ID, passed files) | Activity heartbeat details | Next Activity Task Execution reads them |
| Source edits, artifacts | Workspace on disk (Git); production: shared durable storage | Survive Worker replacement, not machine loss |
| Live view while Workers are absent | Control plane's last successful Query | Rendered visibly frozen |

Placement rules:

- **Workflow code is deterministic orchestration only**: sequence, fan-out (`Promise.all` of Child Workflows and Activities), and a pure reducer of run state. No model, network, clock, random, filesystem.
- **One Child Workflow per logical subagent.** Derive its ID from the run ID and role so the parent finds the same child after replay; use `parentClosePolicy: REQUEST_CANCEL`. The child's model call is still an Activity.
- **Activities contain every effect** and return the smallest durable fact: thread ID, final response, passed files, diff. The transcript stream is presentation, not history.
- **Domain failure returns as data.** A failed repair is a `failed` result; the Workflow closes Completed. Reserve Workflow failure for infrastructure.

Done when no row lacks an owner and every Activity-owned effect names its idempotency or reconciliation strategy.

## 3. Checkpoint inside long Activities

Long Activities (an LLM turn, file-by-file tests) heartbeat a small resumable payload:

- Model turn: `{ role, threadId?, progress? }`. Set `threadId` on the first `thread.started` event, then the latest progress event.
- Test job: `string[]` of files already passed. The checkpoint loop skips them and stops at the first failure (`src/shared/checkpointed-tests.ts`).
- On retry: `heartbeatDetails.threadId ?? input.threadId`. Resume the thread; if the local session is unavailable, start a replacement thread from the durable assignment and the current workspace.
- Quiet periods starve heartbeats. Wrap the task in a **lease** that re-sends the last payload on an interval well under `heartbeatTimeout` (`withHeartbeatLease`, `src/temporal/activities.ts`).
- A heartbeat is a resumability hint, not proof of completion. The Service can hold an older checkpoint than the last one emitted locally.

Reference values: `startToCloseTimeout 10 minutes`, `heartbeatTimeout 20 seconds`, lease 5 s, Worker heartbeat throttle 500 ms, retry `1 s → 10 s`, `maximumAttempts 5`. Count exhausted retries in the Workflow by catching `ActivityFailure` with `retryState === MAXIMUM_ATTEMPTS_REACHED`, so completed turns and retried turns are separate numbers on screen.

## 4. Keep the control plane outside the failure zone

The API/supervisor and the Temporal Service survive; the Worker fleet and everything it spawns (model CLI subprocesses, test runners) share one detached process group. Kill by validated PID/PGID plus an owner token (`src/supervisor/process-targets.ts`), never by name. Give each run its own Workflow ID, Task Queue (`durable-agent-tree-<runId>`), workspace, and Worker. Set `maxCachedWorkflows: 0` when every Workflow Task should be a visible full replay.

## 5. Project live progress separately from durable completion

Three read paths, three guarantees:

- **Query** (`snapshot`) needs Worker compute. While the fleet is offline, serve the last successful result and label it frozen.
- **Pending Activity heartbeat details** from `describe` on the parent and each child overlay live progress onto the snapshot. Stop overlaying once the snapshot is terminal, or a stale heartbeat flips a settled node back to running (`projectPendingActivity`, `src/supervisor/fleet-supervisor.ts`).
- **Event History** from `fetchHistory` projects execution spans and stays available while Workers are absent (`src/temporal/timeline.ts`).

## 6. State the honest boundary

Write these into docs and UI:

- Durability is not exactly-once. An effect that finished before its completion reached the Service can repeat on the next attempt. Application code owns idempotency and reconciliation.
- Worker loss is not cancellation or termination. Killing compute pauses the run; terminating the Workflow ends it.
- Local sessions and disk are machine-local. Machine loss is the production follow-on: shared durable storage for artifacts.

## 7. Prove it with kills

Kill during every phase and assert: a completed Child Workflow is reused without re-running its Activity; an interrupted model Activity resumes the heartbeated thread ID; each test file executes exactly once across Worker replacement; retry metrics are exact when attempts are exhausted; the process-owned baseline restarts at zero. Reference proofs: `tests/temporal-recovery.integration.test.ts` (real ephemeral Temporal server) and `e2e/presentation.spec.ts` (browser two-act).

## Five sentences

1. A Worker executes a Workflow; the Worker doesn't own the Workflow's identity.
2. Event History records durable facts, and replay rebuilds Workflow state from those facts.
3. Child Workflows give delegated branches durable identities and separate histories.
4. Activities contain external effects, while heartbeats checkpoint in-flight progress for later attempts.
5. Temporal owns orchestration recovery; the application owns idempotency, artifacts, model correctness, and safe external effects.

## Vocabulary

Name Temporal concepts precisely: Workflow Definition versus Workflow Execution, Activity Task Execution versus Activity Execution, Worker Process versus Worker Entity. The `temporal-vocabulary` skill normalizes terms and routes to references; the reference repo's `ontology/` folder holds the taxonomy and OWL model.
