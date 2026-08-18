# Architecture and state ownership

## Runtime topology

```mermaid
flowchart LR
  B["Browser: one-screen presentation"] --> A["API + fleet supervisor"]
  A --> T["Temporal development server"]
  A -->|"spawn / exact PGID"| W["Killable Worker fleet"]
  W --> C["Codex SDK / CLI subprocesses"]
  W --> X["Vitest subprocesses"]
  C --> G["Isolated Git workspace"]
  X --> G

  classDef survives fill:#e8e5fb,stroke:#6b55d9,color:#162139;
  classDef killable fill:#ffe8e3,stroke:#ed684e,color:#162139;
  class A,T,B survives;
  class W,C,X killable;
```

The browser, API, supervisor, and Temporal server remain outside the killable group. The supervisor creates a detached Worker group, records its PID/PGID plus an ownership token, validates the target, and signals the negative PGID. Codex and test subprocesses inherit that process group.

## Durable execution tree

```mermaid
flowchart TB
  F["FixWorkflow"] --> P["Activity: plan with main Codex thread"]
  F --> S["Child Workflow: source investigation"]
  F --> Q["Child Workflow: test-contract investigation"]
  F --> R["Activity: reproduce tests"]
  S --> SA["Activity: read-only Codex turn"]
  Q --> QA["Activity: read-only Codex turn"]
  F --> I["Activity: resume main thread and implement"]
  F --> V["Activity: final file-by-file tests"]
  F --> D["Activity: collect Git diff"]

  SA -. "heartbeat thread ID" .-> H["Activity heartbeat details"]
  QA -. "heartbeat thread ID" .-> H
  I -. "heartbeat thread ID" .-> H
  V -. "heartbeat passed filenames" .-> H
```

The main Workflow is deterministic orchestration. Child Workflows give each logical subagent a durable identity and separate history. Activities contain Codex, filesystem, Git, and test-process effects.

## State ledger

| State | Owner | Recovery behavior |
|---|---|---|
| Plan, fan-out, completed steps | Temporal Event History | Replayed into the same logical execution tree |
| Codex conversation context | Local Codex session | Resume by heartbeat thread ID; replace from durable assignment if absent |
| Source edits | Git run workspace | Remain across Worker replacement |
| Passed test filenames | Activity heartbeat details | Retried Activity skips completed files |
| UI while Workers are absent | API’s last successful query | Rendered as a visibly frozen snapshot |
| Worker PID/PGID | Supervisor memory | Validated before targeting the exact detached group |

## Failure semantics

```mermaid
sequenceDiagram
  participant TS as Temporal Server
  participant W1 as Worker 1
  participant E as External effect
  participant W2 as Worker 2

  TS->>W1: Schedule Activity attempt 1
  W1->>E: Start Codex turn or test file
  W1-->>TS: Heartbeat checkpoint
  Note over W1: Process group is killed
  TS->>W2: Retry Activity attempt 2
  W2->>TS: Load heartbeat details
  W2->>E: Resume thread or skip passed file
  W2-->>TS: Record Activity completion
  TS->>W2: Replay Workflow with recorded result
```

If the external effect finished and Activity completion never reached Temporal, attempt 2 can repeat that effect. Application-level idempotency remains required for consequential effects.
