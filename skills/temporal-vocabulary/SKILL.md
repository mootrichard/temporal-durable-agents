---
name: temporal-vocabulary
description: Normalize Temporal terminology and route to the smallest correct reference before explaining, designing, implementing, debugging, testing, or operating Temporal code. Use when prose or code says Workflow, Activity, Worker, Cluster, Side Effect, or Activity Implementation and precision matters, or when choosing which Temporal reference to load. Backed by the OWL ontology in mootrichard/temporal-durable-agents/ontology.
---

# Temporal vocabulary

The words "Workflow", "Activity", and "Worker" each compress several distinct concepts. Answer in the precise term, then route to the reference that matches the concept and the task.

Vocabulary data lives in the reference repo's [`ontology/`](https://github.com/mootrichard/temporal-durable-agents/tree/main/ontology): `taxonomy.md` (readable concept tree, precise-language table, design-pattern catalog), `temporal.ttl` (OWL 2 DL model, 120 classes), `agent-usage.md` (authority order and the pinned reference-routing table).

## Authority order

When sources disagree: current Temporal documentation, then `temporal.ttl`, then the pinned Temporal Developer skill, then project-local docs. Release stages, minimum versions, CLI flags, and SDK APIs are version-sensitive; verify against current documentation before changing code or giving operational instructions.

## Routing workflow

1. **Classify the task.** One primary intent: explain, design, implement, debug, test, or operate. Name the SDK language when code is involved.
2. **Normalize the terms.** Resolve every convenience term with the table below (fuller mapping: `taxonomy.md` "Precise language" and the `AmbiguousTerm` individuals in `temporal.ttl`).
3. **Locate the execution boundary.** State which code is a Workflow Definition, which is an Activity Definition, which process executes each, where Event History lives, and which external effects stay application-owned.
4. **Load the smallest reference bundle.** Use the routing table in `agent-usage.md`. For code, load the language overview first, then only the topic references the task needs.
5. **Apply project language.** Map Temporal concepts onto the project's own vocabulary only after the platform concepts are clear; keep both names visible when teaching the mapping.
6. **Separate the answer.** Label Temporal facts, project design rules, and version-sensitive operational guidance distinctly.
7. **Verify completion.** Every changed Temporal concept has a source; every code path respects replay boundaries; every external effect has a stable idempotency strategy; every operational claim has a current version check.

## Normalization rules

| Convenience term | Precise term | Rule |
| --- | --- | --- |
| Workflow | Workflow Definition, Workflow Type, Workflow Execution | Name the code, the registered name, or the running durable execution. |
| Activity | Activity Definition, Activity Type, Activity Execution, Activity Task Execution | Name the code, the registered name, the full execution, or one attempt. |
| Worker | Worker Program, Worker Process, Worker Entity | Entity is the individual poller bound to a Task Queue. |
| Temporal Cluster | Temporal Service | Cluster is deprecated. |
| Activity Implementation | Activity Definition | Definition is the registered code concept. |
| Side Effect | Recorded Side Effect, External Effect | Name the SDK mechanism or the external change. |

- **Workflow replay** re-executes Workflow code and reuses recorded Activity results. Activity retries create additional Activity Task Executions; replay never reruns a completed Activity Definition.
- **Stable idempotency keys** keep the same identity across retries. Attempt numbers belong in diagnostics, not in a deduplication key.
- **Activity code** may perform non-deterministic operations and external effects. That placement permission does not make every Activity Definition non-deterministic.

## Guardrails

- RDFS `domain` and `range` are inference rules, not input validation. OWL cardinalities hold under the open-world assumption; they support inference and never prove source data complete.
- Temporal does not own an external business effect. Activities cause effects; application-owned idempotency and reconciliation protect them.
- A Workflow Definition is not a Workflow Execution; a Worker Program is not a running Worker Process.
