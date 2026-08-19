# Agent use of the Temporal ontology

Use this guide when an agent explains, designs, implements, debugs, tests, or operates
Temporal code in this repository. The ontology supplies precise language and
relationships. The upstream Temporal Developer skill supplies procedures, commands,
SDK examples, and troubleshooting flows.

## Authority order

Use sources in this order when they disagree:

1. Current Temporal documentation defines platform concepts and supported behavior.
2. `temporal.ttl` defines this project's normalized vocabulary and explicit
   relationships.
3. The pinned Temporal Developer skill supplies operational and SDK-specific
   guidance.
4. The root `CONTEXT.md` defines Chaos City language and project-specific mappings.

Treat release stages, minimum versions, CLI flags, and SDK APIs as version-sensitive
facts. Verify them against current official documentation before changing code or
giving operational instructions.

## Routing workflow

1. **Classify the task.** Choose one primary intent: explain, design, implement,
   debug, test, or operate. Identify the SDK language when code is involved.
2. **Normalize the terms.** Resolve “Workflow,” “Activity,” “Worker,” “Cluster,”
   “Activity Implementation,” and “Side Effect” through `taxonomy.md` or the
   `AmbiguousTerm` individuals in `temporal.ttl`.
3. **Locate the execution boundary.** State which code belongs to a Workflow
   Definition, which belongs to an Activity Definition, which process executes it,
   where Event History lives, and which external effects remain application-owned.
4. **Load the smallest reference bundle.** Use the routing table below. For code,
   load the upstream language overview first and then only the topic references
   required by the task.
5. **Apply project language.** Map Temporal concepts to `CONTEXT.md` after the
   platform concepts are clear. Keep the Temporal and Chaos City names visible when
   teaching the mapping.
6. **Separate the answer.** Label or clearly distinguish Temporal facts, project
   design rules, and version-sensitive operational guidance.
7. **Verify completion.** Every changed Temporal concept has a source; every code
   path respects replay boundaries; every external effect has a stable idempotency
   strategy; and every operational claim has a current version check.

## Reference routing

The links below pin the reviewed upstream skill revision. Check upstream `main` for
newer operational guidance when freshness matters.

| Ontology concept or task | Core reference | Additional reference |
| --- | --- | --- |
| Workflow Determinism, Replay, Command/Event mismatch | [Core determinism](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/determinism.md) | `references/{language}/determinism.md` and `testing.md` |
| Signal, Query, Update | [Core patterns](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/patterns.md) | [Interactive Workflows](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/interactive-workflows.md) and language patterns |
| Failure or stalled execution | [Troubleshooting](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/troubleshooting.md) | [Error reference](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/error-reference.md) and language gotchas |
| Versioning Strategy, Worker Deployment, Build Id | [Core versioning](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/versioning.md) | `references/{language}/versioning.md` |
| Standalone Activity Execution | [Standalone Activities](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/standalone-activities.md) | `references/{language}/standalone-activities.md` |
| Priority or Fairness | [Priority and Fairness](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/priority-fairness.md) | Current Worker-performance and Task Queue docs |
| AI Application Pattern | [AI patterns](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/ai-patterns.md) | Language AI reference and current integration docs |
| TypeScript implementation | [TypeScript overview](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/typescript/typescript.md) | The topic-specific TypeScript reference |

## Normalization rules

- **Temporal Service** is canonical. Treat **Temporal Cluster** as a deprecated
  convenience term.
- **Activity Definition** is canonical for the registered code concept. Treat
  **Activity Implementation** as skill shorthand.
- **Workflow replay** re-executes Workflow code and reuses recorded Activity results.
  Activity retries can create multiple Activity Task Executions; replay does not
  rerun a completed Activity implementation.
- **Stable idempotency keys** preserve the same identity across retries. Attempt
  numbers belong in diagnostics, not in a retry-deduplication key.
- **Activity code** may perform non-deterministic operations and external effects.
  This placement permission does not make every Activity Definition inherently
  non-deterministic.
- **Side Effect** has two meanings in common prose. Name either the recorded Temporal
  Side Effect mechanism or the external effect explicitly.

## Plugin shape

The official repository already publishes an
[OpenAI Codex plugin wrapper](https://github.com/temporalio/codex-temporal-plugin).
A project plugin should extend or synchronize with that upstream skill and add four
project layers:

1. a compact skill entrypoint using the routing workflow above;
2. the ontology plus a small term-and-reference query tool;
3. optional SHACL rules for closed-world code and configuration checks;
4. the Chaos City alignment and TypeScript-specific project guidance.

Keep SDK recipes in the upstream reference tree. Keep stable meanings and
relationships in the ontology. Keep enforceable closed-world rules in SHACL or test
code. This division gives each fact one maintainable home.
