import type { CodexRole, CodexSandboxMode } from '../codex/types.js';
import type { SubagentAssignment } from '../shared/delegation-plan.js';
import type { RunnerMode, RunSnapshot } from '../shared/run-snapshot.js';

export function temporalTaskQueue(runId: string): string {
  return `durable-agent-tree-${runId}`;
}

export type FixWorkflowInput = {
  runId: string;
  runnerMode: RunnerMode;
  workspace: string;
};

export type CodexActivityInput = {
  role: CodexRole;
  prompt: string;
  workspace: string;
  sandboxMode: CodexSandboxMode;
  runnerMode: RunnerMode;
  threadId?: string;
  outputSchema?: unknown;
};

export type CodexActivityResult = {
  threadId: string;
  finalResponse: string;
  resumed: boolean;
  replacementThread: boolean;
  activityAttempt: number;
  usage: { inputTokens: number; outputTokens: number };
};

export type CodexHeartbeat = {
  threadId: string;
  lastItemId?: string;
};

export type SubagentWorkflowInput = {
  runId: string;
  runnerMode: RunnerMode;
  workspace: string;
  assignment: SubagentAssignment;
};

export type SubagentWorkflowResult = {
  assignment: SubagentAssignment;
  codex: CodexActivityResult;
};

export type TestActivityInput = {
  workspace: string;
  phase: 'initial' | 'final';
};

export type TestActivityResult = {
  passed: boolean;
  completed: number;
  total: number;
  output: string;
  completedFiles: string[];
  activityAttempt: number;
};

export type TemporalWorkflowResult = RunSnapshot;
