# Approved implementation spec

## Objective

Build a reusable, one-screen demonstration that shows why an agent execution tree should outlive its operating-system process tree.

## Scenario

A main Codex agent plans a small TypeScript fix and delegates exactly two bounded, read-only investigations. In the baseline, in-memory promises and subprocesses own orchestration, so killing the process group destroys the run. In the Temporal version, a Workflow coordinates Child Workflows and heartbeating Activities, so killing every Worker pauses execution and replacement Workers complete the same tree.

## Required implementation

- Frozen TypeScript fixture with one understandable bug, several tests, and an isolated workspace per run.
- Baseline using the Codex SDK: structured delegation plan, two concurrent read-only threads, local test subprocess, in-memory thread mapping, and fresh state after restart.
- Temporal `FixWorkflow` with `SubagentWorkflow` children, Codex thread-ID heartbeats, thread resumption/replacement, main-thread write turn, file-by-file test heartbeats, and final Git diff.
- API and process supervisor outside the killable fleet. Kill only validated, recorded Worker process groups and inherited subprocesses.
- One-screen two-act UI showing the execution tree, fleet state, frozen
  snapshot, completed and retried turns, tests, diff, run controls, agent
  consoles, and a Temporal Event History timeline.
- Live and deterministic fixture Codex runners behind one interface.
- README migration explanation, architecture/state-ownership diagram, 10 to 15-minute talk track, and exact demo script.

## Acceptance

- Unit coverage for plan parsing, snapshots, fixture and live-runner event
  translation, heartbeat restoration, process-target validation, run-control
  state, and Event History timeline projection.
- Integration proof of concurrent Child Workflows, completed-child reuse,
  interrupted Codex retry and resumption, and test-file checkpoint recovery.
- Browser proof that baseline restart loses progress while Temporal Worker
  replacement retains or retries the right work and produces one passing diff.
  The browser proof also covers agent-console history and the Workflow timeline.
- Explicit documentation of at-least-once Activity behavior, cancellation/termination boundaries, and local machine/disk limitations.
- One authenticated live Codex run and one full deterministic kill/restart run.
