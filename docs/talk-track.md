# 10–15 minute talk track and exact live-demo script

Target length: 12 minutes. Keep the browser on the one-screen canvas. Keep Temporal’s UI available in a second tab as optional evidence, not as the main visual.

## 0:00–1:15 — Thesis

> “An AI agent looks like a conversation, but useful agent work is an execution tree: planning, delegation, tools, tests, and a final change. Today that tree usually borrows the lifetime of one operating-system process. I want to show the smallest version of why that is a problem.”

Point to the four nodes. Explain that the task is intentionally plain: fix one retry-loop boundary in a frozen TypeScript repository. The simplicity isolates the orchestration behavior.

> “The bounded repair and tools are the same in both acts. The ownership of progress changes.”

## 1:15–3:30 — Act I: process tree

Select **Baseline** and **Fixture**.

> “The coordinator asks Codex for a structured plan with exactly two read-only investigations. The source investigator, test investigator, and local test subprocess run concurrently. The main Codex thread then resumes to write one fix.”

Click **Start run**. Wait until the two investigations are running or complete.

> “In the baseline, the promises, thread mapping, and test checkpoint live in JavaScript memory. Git owns any bytes already written, but nothing durable owns the next step.”

Click **Kill workers**. In the **Stop every worker?** dialog, click
**Stop workers**.

> “This targets the exact detached process group: coordinator, Codex subprocesses, and test subprocesses. The API survives so we can see the last receipt. The process tree died, and its execution tree died with it.”

Click **Restart workers**. In **Run evidence**, point to zero Codex turns and
zero retries.

> “Restart reuses the supervisor’s run label, but it starts a fresh orchestration process with a reset fixture and zero progress. The label is not a durable continuation.”

## 3:30–5:15 — Migration, not magic

Select **Temporal**.

> “I moved only orchestration state into a Workflow. The two investigations are Child Workflows with durable identities. Codex calls, tests, Git, and filesystem access stay in Activities because those are external, nondeterministic effects.”

Point to **Agent consoles** and **Workflow timeline** after the run starts in
Act II. Explain that the consoles reorganize the live trace by logical job,
while the timeline derives execution spans from Temporal Event History.

> “The Temporal Service records the plan and completed results in Event History. Codex session storage holds conversation context. Git holds code state. The Temporal Service stores Activity heartbeat details as resumable checkpoints.”

## 5:15–8:15 — Act II: kill and recover

Click **Start run**. Wait for **Investigating** and for at least one thread
receipt to appear.

Select **Source investigator** and point to its thread ID and Activity Task
Execution attempt number.
Select **Test runner** and point to the **Test checkpoint** card.

Click **Kill workers** before the run completes. In the **Stop every worker?**
dialog, click **Stop workers**.

> “The Worker and its subprocesses are gone. This frozen view is the API’s last successful Workflow Query plus the last Activity heartbeat it read. The Temporal Service still stores the Event History.”

Click **Agent consoles**. Point to **Fleet offline** and the retained events,
then close the dialog. Click **Workflow timeline**. Point to **Compute offline**
and the recorded parent, Child Workflow, and Activity spans, then close the
dialog.

> “The snapshot is frozen because a Workflow Query needs Worker compute. The timeline remains available because the API reads Event History directly from the Temporal Service.”

Click **Restart workers**.

> “The replacement Worker replays Workflow code from Event History. Completed Child Workflows supply recorded results. During a retried Codex Activity Execution, the Activity code reads the heartbeated thread ID and resumes the thread. If that machine-local session vanished, the Activity code creates a replacement from the durable assignment and current Git workspace. During a retried test Activity Execution, the Activity code reads heartbeated filenames and skips passed files.”

Click **Agent consoles** while the replacement Worker runs. Show that each pane
replays the trace events already present in the run snapshot and then follows
new events. Close the dialog.

Wait for **Run complete**. Point in this order:

1. completed nodes;
2. **Codex turns** and **Retries** in **Completion receipt**;
3. the **Test checkpoint** value at 4/4;
4. the one-line final diff in **Completion receipt**.

> “Same execution tree, different Worker fleet. The Worker executes the work; it does not own the work.”

The supervisor stops the run-specific Worker after it observes the terminal
Workflow result. Point to **Start new run**.

> “The Workflow result remains in Event History after compute exits. The next run gets a separate Workflow ID, workspace, Task Queue, and Worker.”

## 8:15–10:15 — Honest boundary

> “Durability does not create exactly-once side effects. If an Activity finished a model call and died before Temporal recorded completion, the Activity may retry and make another call. That is why the screen distinguishes completed turns from retried turns.”

> “Heartbeats preserve resumable progress. They do not prove completion. Application code still owns idempotency, reconciliation, and safe external effects.”

> “Worker failure is also different from Workflow cancellation or termination. Killing compute pauses this run. Explicitly terminating the Workflow ends it.”

Mention the local boundary: Codex sessions and Git workspaces are on this machine; shared durable storage is the production follow-on for machine loss.

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
- If the timing window passes and the run completes before the kill, start a
  fresh run. Increase `FIXTURE_DELAY_MS` for longer model stages or
  `TEST_FILE_DELAY_MS` for a longer file-by-file verification stage before
  starting the API.
- Keep machine-loss claims out of the demo. The demonstrated boundary is Worker-process loss on one machine.
