# Agent use of the Temporal ontology

The [`temporal-vocabulary`](../skills/temporal-vocabulary/SKILL.md) skill carries the
routing workflow and normalization rules an agent follows when it explains, designs,
implements, debugs, tests, or operates Temporal code. This file holds the data that
workflow consumes: the authority order, the pinned reference-routing table, and the
plugin shape. The ontology supplies precise language and relationships; the upstream
Temporal Developer skill supplies procedures, commands, SDK examples, and
troubleshooting flows.

## Authority order

Use sources in this order when they disagree:

1. Current Temporal documentation defines platform concepts and supported behavior.
2. `temporal.ttl` defines this project's normalized vocabulary and explicit
   relationships.
3. The pinned Temporal Developer skill supplies operational and SDK-specific
   guidance.
4. [`docs/architecture.md`](../docs/architecture.md) defines this demo's language and its mapping onto Temporal concepts.

Treat release stages, minimum versions, CLI flags, and SDK APIs as version-sensitive
facts. Verify them against current official documentation before changing code or
giving operational instructions.

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

## Plugin shape

The official repository already publishes an
[OpenAI Codex plugin wrapper](https://github.com/temporalio/codex-temporal-plugin).
A project plugin should extend or synchronize with that upstream skill and add four
project layers:

1. the `temporal-vocabulary` skill as the compact entrypoint;
2. the ontology plus a small term-and-reference query tool;
3. optional SHACL rules for closed-world code and configuration checks;
4. the Chaos City alignment and TypeScript-specific project guidance.

Keep SDK recipes in the upstream reference tree. Keep stable meanings and
relationships in the ontology. Keep enforceable closed-world rules in SHACL or test
code. This division gives each fact one maintainable home.
