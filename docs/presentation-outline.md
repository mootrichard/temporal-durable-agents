# Presentation outline: From process-owned agents to durable execution

This content-first outline focuses on the facts and story behind the two
implementations. Slide count, layout, and delivery choices stay open.

## Story

The baseline keeps the agent run's continuation in one Node.js process. The
Temporal path records durable execution facts in Event History, so a replacement
Worker can reconstruct the continuation and finish the same run.

The presentation answers one question:

> After the runtime process disappears, where are the plan, completed branches,
> and next step stored?

## The shared job

Both implementations perform one bounded coding task:

```text
plan
  -> source investigation
  -> test investigation
  -> initial tests
  -> implementation
  -> final tests
  -> diff
```

The two read-only investigations and the initial tests run concurrently. The
coordinator waits for their evidence, resumes its Codex thread, applies the fix,
runs final tests, and returns the Git diff.

The workload and tools stay consistent. The implementations differ in control
flow, state ownership, and recovery.

## Path one: process-owned orchestration

### What we built

- `BaselineOrchestrator` contains the complete sequence in TypeScript.
- The API supervisor creates an isolated Git workspace and starts the
  orchestrator in a detached process group.
- Codex and test subprocesses inherit that process group.
- The orchestrator streams `RunSnapshot` updates to the API through standard
  output. The API caches the most recent snapshot for the browser.

### How it runs

1. Run a read-only planner Codex turn.
2. Validate the two-item delegation plan.
3. Start the source investigation, test-contract investigation, and initial
   tests as concurrent JavaScript promises.
4. Wait for all three results.
5. Resume the coordinator in workspace-write mode and change the code.
6. Run final tests and collect the Git diff.

### Where the state lives

| State | Owner |
| --- | --- |
| Plan, active branches, results, current phase, and next step | Node.js process memory |
| Conversation context | Local Codex sessions |
| Source changes | Isolated Git workspace |
| Last visible state | API snapshot cache |

### What failure means

The supervisor sends `SIGKILL` to the recorded process group. The orchestrator,
Codex subprocesses, and test subprocesses stop together. The API can display its
cached snapshot, but the snapshot cannot schedule the next step.

**Restart workers** creates a fresh workspace and snapshot, then starts a fresh
orchestration run. The process that executes the tree also owns the tree.

## Path two: history-owned orchestration

### What we built

- `FixWorkflow` owns the end-to-end sequence.
- Two `SubagentWorkflow` executions give the investigations stable identities.
- Codex calls, tests, Git access, and filesystem access run as Activities.
- Activity heartbeats carry resumable progress.
- A Workflow Query returns Workflow state while Worker compute is available.
- The API projects pending Activity heartbeats into the live UI.
- The Temporal Service runs outside the killable Worker process group.

### How it runs

1. Schedule the planner as a Codex Activity.
2. Start two Child Workflows and the initial test Activity concurrently.
3. Let each Child Workflow schedule one read-only Codex Activity.
4. Receive both investigation results and the initial test result.
5. Schedule the implementation Activity with the planner thread ID and gathered
   evidence.
6. Schedule the final test Activity.
7. Collect the Git diff and return the final snapshot.

### Why each Temporal primitive exists

| Primitive | Responsibility | Reason |
| --- | --- | --- |
| Parent Workflow | Own the durable sequence | Reconstruct the run after Worker replacement. |
| Child Workflow | Own one delegated branch | Give each investigation a stable ID and separate history. |
| Activity | Execute external and nondeterministic work | Apply timeouts, retries, and cancellation outside Workflow code. |
| Heartbeat | Report liveness and application progress | Give a later Activity attempt a checkpoint. |
| Event History | Record decisions and completed results | Supply durable facts during replay. |
| Worker | Execute Workflow Tasks and Activity Tasks | Make compute replaceable. |

## Kill and recover

The supervisor sends the same `SIGKILL` to the Temporal Worker process group.
The Worker, Codex subprocesses, and test subprocesses stop. The Temporal Service,
Workflow Execution, API supervisor, and Git workspace remain available.

The surviving state includes:

- the Workflow ID and Event History;
- the validated plan and recorded completions;
- completed Child Workflow results;
- the most recently delivered Activity heartbeat details;
- the existing Git workspace;
- the API's frozen view of the last visible state.

Recovery proceeds as follows:

1. Start a replacement Worker on the same Task Queue.
2. Replay `FixWorkflow` against Event History.
3. Reuse recorded Activity and Child Workflow results.
4. Schedule another attempt for interrupted Activities after failure detection
   and the configured retry delay.
5. Resume a Codex thread from its heartbeated thread ID. If the local session is
   unavailable, start a replacement thread from the durable assignment and
   existing workspace.
6. Skip test files recorded in the test Activity heartbeat.
7. Continue under the same Workflow ID and produce the verified diff.

Replay reconstructs control-flow state from recorded facts. Activity retries
resume application work from application-defined checkpoints.

## What Temporal changes and why

| Concern | Baseline | Temporal | Why it matters |
| --- | --- | --- | --- |
| Run identity | Process-local run | Workflow ID | The logical run survives Worker replacement. |
| Continuation | JavaScript memory | State reconstructed from Event History | A replacement Worker can determine the next step. |
| Delegated branch | Promise and thread mapping | Child Workflow | Each branch has durable identity and completion. |
| Completed operation | Value held by the process | Result recorded by Temporal | Replay reuses recorded work. |
| Interrupted operation | Process death ends the run | Activity timeout and retry | Recovery targets unfinished work. |
| In-flight progress | Local callback state | Activity heartbeat details | A later attempt can use an application checkpoint. |
| Restart | Fresh workspace and snapshot | New Worker, same Workflow Execution | Compute replacement preserves execution identity. |
| Visibility | Standard-output snapshot | Workflow Query and heartbeat projection | The UI separates durable state from live attempt progress. |

The essential change is state ownership. Temporal gives the run a durable
identity, records completed orchestration facts, and schedules unfinished work.

## The guarantee boundary

- Temporal owns orchestration recovery. The application owns model correctness,
  business correctness, idempotency, deduplication, and reconciliation.
- Event History records orchestration facts. Git or artifact storage holds files.
- A heartbeat is a liveness signal and checkpoint. Activity completion is a
  separate event.
- An Activity retry can repeat an external effect when the effect finishes before
  Temporal records the completion.
- Worker loss removes compute. Workflow cancellation or termination ends the
  logical execution.
- This demonstration proves Worker-process recovery on one machine. Shared
  durable storage is required for machine or disk recovery.

## Close

Leave the audience with three ideas:

1. Agent work is an execution tree with state between model calls.
2. Process-owned orchestration gives the tree one process lifetime.
3. Temporal gives the tree a durable identity and makes Workers replaceable.

Closing line:

> Same job, same tools, different owner of the continuation. The baseline loses
> the run with the process. Temporal preserves the run's history and gives the
> unfinished work to replacement compute.

## Evidence worth showing

- Baseline: concurrent branches, process-group kill, and empty restart state.
- Temporal before failure: Workflow ID, Child Workflow IDs, thread receipts, and
  Activity attempts.
- Temporal during failure: frozen snapshot with Workers offline.
- Temporal after recovery: same Workflow ID, reused result or restored test
  checkpoint, final tests, and Git diff.

## Source map

- Baseline control flow: `src/baseline/orchestrator.ts`
- Process and Worker lifecycle: `src/supervisor/fleet-supervisor.ts`
- Parent and Child Workflows: `src/temporal/workflows.ts`
- Heartbeating Activities: `src/temporal/activities.ts`
- Snapshot and trace state: `src/shared/run-snapshot.ts`
- Browser proof: `e2e/presentation.spec.ts`
- Worker-replacement proof: `tests/temporal-recovery.integration.test.ts`
