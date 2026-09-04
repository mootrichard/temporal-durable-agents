---
name: durable-agent-demo
description: Run, change, and verify the temporal-durable-agents demo (process-owned vs Temporal-owned agent orchestration). Use when starting the demo locally, editing src/ or tests/, reproducing a kill-and-recover run, or proving a change with the typecheck, vitest, and Playwright loop.
---

# Durable agent demo: run and verify

Repo: [mootrichard/temporal-durable-agents](https://github.com/mootrichard/temporal-durable-agents). Node 24, TypeScript ES2024 with `.js` import extensions (NodeNext), Express 5, Temporal TypeScript SDK 1.22, Codex SDK 0.147.

## Run

`README.md` "Run the demo" has the exact click sequence. What it does not say:

- Temporal mode refuses to start unless `TEMPORAL_ADDRESS` (default `localhost:7233`) answers a TCP probe. `npm run temporal:up` starts a dev server with no persistence volume; `npm run temporal:down` discards its history.
- Ports: API 8787 (`PORT`), Vite dev 5173 (proxies `/api`), Temporal gRPC 7233 / UI 8233.
- `npm start` still spawns Worker and baseline processes as `node --import tsx src/...`. Run from the repo root; `tsx` must be installed.
- Fixture mode needs no Codex CLI. Live mode needs `codex login`; `npm run preflight` checks both.
- Kill timing: raise `FIXTURE_DELAY_MS` (default 1500) to lengthen model stages, `TEST_FILE_DELAY_MS` (default 0) to lengthen file-by-file verification, before starting the API.
- Each run gets `.demo-runs/<runId>/workspace` (gitignored, git-initialized copy of `fixture/`) and, in Temporal mode, its own Task Queue `durable-agent-tree-<runId>` and Worker. The supervisor registry is in-memory: restarting the API orphans runs and the UI silently drops stale run IDs.
- A finished Temporal run's Worker is stopped lazily on the next snapshot poll.

## Verify a change

Run all three before yielding; CI deploys only the explainer and runs none of these.

```bash
npm run check                                   # tsc: server + ui projects
npx vitest run 2>&1 | grep -v -E '^\s*(sdkComponent|taskQueue|state|\}|[0-9T:.Z-]+ \[INFO\])' | tail -30
npx playwright test --config playwright.config.ts 2>&1 | grep -v -E '\[WebServer\]' | tail -10
```

- `npm test` includes `tests/temporal-recovery.integration.test.ts`, which boots `TestWorkflowEnvironment.createLocal()` (downloads the Temporal CLI once, then ~25 s). Worker logs are noisy; the filter above is how to read the result.
- Playwright builds, then starts `scripts/e2e-server.ts` (ephemeral Temporal + API on `E2E_PORT`, default 8787). No Docker. ~50 s. It rewrites `output/playwright/*.png`; `git checkout -- output` before committing unless the screenshots changed on purpose.
- Fixture tests run the root `node_modules/vitest` against the run workspace; `fixture/` has no `node_modules` of its own.

## Where the wiring lives

Change names here first; every narrative surface hand-copies them (see the `narrative-sync` skill).

- `src/temporal/contracts.ts`: `temporalTaskQueue`, `childWorkflowId` (`<runId>-<investigator>`), `investigators`, `Activities`, `CodexHeartbeat`.
- `src/shared/delegation-plan.ts`: zod plan (exactly two assignments), `investigatorFor`, `assignmentFor`, `delegationPlanJsonSchema`.
- `src/shared/run-snapshot.ts`: `RunSnapshot`, `RunEvent`, `applyRunEvent` (pure reducer), `nodeLabels`, `isRunFinished`, `traceEvent`.
- `src/supervisor/fleet-supervisor.ts`: one `spawnFleet` for both modes; `projectPendingActivity` is a pure export, so unit-test heartbeat projection there, not through the class.
- Baseline process → supervisor IPC is stdout lines prefixed `snapshotLinePrefix` (`src/baseline/orchestrator.ts`).
- Heartbeat payloads: decode with `fromPayloadsAtIndex(defaultPayloadConverter, 0, pending.heartbeatDetails?.payloads)`; encode in tests with `defaultPayloadConverter.toPayload(...)`.

## Invariants the tests defend

- Retry: 5 attempts, 20 s heartbeat timeout, 10 min start-to-close, 5 s heartbeat lease, 500 ms Worker throttle.
- Run IDs are `${mode}-${8 hex}`; the parent Workflow ID is the run ID.
- The fixture bug is `attempt <= maxAttempts` → `attempt < maxAttempts` in a `for` loop in `fixture/src/retry.ts`; the fixture runner applies it idempotently.
- `FixWorkflow` returns the final `RunSnapshot` (which carries the diff), not the diff. A domain failure returns a `failed` snapshot and the Workflow closes Completed.
- The test job runs one Vitest subprocess per file (four files), so the checkpoint is per file.
