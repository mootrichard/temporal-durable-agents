import type { CodexRunResult, CodexRunner } from '../codex/types.js';
import {
  implementationPrompt,
  investigationPrompt,
  plannerPrompt,
} from '../codex/prompts.js';
import {
  delegationPlanJsonSchema,
  parseDelegationPlan,
  type SubagentAssignment,
} from '../shared/delegation-plan.js';
import {
  applyRunEvent,
  createInitialSnapshot,
  type RunEvent,
  type RunNode,
  type RunnerMode,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import {
  runFixtureTests,
  type DemoTestResult,
  type TestPhase,
} from '../runtime/test-executor.js';
import { getWorkspaceDiff } from '../runtime/workspace.js';

export type BaselineRunInput = {
  runId: string;
  runnerMode: RunnerMode;
  workspace: string;
};

export type BaselineDependencies = {
  codex: CodexRunner;
  runTests?: (workspace: string, phase: TestPhase) => Promise<DemoTestResult>;
};

export class BaselineOrchestrator {
  private readonly codex: CodexRunner;
  private readonly runTests: NonNullable<BaselineDependencies['runTests']>;

  constructor(dependencies: BaselineDependencies) {
    this.codex = dependencies.codex;
    this.runTests = dependencies.runTests ?? runFixtureTests;
  }

  async run(
    input: BaselineRunInput,
    onSnapshot: (snapshot: RunSnapshot) => void = () => undefined,
  ): Promise<RunSnapshot> {
    let snapshot = createInitialSnapshot(input.runId, 'baseline', input.runnerMode);
    const emit = (event: RunEvent): RunSnapshot => {
      snapshot = applyRunEvent(snapshot, event);
      onSnapshot(structuredClone(snapshot));
      return snapshot;
    };
    onSnapshot(structuredClone(snapshot));

    try {
      emit({ type: 'phase', phase: 'planning' });
      emit({ type: 'node', id: 'coordinator', status: 'running', attempt: 1 });
      const planTurn = await this.codex.run(
        {
          role: 'planner',
          prompt: plannerPrompt,
          workspace: input.workspace,
          sandboxMode: 'read-only',
          outputSchema: delegationPlanJsonSchema,
        },
        {
          onCheckpoint: ({ threadId }) =>
            emit({ type: 'node', id: 'coordinator', status: 'running', threadId }),
        },
      );
      recordCodexCompletion(emit, planTurn);
      const plan = parseDelegationPlan(JSON.parse(planTurn.finalResponse));

      emit({ type: 'phase', phase: 'investigating' });
      const sourceAssignment = assignmentFor(plan.assignments, 'source');
      const testAssignment = assignmentFor(plan.assignments, 'tests');

      const [sourceTurn, testTurn, initialTests] = await Promise.all([
        this.runInvestigation(input, sourceAssignment, 'source-investigator', emit),
        this.runInvestigation(input, testAssignment, 'test-investigator', emit),
        this.runInitialTests(input.workspace, emit),
      ]);

      emit({ type: 'phase', phase: 'implementing' });
      emit({
        type: 'node',
        id: 'coordinator',
        status: 'running',
        detail: 'Applying the minimal fix from both investigations',
        attempt: 1,
      });
      const implementation = await this.codex.run(
        {
          role: 'implementer',
          prompt: implementationPrompt(
            plan,
            { source: sourceTurn.finalResponse, tests: testTurn.finalResponse },
            initialTests.output,
          ),
          workspace: input.workspace,
          sandboxMode: 'workspace-write',
          threadId: planTurn.threadId,
        },
        {
          onCheckpoint: ({ threadId }) =>
            emit({
              type: 'node',
              id: 'coordinator',
              status: 'running',
              threadId,
            }),
        },
      );
      recordCodexCompletion(emit, implementation);

      emit({ type: 'phase', phase: 'testing' });
      emit({ type: 'node', id: 'test-job', status: 'running', detail: 'Final verification' });
      const finalTests = await this.runTests(input.workspace, 'final');
      emit({ type: 'test-progress', completed: finalTests.completed, total: finalTests.total });
      if (!finalTests.passed) {
        throw new Error(`The final fixture tests failed:\n${finalTests.output}`);
      }
      emit({ type: 'node', id: 'test-job', status: 'complete', detail: '4 of 4 passed' });
      emit({ type: 'node', id: 'coordinator', status: 'complete', detail: implementation.finalResponse });
      const diff = await getWorkspaceDiff(input.workspace);
      return emit({
        type: 'complete',
        summary: 'The one-line retry fix is verified by all four tests.',
        diff,
      });
    } catch (error) {
      return emit({ type: 'failed', error: errorMessage(error) });
    }
  }

  private async runInvestigation(
    input: BaselineRunInput,
    assignment: SubagentAssignment,
    nodeId: Extract<RunNode['id'], 'source-investigator' | 'test-investigator'>,
    emit: (event: RunEvent) => RunSnapshot,
  ): Promise<CodexRunResult> {
    emit({ type: 'node', id: nodeId, status: 'running', detail: assignment.title, attempt: 1 });
    const result = await this.codex.run(
      {
        role: nodeId,
        prompt: investigationPrompt(assignment.prompt),
        workspace: input.workspace,
        sandboxMode: 'read-only',
      },
      {
        onCheckpoint: ({ threadId }) =>
          emit({ type: 'node', id: nodeId, status: 'running', threadId }),
      },
    );
    recordCodexCompletion(emit, result);
    emit({ type: 'node', id: nodeId, status: 'complete', detail: result.finalResponse });
    return result;
  }

  private async runInitialTests(
    workspace: string,
    emit: (event: RunEvent) => RunSnapshot,
  ): Promise<DemoTestResult> {
    emit({ type: 'node', id: 'test-job', status: 'running', detail: 'Reproducing the bug', attempt: 1 });
    const result = await this.runTests(workspace, 'initial');
    emit({ type: 'test-progress', completed: result.completed, total: result.total });
    emit({
      type: 'node',
      id: 'test-job',
      status: 'complete',
      detail: result.passed ? 'Unexpectedly passed' : 'Bug reproduced',
    });
    return result;
  }
}

function assignmentFor(
  assignments: SubagentAssignment[],
  focus: SubagentAssignment['focus'],
): SubagentAssignment {
  const assignment = assignments.find((candidate) => candidate.focus === focus);
  if (!assignment) throw new Error(`The delegation plan omitted the ${focus} investigation`);
  return assignment;
}

function recordCodexCompletion(
  emit: (event: RunEvent) => RunSnapshot,
  result: CodexRunResult,
): void {
  emit({
    type: 'codex-complete',
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
