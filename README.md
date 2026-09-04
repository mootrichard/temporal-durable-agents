# The Orchestrator Died. The Work Continued

**Kill every Worker. Restart compute. The same agent run finishes.**

This project compares process-owned and Temporal-owned orchestration for the
same multi-agent code repair.

Both paths plan the repair, delegate two investigations, run tests, change one
line, and verify the result.

[![Seven scenes show failure and recovery.][video-poster]][short-video]

**[Watch the 30-second overview][short-video]**

The video shows the execution tree, the failed Worker fleet, Workflow replay,
and the verified repair.

## See the difference

### Process-owned

The baseline keeps its plan, thread map, and next step in process memory. After
a process-group kill, the run resets.

![The baseline loses its run after a Worker kill.][baseline-screen]

### History-owned

Temporal records the orchestration in Event History. A replacement Worker
replays completed work and resumes the unfinished steps.

![The Temporal run completes after the Worker fleet restarts.][recovery-screen]

## Explore the project

- **[Interactive walkthrough][walkthrough]:** trace Worker loss and recovery.
- **[Live demo](#run-the-demo):** compare process-owned and Temporal-owned runs.
- **[Agent consoles][console-screen]:** watch four jobs at the live edge.
- **[Workflow timeline][timeline-screen]:** inspect attempts and replay.
- **[Code-trace slideshow](slideshow/README.md):** present the implementation.

![Four agent consoles show live work.][console-screen]

## Run the demo

You need Node.js 24+, npm, and Docker.

Install the dependencies and start the local services:

```bash
npm install
npm run temporal:up
npm run build
npm start
```

Open [the demo at `http://localhost:8787`](http://localhost:8787).

1. Keep **Fixture** selected for a deterministic run.
2. Select **Baseline**. Click **Start run**.
3. During the run, click **Kill workers**. Then click **Stop workers**.
4. Click **Restart workers** to start the baseline with zero progress.
5. Select **Temporal**. Click **Start run**.
6. During the run, click **Kill workers**. Then click **Stop workers**.
7. Click **Restart workers**. The same Workflow resumes and finishes the repair.

Refresh the page at any point to restore the selected mode and its current run
from the surviving API supervisor.

If you use **Live Codex**, install the `codex` CLI. Then sign in:

```bash
codex login
```

Run the preflight check:

```bash
npm run preflight
```

## Understand the boundary

Temporal records orchestration state and completed Activity results. It does
not make every external effect exactly once.

An Activity retry can repeat work when its earlier completion did not reach
Event History.

## Learn more

- [How the durable agent tree works](docs/how-it-works.md)
- [Architecture and state ownership](docs/architecture.md)
- [Talk track and demo script](docs/talk-track.md)
- [Verification receipts](docs/verification.md)
- [Temporal concept map](ontology/README.md)

[baseline-screen]: output/playwright/baseline-killed.png
[console-screen]: output/playwright/agent-consoles-live.png
[recovery-screen]: output/playwright/temporal-recovered.png
[short-video]: videos/temporal-durable-agents/renders/temporal-durable-agents-30s.mp4
[timeline-screen]: output/playwright/workflow-timeline-frozen.png
[video-poster]: videos/temporal-durable-agents/renders/video-contact-sheet.jpg
[walkthrough]: https://mootrichard.github.io/temporal-durable-agents/
