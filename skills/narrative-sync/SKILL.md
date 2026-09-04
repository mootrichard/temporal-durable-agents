---
name: narrative-sync
description: Audit and realign the narrative surfaces of temporal-durable-agents (docs/, explainer/ MDX, slideshow/ deck, videos/ HyperFrames composition, ontology/) after a change to src/. Use after refactors that rename symbols, change counts, or alter the UI, when a video frame embeds a stale screenshot, or when asked whether docs, slides, or video still match the code.
---

# Narrative sync

Source of truth is `src/`, `tests/`, `scripts/`. Every surface below hand-copies symbol names, counts, code excerpts, or UI captures, and nothing enforces the copy. Stale text is a defect; find every instance.

## 1. Audit

Fan out one read-only scout per surface with the exact list of renamed or removed symbols and changed counts. Ask each for `path:line — stale text — correction (grounded in src file:line)`, tagged HARD (wrong) or SOFT (imprecise), plus a "verified OK" list, and flag claims that were already wrong before the change.

Surfaces and their traps:

- **docs/**: `verification.md` records test counts (`Tests N passed`) and dates; recount with `npx vitest run`. `how-it-works.md` has a UI-element table and a source map; verify each row against `src/ui/App.tsx` and the file tree. `architecture.md` has the state ledger; every owner must still exist.
- **explainer/app/*/content.mdx**: Code Hike fences labelled `ts ! src/...`, `!before`, `!after`. `// !focus(a:b)` ranges are relative to the annotation comment (line 1 is the line after it); a leading non-annotation comment shifts nothing. `components/code.tsx` builds GitHub links from `NEXT_PUBLIC_SOURCE_REF` (default `main`): set it when demoing an unmerged branch.
- **slideshow/**: speaker-notes JSON is duplicated verbatim in `slideshow/index.html` and `slideshow/composition/index.html`; edit both. Code slides are hand-typed `<pre>` with `<span class="kw|fn|str|focus">`. The README slide count must match the `NN / 20` counters.
- **videos/temporal-durable-agents/**: `compositions/frames/0N-*.html` embed `assets/image_00N.png` UI captures and a Workflow ID badge. `STORYBOARD.md` cites README and talk-track line ranges that drift. `capture/` is a temporal.io brand capture, not an app capture.
- **ontology/**: dangling file links and demo terms that leaked into the platform vocabulary.

Done when every HARD finding has an edit and every SOFT finding has an edit or a written reason to keep it.

## 2. Recapture UI screenshots for the video

Only when a frame embeds a stale capture or an invented Workflow ID.

```bash
PORT=8791 FIXTURE_DELAY_MS=4000 TEST_FILE_DELAY_MS=1500 npm run e2e:server   # ephemeral Temporal + API
```

Write a Playwright script inside the repo root so `@playwright/test` resolves, viewport 1440×1000 to match existing captures:

1. Click `mode-temporal`, wait for `runtime-status` to contain "ready", click `fleet-action`, read `runId` from the `POST /api/runs` response.
2. Consoles: wait for `run-phase` = `investigating`, open **Agent consoles**, wait for the source-investigator transcript (`/started/`) and test-job transcript (`/Reproducing|reproduced/`), screenshot.
3. Frozen timeline: wait for `run-phase` = `testing` and `test-progress` matching `^[23] /`, click `fleet-action` then `confirm-fleet-stop`, wait for `frozen-snapshot`, open **Workflow timeline**, wait for `.timeline-bar` nth(6), screenshot (shows COMPUTE OFFLINE).
4. `POST /api/runs/<runId>/restart` so the run finishes. Delete the script and `.demo-runs/<runId>`.

Then: copy captures to `assets/image_00N.png` and update `src=` in `compositions/frames/*.html`; use the real `temporal-xxxxxxxx` run ID consistently in frames 01, 04, and 06; frame 02 tree order is PLAN → [SOURCE | TESTS | REPRODUCE] → IMPLEMENT → VERIFIED CHANGE (implement is sequential); update `STORYBOARD.md` asset roles and `BRIEF.md` asset list.

## 3. Rebuild and verify

- Video: `cd videos/temporal-durable-agents && npm run check && npx --yes hyperframes@0.8.23 render -q high -o renders/temporal-durable-agents-30s.mp4 --quiet`, then rebuild the contact sheet:
  `ffmpeg -y -i renders/temporal-durable-agents-30s.mp4 -vf "select='eq(n\,30)+eq(n\,120)+eq(n\,220)+eq(n\,330)+eq(n\,450)+eq(n\,580)+eq(n\,700)+eq(n\,830)',scale=480:-1,tile=4x2" -vsync 0 -frames:v 1 renders/video-contact-sheet.jpg`. Inspect frames at 1 s, 4 s, 15 s.
- Explainer: `npm run docs:build` catches MDX and Code Hike schema errors.
- Slideshow: `cd slideshow && npm run check`.
- Docs: rerun `npm run check && npx vitest run` and paste the real counts and date into `docs/verification.md`.

## Facts to re-verify, not re-derive

Retry 5 attempts, 20 s heartbeat timeout, 10 min start-to-close, 5 s lease, 500 ms throttle; child IDs `<runId>-source-investigator` and `<runId>-test-investigator`; Task Queue `durable-agent-tree-<runId>`; run IDs `${mode}-${8 hex}`; fixture bug `attempt <= maxAttempts` → `attempt < maxAttempts` in `fixture/src/retry.ts`; `FixWorkflow` returns the final `RunSnapshot` (carrying the diff); the test job runs one Vitest subprocess per file, four files.
