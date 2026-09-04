# Agent guide

The same four-node Codex code-repair tree runs process-owned (`src/baseline`) and Temporal-owned (`src/temporal`). Kill the Worker fleet: the baseline restarts at zero; the Temporal run replays from Event History and finishes. The thesis: **a process is where the work executes; a durable execution is what the work means, what has completed, and what must happen next.**

## Skills

`skills/` holds the reusable learnings as Agent Skills. They are linked from `.agents/skills` and `.claude/skills` for in-repo discovery and install anywhere with `npx skills add mootrichard/temporal-durable-agents`.

| Skill | Reach for it when |
| --- | --- |
| [`durable-agent-tree`](skills/durable-agent-tree/SKILL.md) | designing or migrating any agent orchestration onto Temporal: what belongs in a Workflow, Child Workflow, or Activity; heartbeat checkpoints; the at-least-once boundary; how to prove recovery |
| [`temporal-vocabulary`](skills/temporal-vocabulary/SKILL.md) | writing or reviewing anything that names Temporal concepts; normalizing "Workflow", "Activity", "Worker" before answering; choosing which reference to load |
| [`durable-agent-demo`](skills/durable-agent-demo/SKILL.md) | running the demo, editing `src/` or `tests/`, or verifying a change |
| [`narrative-sync`](skills/narrative-sync/SKILL.md) | after a `src/` change: realigning docs, explainer, slideshow, video, and ontology |

## Reference

- Recovery behavior and state ownership: [docs/architecture.md](docs/architecture.md). Full sequence, guarantee boundary, source map: [docs/how-it-works.md](docs/how-it-works.md).
- Temporal concept model: [ontology/](ontology/README.md) (`taxonomy.md` readable, `temporal.ttl` machine, `agent-usage.md` reference routing).
- What was promised and what was proved: [docs/spec.md](docs/spec.md), [docs/verification.md](docs/verification.md).
- Demo script: [docs/talk-track.md](docs/talk-track.md).
- Explainer site: [explainer/README.md](explainer/README.md). Slideshow: [slideshow/README.md](slideshow/README.md). Video: [videos/temporal-durable-agents/AGENTS.md](videos/temporal-durable-agents/AGENTS.md).

## Conventions

- Wiring names live in `src/temporal/contracts.ts`, `src/shared/delegation-plan.ts`, and `src/shared/run-snapshot.ts`. Change them there first; every narrative surface hand-copies them.
- A domain failure returns a `failed` snapshot and the Workflow closes Completed. Read run status from the snapshot, never from Workflow close status.
- CI deploys only the explainer. `npm run check`, `npm test`, and `npm run test:e2e` are the gate; run them before yielding.
