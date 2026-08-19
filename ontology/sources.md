# Sources and provenance

Source review date: 2026-08-16.

## Temporal documentation

| Source | Used for |
| --- | --- |
| [Glossary](https://docs.temporal.io/glossary) | Canonical terms and definitions for core platform, application, execution, task, messaging, policy, and Worker concepts |
| [Temporal Design Patterns](https://docs.temporal.io/design-patterns) | Pattern categories, catalog entries, and the Temporal primitives named by each pattern |
| [Worker performance](https://docs.temporal.io/develop/worker-performance/) | Worker Task Slots, Slot Suppliers, Worker Tuners, Task Pollers, eager execution, and metric families |
| [Why Temporal?](https://docs.temporal.io/evaluate/why-temporal) | Reliable execution, code structure, and state visibility as the top-level value framing |
| [Understanding Temporal](https://docs.temporal.io/evaluate/understanding-temporal) | Relationships among Workflows, Activities, SDKs, the Temporal Service, Workers, Visibility, and Event History |

Temporal documentation pages change over time. The ontology therefore carries its
own version and review date instead of claiming permanent equivalence with the live
docs.

## Semantic-web standards

| Source | Used for |
| --- | --- |
| [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) | `rdfs:Class`, subclass and subproperty hierarchies, labels, comments, domains, and ranges |
| [OWL 2 Conformance](https://www.w3.org/TR/owl2-conformance/) | OWL document/profile and tool-conformance expectations |
| [OWL 2 Structural Specification](https://www.w3.org/TR/owl2-syntax/) | Class axioms, object properties, inverse properties, and qualified cardinality restrictions |
| [Turtle](https://www.w3.org/TR/turtle/) | Human-readable RDF serialization |

## Agent-development source

The ontology enhancement reviewed
[`temporalio/skill-temporal-developer`](https://github.com/temporalio/skill-temporal-developer)
at commit
[`4f7b14626c56d06574564cd4d265bbcb6425a21c`](https://github.com/temporalio/skill-temporal-developer/commit/4f7b14626c56d06574564cd4d265bbcb6425a21c),
dated 2026-07-05 and declaring skill version `0.5.0`.

The skill is a secondary operational source for this ontology. Current Temporal
documentation remains authoritative for canonical terminology and platform behavior.
The skill contributes agent routing, determinism checks, versioning concepts,
Standalone Activities, dispatch policy, and AI/LLM application patterns.

## Provenance policy

- `dcterms:source` identifies the page supporting an ontology or concept group.
- `rdfs:seeAlso` points from each pattern catalog entry to its specific Temporal
  pattern page.
- `rdfs:comment` is a project-authored paraphrase. It is not a verbatim copy of the
  source definition.
- Classes or relationships that need broader documentation review remain outside
  version `0.2.0`.
