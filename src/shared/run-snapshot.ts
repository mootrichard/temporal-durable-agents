export type DemoMode = 'baseline' | 'temporal';
export type RunnerMode = 'live' | 'fixture';
export type RunPhase =
  | 'idle'
  | 'planning'
  | 'investigating'
  | 'implementing'
  | 'testing'
  | 'complete'
  | 'failed'
  | 'interrupted';
export type NodeStatus =
  | 'waiting'
  | 'running'
  | 'complete'
  | 'failed'
  | 'interrupted';

export type RunNode = {
  id: 'coordinator' | 'source-investigator' | 'test-investigator' | 'test-job';
  label: string;
  kind: 'coordinator' | 'subagent' | 'job';
  status: NodeStatus;
  detail?: string;
  threadId?: string;
  attempt: number;
};

export type RunMetrics = {
  completedCodexTurns: number;
  retriedCodexTurns: number;
  completedTests: number;
  totalTests: number;
  inputTokens: number;
  outputTokens: number;
};

export type RunTraceEntry = {
  id: string;
  nodeId: RunNode['id'] | 'system';
  kind: 'status' | 'thread' | 'reasoning' | 'tool' | 'message' | 'error';
  status: 'running' | 'complete' | 'failed';
  message: string;
};

export type RunSnapshot = {
  runId: string;
  mode: DemoMode;
  runnerMode: RunnerMode;
  phase: RunPhase;
  workersOnline: boolean;
  frozen: boolean;
  sequence: number;
  nodes: RunNode[];
  trace: RunTraceEntry[];
  metrics: RunMetrics;
  summary?: string;
  diff?: string;
  error?: string;
};

export type RunEvent =
  | { type: 'phase'; phase: RunPhase }
  | {
      type: 'node';
      id: RunNode['id'];
      status: NodeStatus;
      detail?: string;
      threadId?: string;
      attempt?: number;
    }
  | { type: 'workers'; online: boolean }
  | { type: 'codex-retry' }
  | { type: 'codex-complete'; inputTokens: number; outputTokens: number }
  | { type: 'test-progress'; completed: number; total: number }
  | { type: 'trace'; entry: RunTraceEntry }
  | { type: 'complete'; summary: string; diff: string }
  | { type: 'failed'; error: string }
  | { type: 'interrupted'; error: string };

export function createInitialSnapshot(
  runId: string,
  mode: DemoMode,
  runnerMode: RunnerMode,
): RunSnapshot {
  return {
    runId,
    mode,
    runnerMode,
    phase: 'idle',
    workersOnline: true,
    frozen: false,
    sequence: 0,
    nodes: [
      {
        id: 'coordinator',
        label: 'Main coding agent',
        kind: 'coordinator',
        status: 'waiting',
        attempt: 0,
      },
      {
        id: 'source-investigator',
        label: 'Inspect implementation',
        kind: 'subagent',
        status: 'waiting',
        attempt: 0,
      },
      {
        id: 'test-investigator',
        label: 'Inspect test contract',
        kind: 'subagent',
        status: 'waiting',
        attempt: 0,
      },
      {
        id: 'test-job',
        label: 'Run test suite',
        kind: 'job',
        status: 'waiting',
        attempt: 0,
      },
    ],
    trace: [],
    metrics: {
      completedCodexTurns: 0,
      retriedCodexTurns: 0,
      completedTests: 0,
      totalTests: 4,
      inputTokens: 0,
      outputTokens: 0,
    },
  };
}

export function applyRunEvent(snapshot: RunSnapshot, event: RunEvent): RunSnapshot {
  const next: RunSnapshot = {
    ...snapshot,
    sequence: snapshot.sequence + 1,
    nodes: snapshot.nodes.map((node) => ({ ...node })),
    metrics: { ...snapshot.metrics },
  };

  switch (event.type) {
    case 'phase':
      next.phase = event.phase;
      break;
    case 'node': {
      const node = next.nodes.find(({ id }) => id === event.id);
      if (node) {
        node.status = event.status;
        if (event.detail !== undefined) node.detail = event.detail;
        if (event.threadId !== undefined) node.threadId = event.threadId;
        if (event.attempt !== undefined) node.attempt = event.attempt;
      }
      break;
    }
    case 'workers':
      next.workersOnline = event.online;
      next.frozen = !event.online;
      break;
    case 'codex-retry':
      next.metrics.retriedCodexTurns += 1;
      break;
    case 'codex-complete':
      next.metrics.completedCodexTurns += 1;
      next.metrics.inputTokens += event.inputTokens;
      next.metrics.outputTokens += event.outputTokens;
      break;
    case 'test-progress':
      next.metrics.completedTests = event.completed;
      next.metrics.totalTests = event.total;
      break;
    case 'trace': {
      const existing = next.trace.findIndex(({ id }) => id === event.entry.id);
      next.trace = existing === -1
        ? [...next.trace, event.entry].slice(-24)
        : next.trace.map((entry, index) => index === existing ? event.entry : entry);
      break;
    }
    case 'complete':
      next.phase = 'complete';
      next.summary = event.summary;
      next.diff = event.diff;
      break;
    case 'failed':
      next.phase = 'failed';
      next.error = event.error;
      next.nodes = next.nodes.map((node) =>
        node.status === 'complete' ? node : { ...node, status: 'failed' },
      );
      break;
    case 'interrupted':
      next.phase = 'interrupted';
      next.error = event.error;
      next.nodes = next.nodes.map((node) =>
        node.status === 'running' ? { ...node, status: 'interrupted' } : node,
      );
      break;
  }

  return next;
}
