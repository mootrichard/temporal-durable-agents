---
version: beta
name: Durable execution editorial
unit: 1920x1080 video frame
principle: slideshow-scale thesis · explainer-grade evidence · motion-native composition
colors:
  paper: "#F7F6F2"
  ink: "#17171B"
  muted: "#696572"
  violet: "#5C52D9"
  violet-soft: "#ECEAFA"
  proof: "#191820"
  proof-elevated: "#302E43"
  failure: "#EF765F"
  white: "#FFFFFF"
typography:
  display: { fontFamily: "Inter", weight: 500, size: "90–126px", lineHeight: "0.94–0.99", tracking: "-0.045em" }
  supporting: { fontFamily: "Inter", weight: 500, size: "23–48px", lineHeight: "1.15–1.35" }
  technical: { fontFamily: "Noto Sans Mono", weight: 800, size: "14–22px", tracking: "0.08–0.13em", uppercase: true }
spacing:
  frame-x: "86px"
  frame-y: "68px"
  radius: "10–24px"
  border: "2px"
motion:
  entrance: "0.34–0.58s, power3/power4, directional"
  emphasis: "short stagger or one scale settle"
  transition: "0.40s full-frame violet wipe centered on the cut"
  exit: "final scene only"
---

# Durable execution editorial

## Visual role

The video shares the slideshow's editorial confidence without reproducing slide
layouts. Large sentence-case claims establish each idea. Diagrams, state maps,
and real product captures provide the explainer's concrete evidence.

## Frame grammar

- Light paper frames explain the project model, ownership shift, replay, and result.
- Dark proof frames mark process failure and the live Worker-loss experiment.
- Violet connects identity, history, and recovery across all scenes.
- Coral appears only where process-owned continuation is destroyed.
- Every frame has one dominant claim and one proof structure.
- Technical labels identify actual project concepts: Workflow, Child Workflow,
  Activity, Event History, heartbeat, Worker, Workflow ID, test receipt.

## Motion grammar

- Headlines enter first and establish the reading order.
- Proof structures arrive directionally; related rows or nodes may stagger once.
- The scene settles within roughly one second, leaving time to read.
- Full-frame violet wipes connect cuts and prevent deck-like page changes.
- Only the closing scene fades out.

## Prohibitions

No generic AI imagery, glowing brains, cloud illustrations, invented metrics,
small dashboard copy as the primary message, gradient text, floating card grids,
or claims beyond Worker-process-loss recovery. External effects still require
idempotency.
