import type { CodexProgressEvent, CodexRole, CodexSandboxMode } from '../codex/types.js';
import type { InvestigatorId, SubagentAssignment } from '../shared/delegation-plan.js';
import type { RunnerMode, RunSnapshot } from '../shared/run-snapshot.js';

export const investigators: readonly InvestigatorId[] = ['source-investigator', 'test-investigator'];

export function temporalTaskQueue(runId: string): string {
  return `durable-agent-tree-${runId}`;
}

/** Child Workflow ID for one investigator; the parent Workflow ID is the run ID itself. */
export function childWorkflowId(runId: string, investigator: InvestigatorId): string {
  return `${runId}-${investigator}`;
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
  activityAttempt: number;
  trace: CodexProgressEvent[];
  usage: { inputTokens: number; outputTokens: number };
};

/** Heartbeat details for `runCodexTurn`; a retry resumes `threadId`, the supervisor projects `progress`. */
export type CodexHeartbeat = {
  role: CodexRole;
  threadId?: string;
  progress?: CodexProgressEvent;
};

export type SubagentWorkflowInput = FixWorkflowInput & { assignment: SubagentAssignment };

export type SubagentWorkflowResult = {
  assignment: SubagentAssignment;
  codex: CodexActivityResult;
};

export type TestActivityInput = {
  workspace: string;
  /** Recorded in Event History so the two test runs are distinguishable when reading the Workflow. */
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

export type Activities = {
  runCodexTurn(input: CodexActivityInput): Promise<CodexActivityResult>;
  runTests(input: TestActivityInput): Promise<TestActivityResult>;
  getDiff(workspace: string): Promise<string>;
};

export type TemporalWorkflowResult = RunSnapshot;
