# 10–15 minute talk track and exact live-demo script

Target length: 12 minutes. Keep the browser on the one-screen canvas. Keep Temporal’s UI available in a second tab as optional evidence, not as the main visual.

## 0:00–1:15 — Thesis

> “An AI agent looks like a conversation, but useful agent work is an execution tree: planning, delegation, tools, tests, and a final change. Today that tree usually borrows the lifetime of one operating-system process. I want to show the smallest version of why that is a problem.”

Point to the four nodes. Explain that the task is intentionally plain: fix one retry-loop boundary in a frozen TypeScript repository. The simplicity isolates the orchestration behavior.

> “The application is identical in both acts. The ownership of progress changes.”

## 1:15–3:30 — Act I: process tree

Select **Act I · Process tree** and **Fixture**.

> “The coordinator asks Codex for a structured plan with exactly two read-only investigations. Source, tests, and a local test subprocess run concurrently. The main Codex thread then resumes to write one fix.”

Click **Start run**. Wait until the two investigations are running or complete.

> “Right now the promises, thread mapping, and test checkpoint live in JavaScript memory. Git owns any bytes already written, but nothing durable owns what should happen next.”

Click **Kill all workers**.

> “This targets the exact detached process group: coordinator, Codex subprocesses, and test subprocesses. The API survives so we can see the last receipt. The process tree died, and its execution tree died with it.”

Click **Restart workers**. Point to the zeroed counters.

> “Restart means a fresh orchestration run and a reset fixture. The new process has no basis for distinguishing completed work from unfinished work.”

## 3:30–5:15 — Migration, not magic

Select **Act II · Execution tree**.

> “I moved only orchestration state into a Workflow. The two investigations are Child Workflows with durable identities. Codex calls, tests, Git, and filesystem access stay in Activities because those are external, nondeterministic effects.”

Point to the ownership ledger.

> “Temporal owns the plan and completion history. Codex session storage owns conversation continuity. Git owns code state. Activity heartbeats own resumable checkpoints. Each system has one clear responsibility.”

## 5:15–8:15 — Act II: kill and recover

Click **Start run**. Wait for **investigating**, ideally after one Codex turn is recorded.

Click **Kill all workers**.

> “Every Worker and its subprocesses are gone. This frozen view is the API’s last successful Workflow query. Temporal is still holding the execution history.”

Pause for two seconds so the absence of compute is visible.

Click **Restart workers**.

> “The replacement Worker replays history. Completed Child Workflows supply recorded results. An interrupted Codex Activity reads the heartbeated thread ID and resumes it. If that machine-local session vanished, it can create a replacement from the durable assignment and current worktree. Tests read their heartbeated filenames and skip passed files.”

Wait for **complete**. Point in this order:

1. completed nodes;
2. retried-turn counter;
3. test checkpoint at 4/4;
4. one-line final diff.

> “Same execution tree, different Worker fleet. The Worker executes the work; it does not own the work.”

## 8:15–10:15 — Honest boundary

> “Durability does not create exactly-once side effects. If an Activity finished a model call and died before Temporal recorded completion, the Activity may retry and make another call. That is why the screen distinguishes completed turns from retried turns.”

> “Heartbeats preserve resumable progress. They do not prove completion. Application code still owns idempotency, reconciliation, and safe external effects.”

> “Worker failure is also different from Workflow cancellation or termination. Killing compute pauses this run. Explicitly terminating the Workflow ends it.”

Mention the local boundary: Codex sessions and worktrees are on this machine; shared durable storage is the production follow-on for machine loss.

## 10:15–12:00 — Developer-advocacy close

> “The artifact is deliberately reusable: deterministic fixture mode for a stage, live Codex mode for credibility, one canvas for the story, and an isolated repository for safety.”

> “The broader opportunity is bigger than retrying an agent. Durable execution gives AI developers a vocabulary for delegation, human approval, observability, recovery, and versioned long-running work. A principal developer advocate can turn that vocabulary into examples other advocates reuse, talks other speakers can deliver, and feedback that helps product and engineering choose the next abstraction.”

Close on the final diff.

> “The orchestration process was disposable. The intent, progress, and evidence were not.”

## Live-mode checklist

Run before presenting:

```bash
npm run temporal:up
npm run preflight
npm test
npm run build
```

Then rehearse once in **Fixture**, refresh the page, select **Live Codex**, and repeat. Live turn timing varies; kill during an investigation after its thread receipt appears. If provider access is slow, switch to Fixture and state that it replays the same SDK event contract and known patch.

## Recovery cues

- If **Start run** reports a Temporal connection error, start the development server and rerun preflight.
- If live mode reports a Codex authentication error, run `codex login` and confirm `codex login status`.
- If the timing window passes and the run completes before the kill, start a fresh run; fixture delay can be raised with `FIXTURE_DELAY_MS`.
- Keep machine-loss claims out of the demo. The demonstrated boundary is Worker-process loss on one machine.
