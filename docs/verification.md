# Verification receipts

The authenticated live and manual run receipts were recorded on 2026-08-17 in
the local macOS presentation environment. The automated evidence was
revalidated on 2026-09-03.

## Authenticated live Codex path

Preflight:

```text
✓ Codex authentication: Logged in using ChatGPT
✓ Temporal server: localhost:7233 reachable
✓ Codex runner: inherits configured model
```

Temporal Workflow `temporal-91e3df8b` completed with:

- coordinator thread `01a0125a-2597-7d70-a569-661f2eff90cf` resumed for implementation;
- source child thread `01a0125a-e523-7e23-8892-4007707dc5da`;
- test-contract child thread `01a0125a-e59d-7171-a554-ab89a00160fa`;
- four completed Codex turns and zero retries;
- four of four test files passed;
- one Git diff changing `attempt <= maxAttempts` to `attempt < maxAttempts`.

The live run used the existing local ChatGPT authentication. Thread IDs identify local demo sessions; they are included as execution receipts and carry no credentials.

## Manual deterministic supervisor sequence

Browser/API Workflow `temporal-5fb89981` was killed during investigation and restarted with the same Workflow ID:

```text
phase: complete
completed Codex turns: 4
retried Codex turns: 2
test checkpoint: 4 / 4
diff: one line
```

The baseline sequence killed `baseline-1ad9804a` and its process group. Its restart response returned `phase: idle`, `sequence: 0`, zero completed turns, and zero completed tests. This manual run established the Codex-Activity retry presentation path.

## Automated deterministic supervisor sequence

The Playwright run generates fresh random run IDs. It kills Act I during
investigation and verifies a zeroed restart response. It then kills Act II
during final verification with a visible partial test checkpoint. While the
Worker is offline, it verifies page-refresh restoration, retained agent-console
events, and Workflow-timeline spans from parent, child, and Activity Event
Histories. Replacement Workers finish at `4 / 4` with four completed Codex
turns and the one-line diff. The interrupted operation in this variant is the
test Activity Execution; the integration suite separately covers interrupted
Codex resumption and exact file-checkpoint reuse.

Visual receipts:

- [Baseline after process-group kill](../output/playwright/baseline-killed.png)
- [Agent consoles following live work](../output/playwright/agent-consoles-live.png)
- [Workflow timeline while compute is offline](../output/playwright/workflow-timeline-frozen.png)
- [Temporal after Worker replacement](../output/playwright/temporal-recovered.png)

## Automated evidence

Checks refreshed on 2026-09-03:

```text
npm test
Test Files  12 passed
Tests       35 passed

npm run test:e2e
2 passed

npm run check
passed

npm run build
passed

npm audit --audit-level=high
2 vulnerabilities (1 moderate, 1 high); exited with status 1
```

The dependency audit reported a high-severity `fast-uri` advisory and a
moderate-severity `qs` advisory. Both are transitive dependencies, and npm
reports that fixes are available through `npm audit fix`.

The Temporal integration tests start a real ephemeral server. They prove:

- completed Child Workflow reuse while an interrupted Codex Activity retries;
- production `runCodexTurn` restoration of the heartbeated thread ID;
- file-level heartbeat restoration, with every test filename executed exactly
  once across Worker replacement;
- accurate retry metrics when a Codex Activity Execution exhausts all five
  Activity Task Execution attempts.

The fixture tests also prove that replaying an implementation Activity
Execution accepts the exact fixed workspace state. The supervisor tests prove
that a completed baseline process reports its fleet offline.

The Playwright tests start their own Temporal server and production API. They
drive the presentation controls, invoke the real supervisor kill and restart
endpoints, verify baseline reset, inspect the frozen agent consoles and
Workflow timeline, and wait for the recovered Temporal diff. They also verify
page-refresh restoration and automatic Worker shutdown after a terminal
Temporal result.

The Docker presentation path and authenticated Live Codex path were not
re-executed during the 2026-09-03 validation. The automated suites exercised
the same production API, supervisor, Worker, Workflow, Activity, and UI code
against ephemeral Temporal development servers.
