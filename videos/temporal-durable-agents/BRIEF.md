---
workflow: general-video
flow: automation
storyboard: yes
message: "A process executes an agent tree; Temporal owns its durable progress so replacement Workers can recover the same execution."
destination: youtube-presentation
aspect: 1920x1080
language: en
audience: developers learning durable AI-agent orchestration
length: 30s
angle: project-model-then-live-proof
narration: no
---

## Intent

Create a punchy 30-second learning overview of this repository. Combine the
slideshow's clear thesis and large editorial hierarchy with the explainer's
concrete comparison, migration map, and recovery semantics. Do not compress the
slideshow into video. Build a distinct sizzle arc around one question: who owns
what happens next when the process disappears?

The story must establish the project before selling the result: one retry bug,
one coordinator, two bounded investigations, and two implementations of the
same agent protocol. Contrast process-owned continuation with Temporal-owned
continuation, then prove recovery with the real Worker-loss capture, the same
Workflow ID, four passing tests, and the one-line fix.

## Assets

- `assets/image_006.png` — real Workflow timeline while the Worker fleet is offline.
- `assets/image_001.png` — real recovered execution tree and completion receipt.
- `../../explainer/` — source for the two execution models, migration map, replay semantics, heartbeat role, and guarantee boundary.
- `../../slideshow/` — source for the opening thesis, agent-tree model, shared bug, and teaching sequence.
- `../../docs/architecture.md` — responsibility boundaries and state ownership.

## Direction

- Use a warm editorial light canvas for explanation and dark proof wells for failure states.
- Keep Temporal violet as the single connective accent. Use coral only for the baseline failure beat.
- Set large, sentence-case headlines. Use mono labels for state, identity, and receipts.
- Show the project model with designed diagrams; show recovery with real application captures.
- Use decisive full-frame violet wipes between scenes. Within scenes, animate hierarchy in 2–4 coordinated moves.
- Keep every claim readable without narration. Do not add captions or synthetic sound effects.

## Guarantee boundary

The demo proves recovery from Worker-process loss. Event History preserves
orchestration progress; heartbeats preserve retry hints. External side effects
still require application-level idempotency. Do not imply host- or disk-loss
recovery for the local Codex sessions and run worktrees.
