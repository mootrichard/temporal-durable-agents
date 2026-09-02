---
format: 1920x1080
duration: 30s
message: "Temporal gives an agent execution tree durable identity, so replacement Workers can resume unfinished work without losing recorded progress."
arc: BAB + Demo Loop — proof first, mechanism second
audience: Temporal technical, hiring, and developer-advocacy stakeholders
mode: collaborative
music: focused cinematic technology pulse; decisive cuts carry energy while each shot remains visually calm
captions: none
---

## Video direction

- Palette: `cream` #0B1020 is the constant canvas; `ink` #F8FAFC carries primary type; `tile` #11172A and `navy-elev` #252448 carry product/evidence surfaces; `coral` #7F86F1 is the single focal voltage; success uses captured Temporal emerald only for genuine completed state.
- Type: display roles use Inter with editorial negative tracking; evidence, Workflow IDs, attempts, filenames, and state labels use Noto Sans Mono. Product screenshots retain their native UI type.
- Motion grammar: one paused seek-safe GSAP timeline per frame; each composition arrives as a single unit with a 14px critically damped settle. One proof detail may receive a quiet opacity or color emphasis. No staggered card, row, or node entrances.
- Rhythm: concise proof beats with hard cuts. The full argument resolves in 30 seconds: hook, model, failure, architecture, kill, replay, result, principle.
- Hold rule: motion resolves within the first second; each proof receives roughly two to four seconds before the next decisive cut.
- Composition: real product surfaces occupy at least 40% of the frame. Evidence rails, mono labels, rules, and status chips provide foreground detail. Keep load-bearing content inside the top 83% even though captions are disabled.
- Never: generic AI imagery, purple-blue gradient fog, glowing brains, decorative cloud icons, invented metrics, bouncy entrances, slideshow front-loading, or independently floating elements.


## Frame 1 — Kill every worker

- status: animated
- src: compositions/frames/01-kill-every-worker.html
- duration: 2.2s
- poster: 1.6s
- transition_in: cut
- type: hook
- blueprint: compose
- scene: A single clean title sits above the real four-pane agent console; the Workflow ID remains visible.
- asset_candidates: .media/images/image_003.png, .media/images/logo_001.svg
- narrativeRole: Open on the outcome Temporal enables, not the implementation; establish the failure test in five words.
- focal: .media/images/image_003.png
- roles: .media/images/image_003.png = primary product proof · .media/images/logo_001.svg = small brand anchor

Use the real agent-console capture as the ground. “KILL” should feel like an action, not a slogan. Source: `README.md` lines 3–12 and `docs/talk-track.md` lines 44–67.

Compose: one fixed product frame, one headline, one supporting line, and one Workflow ID receipt. No glitch or layered type.

Scene 1 (0.0–0.55s): the complete proof composition settles into place as one unit.
Scene 2 (0.55–2.2s): the console, claim, and Workflow ID remain still and readable.
Scene 3: none; cut immediately after the hook lands.


## Frame 2 — Agent work is a tree

- status: animated
- src: compositions/frames/02-agent-execution-tree.html
- duration: 3.6s
- poster: 2.2s
- transition_in: hard-cut
- type: product_intro
- blueprint: compose
- scene: Keep the complete four-worker workspace framed throughout, then simplify its panes into a labeled execution tree in place.
- asset_candidates: .media/images/image_003.png, .media/images/image_004.png
- narrativeRole: Land the complete value claim by beat two and give the audience the project’s defining visual model.
- focal: .media/images/image_003.png
- roles: .media/images/image_003.png = full workspace background · .media/images/image_004.png = supporting execution-tree reference

The execution tree is coordinator → two investigators + test runner → implementation → final verification. Source: `docs/presentation-outline.md` lines 17–36 and `README.md` lines 118–137.

Scene 1 (0.0–0.55s): the complete execution-tree composition settles as one unit.
Scene 2 (0.55–0.75s): the durability rail gains quiet emphasis.
Scene 3 (0.75–3.6s): hold only long enough to parse the tree, then cut.


## Frame 3 — Process memory owns what happens next

- status: animated
- src: compositions/frames/03-process-memory-fails.html
- duration: 3.2s
- poster: 2.0s
- transition_in: hard-cut
- type: pain_point
- blueprint: compose
- scene: A static two-column comparison pairs process-owned continuation with the real Baseline failure capture.
- asset_candidates: .media/images/image_002.png
- narrativeRole: Make the old ownership model—and the exact cost of failure—visually undeniable before introducing the Temporal primitive map.
- focal: .media/images/image_002.png
- roles: .media/images/image_002.png = right-side product proof

Use the screenshot’s actual “Process memory was lost” and interrupted nodes. Do not imply code bytes disappeared; the lost object is the continuation. Source: `docs/presentation-outline.md` lines 38–75.

Compose: a fixed split frame with one memory ledger, one captured failure screen, and one conclusion rail.

Scene 1 (0.0–0.55s): the complete process-owned comparison settles as one unit.
Scene 2 (0.55–0.75s): `RESTART = START FROM ZERO` gains quiet emphasis.
Scene 3 (0.75–3.2s): hold the failed-state proof, then cut.


## Frame 4 — Move the continuation into history

- status: animated
- src: compositions/frames/04-temporal-architecture.html
- duration: 4.2s
- poster: 2.6s
- transition_in: hard-cut
- type: product_intro
- blueprint: compose
- scene: Keep the complete architecture strip visible: FixWorkflow → Child Workflows → Activities → Event History, ending on a stable Workflow ID.
- asset_candidates: .media/images/image_004.png, .media/images/logo_001.svg
- narrativeRole: Explain the architecture through responsibility boundaries, proving the demo uses Temporal primitives for specific reasons.
- focal: .media/images/image_004.png
- roles: .media/images/image_004.png = background implementation proof · .media/images/logo_001.svg = supporting brand anchor

The Workflow is deterministic orchestration. Child Workflows own delegated branch identity. Activities own nondeterministic external work. Source: `docs/architecture.md` lines 23–43 and `docs/presentation-outline.md` lines 77–109.

Compose: four equal responsibility cards remain visible in one fixed frame.

Scene 1 (0.0–0.55s): the complete responsibility map settles as one unit.
Scene 2 (0.55–0.8s): Event History receives one restrained border emphasis.
Scene 3 (0.8–4.2s): hold for the architecture read, then cut.


## Frame 5 — Compute disappears; identity survives

- status: animated
- src: compositions/frames/05-compute-disappears.html
- duration: 4.4s
- poster: 2.8s
- transition_in: hard-cut
- type: feature_showcase
- blueprint: compose
- scene: One Temporal product screen sits beside three plain receipts: Worker fleet offline, Event History available, Workflow ID unchanged.
- asset_candidates: .media/images/image_004.png, .media/images/image_003.png
- narrativeRole: Deliver the central live-demo proof: the process tree is disposable while the logical execution remains open.
- focal: .media/images/image_004.png
- roles: .media/images/image_004.png = primary product proof

Pause the music under “Compute disappeared.” Preserve the distinction between the frozen API snapshot and Temporal’s surviving history. Source: `docs/talk-track.md` lines 44–58 and `docs/architecture.md` lines 81–99.

Compose: one fixed product screen, three status receipts, and one conclusion rail. No glitch, lane overlays, or simulated camera.

Scene 1 (0.0–0.55s): the full kill-state proof settles as one unit.
Scene 2 (0.55–0.75s): `WORKFLOW ID · UNCHANGED` receives the only emphasis.
Scene 3 (0.75–4.4s): hold the contrast between compute and identity, then cut.


## Frame 6 — Replay reconstructs the next step

- status: animated
- src: compositions/frames/06-replay-resumes.html
- duration: 4.4s
- poster: 2.8s
- transition_in: hard-cut
- type: feature_showcase
- blueprint: compose
- scene: A fixed Event History ledger points to a replacement Worker that reuses results and resumes unfinished work.
- asset_candidates: .media/images/image_005.png, .media/images/image_004.png
- narrativeRole: Show exactly how recovery targets unfinished work instead of restarting the entire run.
- focal: .media/images/image_005.png
- roles: .media/images/image_005.png = background replay/code evidence · .media/images/image_004.png = supporting heartbeat reference

Every on-screen receipt must map to a real behavior: replay consumes completed results; heartbeats provide application checkpoints; retry schedules unfinished Activities. Source: `README.md` lines 126–137 and `docs/presentation-outline.md` lines 126–140.

Scene 1 (0.0–0.55s): the complete replay explanation settles as one unit.
Scene 2 (0.55–0.8s): the resumed-thread receipt gains quiet emphasis.
Scene 3 (0.8–4.4s): hold long enough to compare reused and unfinished work.


## Frame 7 — Same execution, verified result

- status: animated
- src: compositions/frames/07-same-execution-completes.html
- duration: 3.4s
- poster: 2.2s
- transition_in: hard-cut
- type: benefit_highlight
- blueprint: compose
- scene: The recovered product screen stays fixed beside three clean receipts: same Workflow ID, 4/4 tests, one-line diff.
- asset_candidates: .media/images/image_001.png
- narrativeRole: Cash the architecture into observable evidence and leave the audience with a compact completion receipt.
- focal: .media/images/image_001.png
- roles: .media/images/image_001.png = hero recovered product proof

Use the real screenshot and diff, with no invented performance metric. Source: `README.md` lines 108–116 and `docs/talk-track.md` lines 60–67.

Compose: one fixed product screen and three co-resident completion receipts. No stamp overlay or weight-transfer motion.

Scene 1 (0.0–0.55s): the full completion proof settles as one unit.
Scene 2 (0.55–0.75s): the one-line diff receipt receives the only emphasis.
Scene 3 (0.75–3.4s): hold the verified result, then cut.


## Frame 8 — The Worker executes the work

- status: animated
- src: compositions/frames/08-temporal-lockup.html
- duration: 4.6s
- poster: 2.4s
- transition_in: hard-cut
- type: branding
- blueprint: compose
- scene: The official Temporal wordmark and the final two-line principle hold on a clean dark field.
- asset_candidates: .media/images/logo_001.svg, .media/images/image_001.png
- narrativeRole: Close with Temporal’s value and the honest guarantee boundary in one durable principle.
- focal: .media/images/logo_001.svg
- roles: .media/images/logo_001.svg = hero official brand lockup

Final on-screen line: “The Worker executes the work. It does not own it.” Small footer: “Event History records orchestration. Applications own idempotency.” Source: `docs/talk-track.md` lines 69–87 and `docs/architecture.md` lines 101–101.

Compose: a clean centered lockup with no proof fragments or decorative overlays.

Scene 1 (0.0–0.55s): the complete Temporal principle settles as one centered unit.
Scene 2 (0.55–0.85s): the guarantee boundary fades in without movement.
Scene 3 (0.85–4.6s): hold the final principle cleanly, then end.
