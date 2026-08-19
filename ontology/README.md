# Temporal ontology

This folder contains a project-authored map of Temporal concepts. It is grounded in
Temporal's public documentation and expressed with RDF Schema and OWL 2 vocabulary.
It is not an official Temporal ontology.

Version `0.2.0` answers two questions: **what kinds of things does Temporal talk
about, and how do those kinds relate?** And **how should an agent use that vocabulary
to reach reliable implementation guidance?** It keeps Chaos City, SDK APIs, and
production configuration values in separate layers.

## Files

- [`taxonomy.md`](./taxonomy.md) is the human-readable concept map and records the
  modeling boundaries.
- [`temporal.ttl`](./temporal.ttl) is the machine-readable OWL ontology in Turtle.
- [`sources.md`](./sources.md) records source scope and provenance.
- [`agent-usage.md`](./agent-usage.md) routes agents from normalized concepts to the
  relevant operational and SDK references.
- [`temporal-developer-skill-review.md`](./temporal-developer-skill-review.md) records
  the source audit and enhancement rationale.

## Modeling approach

- Canonical labels follow the Temporal glossary. The broad words **Workflow**,
  **Activity**, and **Worker** are recorded as ambiguous convenience terms. Agents
  should prefer the precise terms such as **Workflow Definition**, **Workflow
  Execution**, and **Workflow Type**.
- RDFS supplies the class and property hierarchies, labels, comments, domains, and
  ranges.
- OWL supplies inverse properties, transitive composition, disjointness, and a few
  qualified cardinality constraints supported by the docs.
- Design-pattern entries are individuals of pattern-category classes. This keeps
  “Approval” as a cataloged pattern while allowing `ExternalInteractionPattern` to
  remain a queryable category.
- Source links use `dcterms:source` and `rdfs:seeAlso`.

The ontology uses the provisional namespace
`https://example.org/temporal-ontology#`. Replace it with a controlled,
dereferenceable IRI before publishing or integrating external datasets.

## Useful questions for agents

The model is designed to answer questions such as:

1. Is this term a definition, an execution, a task, a message, a policy, or an
   operational concern?
2. Which precise Temporal concepts can the words “Workflow,” “Activity,” or
   “Worker” denote?
3. Which tasks make progress on which executions?
4. Which runtime components poll Task Queues and execute Tasks?
5. Which design patterns belong to a given problem category?
6. Which Temporal primitives does a design pattern use?
7. Which Worker-performance concepts affect capacity, intake, or latency?
8. Which operational reference should an agent load for this concept and task?

## Guardrails

- Treat RDFS `domain` and `range` as inference rules, not input-validation rules.
- Treat OWL cardinalities under the open-world assumption. They support inference;
  they do not prove that source data is complete.
- Do not infer that Temporal owns an external business effect. Activities can cause
  effects, while application-owned idempotency and reconciliation still protect
  those effects.
- Do not equate a Workflow Definition with a Workflow Execution, or a Worker Program
  with a running Worker Process.
- Keep project-specific concepts in the root [`CONTEXT.md`](../CONTEXT.md) until a
  separate Chaos City ontology module is intentionally added.
- Use current Temporal documentation as the canonical authority when an operational
  skill and the documentation use different terms or guarantees.

## Validation target

`temporal.ttl` targets an OWL 2 DL-compatible modeling style and a standard Turtle
serialization. Syntax can be checked with any RDF 1.1 Turtle parser. OWL profile and
logical-consistency checks should be run with an OWL 2 DL reasoner before external
publication.

Version `0.2.0` validation on 2026-08-16 produced these results:

- RDF/Turtle parse: 1,134 triples
- OWL classes: 120
- Named individuals: 53
- Design-pattern categories: 11
- Design-pattern entries: 39, comprising 34 documentation-catalog patterns and 5
  skill-sourced AI application patterns
- ROBOT OWL 2 DL profile check: pass
- HermiT reasoning: pass
- External source and reference links: 85 returned successful HTTP responses; the
  provisional `example.org` ontology namespace remains intentionally unpublished
