---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Temporal gives an agent execution tree durable identity, so replacement Workers can resume unfinished work without losing recorded progress."
destination: youtube-presentation
aspect: 1920x1080
language: en
audience: temporal-technical-hiring-and-developer-advocacy
length: 30s
angle: cinematic-proof-then-architecture
narration: no
---

## Intent

Create a high-quality 30-second showcase that sells Temporal on the durable agent
orchestration demo built in this repository. Open with the live proof: kill every
Worker and Codex/test subprocess, hold on the frozen execution tree, restart the
fleet, and finish the same Workflow under the same Workflow ID. Then reveal the
architecture that makes the recovery real: Event History, Child Workflows,
Activities, heartbeats, replay, and replaceable compute.

The chosen concept is “The Orchestrator Died. The Work Didn’t.” The tone is
focused, precise, and technically exact: Apple-like restraint with energy coming
from decisive cuts, strong hierarchy, and real proof rather than layered motion.

## Assets

- https://temporal.io/brand — official Temporal brand assets and visual guidance; use the official logo in the opener and closing sting, and use the brand palette/type guidance as visual truth.
- ../../output/playwright/temporal-recovered.png — recovered execution tree and completion receipt.
- ../../output/playwright/baseline-killed.png — process-owned failure state.
- ../../output/playwright/agent-consoles-live.png — four-pane live agent console.
- ../../output/playwright/workflow-timeline-frozen.png — Workflow timeline while the Worker fleet is offline.
- ../../output/playwright/slideshow-code-trace-replay.png — existing replay/code-trace visual.
- ../../docs/architecture.md — architecture, state ownership, and failure semantics.
- ../../docs/presentation-outline.md — source narrative and Temporal primitive mapping.
- ../../docs/talk-track.md — source phrasing and honest guarantee boundary.

## Customizations

- Feature captured application screens as primary evidence, not decorative mockups.
- Let one persistent Workflow ID act as the visual thread through failure and recovery.
- Drive the cut with the existing music bed. Use decisive scene changes and one focal motion per shot. No narration or synthetic sound-effect hits.
- Keep every frame calm enough to parse instantly: the composition arrives as one unit, one proof detail receives emphasis, then the cut moves on.
- Do not add styled captions to this master.
- Review the plan, wireframe sketches, and finished piece on the live storyboard board.

## Notes

- Avoid generic AI imagery, glowing brains, stock cloud graphics, and ungrounded durability claims.
- The 30-second limit keeps every proof beat decisive while preserving the guarantee boundary.
- Unnarrated 16:9 master for YouTube, presentation playback, and a project page.
