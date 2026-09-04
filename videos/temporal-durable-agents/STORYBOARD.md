---
format: 1920x1080
duration: 30s
message: "Processes execute agent work; Event History owns durable progress."
arc: project model → ownership contrast → failure proof → recovery semantics → verified result
audience: developers learning durable AI-agent orchestration
music: focused technology pulse; violet wipes mark each decisive idea change
captions: none
---

## Video direction

- Visual language: slideshow-scale typography and orbital execution-tree motif; explainer-style ownership maps, code evidence, and recovery receipts.
- Distinction: this is not a narrated deck recap. It compresses the repository into eight visual claims built for motion and immediate comprehension.
- Palette: paper `#F7F6F2`, ink `#17171B`, proof well `#191820`, Temporal violet `#5C52D9`, failure coral `#EF765F`.
- Motion: fast directional entrances, short node/receipt staggers, and full-frame violet wipes at every cut. The final scene alone fades out.
- Evidence: use real captures for the Worker-offline and recovered-completion beats. Designed diagrams explain the model and ownership shift.

## Frame 1 — The thesis

- src: `compositions/frames/01-kill-every-worker.html`
- timing: `0.0–2.2s`
- claim: **The orchestrator died. The work didn’t.**
- visual: large editorial hook beside an orbiting execution-tree identity.
- teaching job: establish Worker loss and stable execution identity in one glance.

## Frame 2 — The project

- src: `compositions/frames/02-agent-execution-tree.html`
- timing: `2.2–5.8s`
- claim: **One bug. Two execution models.**
- visual: one-line retry diff beside coordinator → investigators/test runner → implement/verify.
- teaching job: show what the repository actually builds before discussing Temporal.

## Frame 3 — Process-owned continuation

- src: `compositions/frames/03-process-memory-fails.html`
- timing: `5.8–9.0s`
- claim: **The process owns what happens next.**
- visual: in-memory plan, joins, thread IDs, and next step collapse into a coral `SIGKILL` receipt.
- teaching job: name the lost object precisely—the continuation, not the code bytes.

## Frame 4 — History-owned continuation

- src: `compositions/frames/04-temporal-architecture.html`
- timing: `9.0–13.2s`
- claim: **Same work. A new owner.**
- visual: direct call → Activity, method → Child Workflow, process snapshot → Workflow state, restart → replay.
- teaching job: map familiar code responsibilities to Temporal primitives.

## Frame 5 — Kill the fleet

- src: `compositions/frames/05-compute-disappears.html`
- timing: `13.2–17.6s`
- claim: **Worker fleet gone. Workflow still open.**
- visual: real frozen Workflow timeline, `OFFLINE`, Event History available, Workflow ID unchanged.
- teaching job: make replaceable compute and durable identity visible.

## Frame 6 — Replay and continue

- src: `compositions/frames/06-replay-resumes.html`
- timing: `17.6–22.0s`
- claim: **Replay doesn’t rerun everything.**
- visual: completed results are reused, interrupted Activity is retried, heartbeat detail becomes a resume hint.
- teaching job: explain the recovery algorithm without overstating exactly-once execution.

## Frame 7 — Completion receipt

- src: `compositions/frames/07-same-execution-completes.html`
- timing: `22.0–25.4s`
- claim: **Same execution. One-line fix.**
- visual: real recovered tree with same Workflow ID, `4 / 4 tests`, and one-line diff receipts.
- teaching job: close the proof with repository-specific evidence.

## Frame 8 — Durable ownership

- src: `compositions/frames/08-temporal-lockup.html`
- timing: `25.4–30.0s`
- claim: **Processes execute. History owns progress.**
- visual: violet thesis lockup with the four core primitives and the idempotency boundary.
- teaching job: leave the transferable mental model, not a product slogan.
