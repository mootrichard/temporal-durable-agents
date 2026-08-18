# Verification receipts

Recorded on 2026-08-17 in the local macOS presentation environment.

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

The Playwright run generates fresh random run IDs. It kills Act I during investigation, verifies a zeroed restart response, then kills Act II after Temporal reports a durable `3 / 4` test checkpoint. Replacement Workers finish at `4 / 4` with four completed Codex turns, zero Codex retries, and the one-line diff. The interrupted operation in this variant is the test Activity; the separate integration suite covers interrupted Codex resumption.

Visual receipts:

- [Baseline after process-group kill](../output/playwright/baseline-killed.png)
- [Temporal after Worker replacement](../output/playwright/temporal-recovered.png)

## Automated evidence

```text
npm test
Test Files  8 passed
Tests       18 passed

npm run test:e2e
1 passed

npm run check
passed

npm run build
passed

npm audit --audit-level=high
found 0 vulnerabilities
```

The Temporal integration tests start a real ephemeral server. They prove:

- completed Child Workflow reuse while an interrupted Codex Activity retries;
- production `runCodexTurn` restoration of the heartbeated thread ID;
- file-level heartbeat restoration, with every test filename executed exactly once across Worker replacement.

The Playwright test starts its own Temporal server and production API, drives the presentation controls, invokes the real supervisor kill/restart endpoints, verifies baseline reset, and waits for the recovered Temporal diff.

The Docker presentation path was not executed during this receipt because the local Docker daemon was stopped. The same Worker/API path was exercised against Temporal CLI development servers launched by the SDK test harness.
