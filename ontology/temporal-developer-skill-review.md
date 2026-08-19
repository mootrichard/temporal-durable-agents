# Review: Temporal Developer skill versus the project ontology

Review date: 2026-08-16
Upstream repository: [`temporalio/skill-temporal-developer`](https://github.com/temporalio/skill-temporal-developer)
Inspected revision: [`4f7b14626c56d06574564cd4d265bbcb6425a21c`](https://github.com/temporalio/skill-temporal-developer/commit/4f7b14626c56d06574564cd4d265bbcb6425a21c), committed 2026-07-05; `SKILL.md` version `0.5.0`

## Conclusion

The two artifacts solve different layers of the same problem and should be combined, not merged into one file:

- The upstream skill is an **operational playbook**. It routes an agent to task- and SDK-specific prose, examples, commands, troubleshooting, and safety rules.
- This project's ontology is a **semantic foundation**. It gives concepts stable identities, distinguishes commonly conflated terms, records relationships and provenance, and supports machine queries and reasoning.

The best next design is a small agent skill that uses the ontology as its controlled vocabulary and retrieval index, with SHACL or explicit decision rules for constraints that OWL cannot enforce. The official repository already distributes its skill through Claude, Cursor, and [OpenAI Codex plugin wrappers](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/README.md#L7-L17), so a project plugin should extend that model or contribute upstream rather than duplicate its packaging.

## What the upstream skill contains

The entrypoint is a compact router. It names seven SDK languages, explains the basic Service/Worker/replay model, requires the agent to load the language guide first, and then routes to topic references for determinism, patterns, versioning, troubleshooting, CLI use, AI patterns, observability, and integrations ([`SKILL.md`](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L1-L100)). At the inspected revision, `references/` contains 95 Markdown files: 13 cross-SDK core references plus language trees for Python, TypeScript, Go, Java, .NET, Ruby, and Rust ([reference tree](https://github.com/temporalio/skill-temporal-developer/tree/4f7b14626c56d06574564cd4d265bbcb6425a21c/references)).

Its strongest design choices are:

1. **Progressive disclosure.** The agent reads one SDK overview and only the relevant topic files, instead of loading the whole corpus ([routing instructions](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L47-L96)).
2. **Rules tied to actions.** It turns replay into a concrete diagnostic rule, classifies non-deterministic operations, requires replay tests, and gives recovery paths ([determinism reference](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/determinism.md#L7-L133)).
3. **Decision guidance.** It explains when to choose Signals, Queries, Updates, Child Workflows, Continue-As-New, Sagas, polling approaches, idempotency, and Local Activities ([patterns reference](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/patterns.md#L9-L479)).
4. **Version- and maturity-aware advice.** It covers patching, Workflow Type versioning, Worker Versioning, Build IDs, `PINNED`/`AUTO_UPGRADE`, and Public Preview features ([versioning reference](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/versioning.md#L5-L199)).
5. **Agent-relevant Temporal patterns.** LLM calls and non-deterministic tools become Activities, deterministic agent-state mutation can remain in Workflow code, and Temporal owns the durable retry layer ([AI patterns](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/ai-patterns.md#L22-L105)).
6. **Human control.** When the skill itself seems wrong, the agent drafts an issue and asks the user to file it; it does not file autonomously ([feedback rule](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L102-L106)).

One terminology issue makes the ontology immediately useful: the skill's architecture section calls the backend a **Temporal Cluster** ([`SKILL.md` lines 13–19](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L13-L19)), while the current Temporal glossary says that term is being phased out in favor of **Temporal Service** ([Temporal glossary](https://docs.temporal.io/glossary#temporal-cluster)). Our ontology already uses Temporal Service as the canonical class.

## Guidance to review before importing

The upstream material is useful implementation guidance, but several statements need refinement before they become ontology assertions or project rules:

1. The entrypoint correctly says Workflow replay uses recorded Activity results instead of executing the Activity again ([`SKILL.md` lines 30–35](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L30-L35)). The patterns guide later says Activities may re-execute during “retries or replay” ([patterns lines 291–295](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/patterns.md#L291-L295)). Workflow replay does not run the Activity implementation; Activity retries and acknowledgement failures can cause repeated Activity attempts. Preserve that distinction.
2. The suggested idempotency keys include “Workflow ID + activity name + attempt number” ([patterns lines 312–316](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/patterns.md#L312-L316)). An attempt number changes across retries and defeats retry deduplication. Prefer a stable business-operation key or stable Workflow/Activity identity.
3. “Event History” as a “log of all workflow state” is useful shorthand ([`SKILL.md` lines 13–15](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L13-L15)). The ontology's `Event History records Event` plus replay relation is more precise than modeling Event History as a direct state snapshot.
4. “Activity Implementations — non-deterministic operations” is placement advice ([`SKILL.md` lines 21–24](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/SKILL.md#L21-L24)). Activity code may itself be deterministic. The durable boundary is that Activity implementations execute outside Workflow replay and may perform external effects.
5. Local Activities are described broadly as lacking durability and distribution while the same guide says their completion is recorded in Event History ([patterns lines 442–464](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/patterns.md#L442-L464)). Model the exact trade-off: same Worker process, no Task Queue round trip, and completion checkpointed with a Workflow Task.

## What the skill reveals is missing from the ontology

The ontology's current scope intentionally omits SDK-specific APIs, detailed operational configuration, and pattern preconditions ([project boundary](./taxonomy.md#boundaries-and-pending-extensions)). The skill exposes the following high-value gaps.

| Gap | Evidence in the upstream skill | Recommended semantic treatment |
| --- | --- | --- |
| Determinism and replay constraints | Command/Event matching, forbidden sources of non-determinism, replay tests, and recovery are operational rules rather than just a `Replay` concept ([core determinism](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/determinism.md#L13-L133)). | Add `DeterminismConstraint`, `ReplayCompatibilityTest`, `NonDeterminismFailure`, and relations among a Workflow Definition, generated Commands, and recorded Events. Put prohibitions such as “no external I/O in Workflow code” in SHACL or skill rules, not OWL cardinalities. |
| Interaction contracts | Queries are read-only and unrecorded; Update validators are read-only and non-blocking; Signals and Updates have distinct response semantics ([core patterns](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/patterns.md#L11-L98)). | Add handler and validator concepts plus `isRecordedInHistory`, `mayMutateWorkflowState`, `returnsResponse`, and `mayBlock`. Use SHACL to validate handler declarations. |
| Failure, status, retry, and cancellation model | The references classify execution statuses, retryable/non-retryable failures, cancellation delivery, and common failure types ([gotchas](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/gotchas.md#L7-L237)). | Add a failure/status module with `Failure`, `WorkflowExecutionStatus`, retry classification, cancellation request, termination, and compensation. Avoid treating a runtime status as a subclass of an execution. |
| Versioning and deployment | The skill models Patching, Workflow Type Versioning, Worker Deployment, Build ID, Target Version, and versioning behavior ([versioning](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/versioning.md#L27-L180)). | Add a separate versioning module. Relate Workflow Definitions and Worker Deployments to versions; represent `PINNED` and `AUTO_UPGRADE` as policy values; model patch lifecycle states. Keep rollout procedures in the skill. |
| Data and visibility | The TypeScript guide introduces Data Converters, Payload Converters, Payload Codecs, Search Attributes, and Memos ([TypeScript data handling](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/typescript/data-handling.md#L1-L254)). | Extend the present `Payload` and `Visibility` nodes with a data/metadata module. Record whether metadata is indexed, and which converter or codec transforms a Payload. Keep encryption implementations and key handling outside the ontology. |
| Task dispatch policy | Priority, fairness keys/weights, virtual queues, and rate limits have concrete semantics and Public Preview status ([priority and fairness](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/priority-fairness.md#L1-L120)). | Promote Priority and Fairness from pattern catalog entries into operational-policy concepts related to Task Queues and Tasks. Add release-stage annotations and source-version metadata. |
| Standalone Activities | A Client can start a top-level Activity Execution without a Workflow, with its own lifecycle, ID space, conflict policies, and Public Preview limits ([standalone concepts](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/standalone-activities.md#L1-L74)). | Add `StandaloneActivityExecution` as a specialized Activity Execution and model its direct Client initiation. Do not bake preview CLI flags or minimum versions into core class axioms; attach them as versioned annotations. |
| Testing and observability | Replay testing, time-skipping, Activity mocking, replay-aware logging, metrics, and Search Attributes are developer responsibilities ([TypeScript testing](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/typescript/testing.md), [observability](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/typescript/observability.md)). | Model test and observability capabilities only where they help retrieval or conformance. Concrete test recipes, log configuration, and CLI diagnostics belong in skill references. |
| Agent/LLM application patterns | The upstream skill explicitly separates LLM/tool side effects from deterministic agent-state mutation and centralizes retries in Temporal ([AI patterns](https://github.com/temporalio/skill-temporal-developer/blob/4f7b14626c56d06574564cd4d265bbcb6425a21c/references/core/ai-patterns.md#L22-L105)). | Add an optional agent-integration module with `LLMCall`, `AgentToolCall`, `AgentStateMutation`, and mappings to Activity Definition or Workflow Definition. Keep these outside the Temporal core namespace because they are application patterns, not Temporal primitives. |

## What the ontology contributes that the skill lacks

1. **Precise identities.** The ontology distinguishes Workflow Definition, Workflow Type, and Workflow Execution, plus Activity Definition/Type/Execution and Worker Program/Process/Entity ([project terminology rules](./taxonomy.md#precise-language)). The upstream skill often uses “Worker,” “Workflow,” and “Activity” as convenient umbrella terms. This precision can prevent agents from placing code, state, or operational responsibility on the wrong entity.
2. **Machine-readable relations.** `executesDefinition`, `mapsNameToDefinition`, `hasEventHistory`, `makesProgressOn`, `pollsTaskQueue`, and related properties make the architecture queryable, with inverses, disjointness, and selected cardinalities ([ontology approach](./README.md#modeling-approach)). The upstream repository is Markdown guidance without a semantic schema.
3. **Broader official pattern coverage.** The ontology catalogs 34 patterns in ten categories, including batch, throughput, latency, external-interaction, and Worker-configuration patterns ([pattern taxonomy](./taxonomy.md#design-pattern-taxonomy)). The skill explains fewer cross-SDK patterns in greater operational depth. The catalog and the playbook can cross-index each other.
4. **Worker-performance structure.** The ontology already relates Worker Task Slots, Slot Suppliers, Worker Tuners, Task Pollers, eager execution, Workflow Cache, and performance metrics ([top-level taxonomy](./taxonomy.md#top-level-taxonomy)). The skill offers SDK tuning advice but lacks one cross-SDK semantic model for these concepts.
5. **Explicit provenance and reasoning boundaries.** Every core concept can point to a source, while the README warns that RDFS domains/ranges infer types and OWL's open-world semantics do not validate completeness ([guardrails](./README.md#guardrails)). This is the right base for source-grounded agent explanations and future automated checks.

## Exact enhancement plan

### Phase 1: strengthen the semantic core

1. Add small, source-backed modules rather than expanding one monolithic Turtle file: `interaction`, `failure-lifecycle`, `versioning`, `data-visibility`, and `dispatch-policy`.
2. Add provenance annotations for `documentation URL`, `documentation review date`, `upstream commit`, `SDK language`, `minimum version`, and `release stage`. Treat time-sensitive values as annotations or data, never timeless OWL truths.
3. Add cross-references from every design-pattern individual to the concepts, constraints, trade-offs, and relevant skill reference sections it uses.
4. Add a SHACL layer for closed-world rules: Query and Update-validator purity, Workflow determinism boundaries, required Activity timeouts, heartbeat expectations for cancellable long-running Activities, and compatible Client/Worker data converters.
5. Add competency tests that answer concrete agent questions, such as “May this function perform network I/O?”, “Which interaction returns a value and may mutate state?”, and “Which versioning strategy fits an open long-running Workflow?”

### Phase 2: build the project skill

1. Keep `SKILL.md` short. Route first by task (`explain`, `design`, `implement`, `debug`, `operate`) and then by SDK. Adopt the upstream skill's progressive-disclosure structure.
2. Make TypeScript the first SDK adapter because this repository uses the TypeScript SDK. Link its implementation guidance to ontology IRIs instead of copying definitions into every reference.
3. Provide a small query tool that resolves an ambiguous term, returns its canonical concepts and relations, then selects only the relevant reference bundle. The tool should return source URLs and review dates with every answer.
4. Separate three outputs in agent responses: **Temporal fact**, **project design rule**, and **version-sensitive operational guidance**. This prevents a local convention or preview feature from being presented as a universal platform rule.
5. Add prompt-level conformance tests for terminology, replay boundaries, idempotency ownership, versioning, and interactive Workflow semantics. Add Turtle, OWL-profile, reasoner, and SHACL validation to the plugin's CI.
6. Preserve the upstream feedback boundary: draft issues for the human to file. Add a local rule that ontology/skill drift creates a proposed patch with source evidence, never a silent semantic change.

### Phase 3: optional plugin packaging

Package the skill, ontology, SHACL shapes, and query/validation tools together. Since Temporal already publishes a Codex plugin wrapper, choose one of two clear paths:

- **Upstream contribution:** propose ontology-backed terminology and reference metadata to `temporalio/skill-temporal-developer`.
- **Project plugin:** depend on or periodically sync the official skill, then add this ontology, Chaos City alignment, TypeScript project rules, and validation tooling as a separate layer.

The project-plugin path offers immediate value here. The upstream-contribution path offers the larger ecosystem benefit after the ontology stabilizes and its competency tests demonstrate fewer agent errors.
