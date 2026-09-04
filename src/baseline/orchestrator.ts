import type { CodexRunRequest, CodexRunResult, CodexRunner } from '../codex/types.js';
import {
  implementationPrompt,
  investigationPrompt,
  plannerPrompt,
} from '../codex/prompts.js';
import {
  assignmentFor,
  delegationPlanJsonSchema,
  investigatorFor,
  parseDelegationPlan,
  type SubagentAssignment,
} from '../shared/delegation-plan.js';
import {
  applyRunEvent,
  createInitialSnapshot,
  traceEvent,
  type NodeId,
  type RunEvent,
  type RunnerMode,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import { runFixtureTests, type DemoTestResult } from '../runtime/test-executor.js';
import { getWorkspaceDiff } from '../runtime/workspace.js';

export type BaselineRunInput = {
  runId: string;
  runnerMode: RunnerMode;
  workspace: string;
};

export type RunTests = (workspace: string) => Promise<DemoTestResult>;

/** The baseline process publishes every snapshot as one stdout line under this prefix. */
export const snapshotLinePrefix = 'DEMO_SNAPSHOT ';

/**
 * The process-owned coordinator. It mirrors FixWorkflow step for step, but every piece of
 * state below lives only in this process's memory.
 */
export class BaselineOrchestrator {
  constructor(
    private readonly codex: CodexRunner,
    private readonly runTests: RunTests = (workspace) => runFixtureTests(workspace),
  ) {}

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

    const runCodex = (nodeId: NodeId, request: Omit<CodexRunRequest, 'workspace'>): Promise<CodexRunResult> =>
      this.codex.run({ ...request, workspace: input.workspace }, {
        onThread: (threadId) => emit({ type: 'node', id: nodeId, status: 'running', threadId }),
        onProgress: (progress) => {
          emit({ type: 'node', id: nodeId, status: 'running', detail: progress.message });
          emit(traceEvent(nodeId, progress));
        },
      }).then((result) => {
        emit({ type: 'codex-complete', ...result.usage });
        return result;
      });

    const investigate = async (assignment: SubagentAssignment): Promise<CodexRunResult> => {
      const nodeId = investigatorFor[assignment.focus];
      emit({ type: 'node', id: nodeId, status: 'running', detail: assignment.title, attempt: 1 });
      const result = await runCodex(nodeId, {
        role: nodeId,
        prompt: investigationPrompt(assignment.prompt),
        sandboxMode: 'read-only',
      });
      emit({ type: 'node', id: nodeId, status: 'complete', detail: result.finalResponse });
      return result;
    };

    try {
      emit({ type: 'phase', phase: 'planning' });
      emit({ type: 'node', id: 'coordinator', status: 'running', attempt: 1 });
      const planTurn = await runCodex('coordinator', {
        role: 'planner',
        prompt: plannerPrompt,
        sandboxMode: 'read-only',
        outputSchema: delegationPlanJsonSchema,
      });
      const plan = parseDelegationPlan(JSON.parse(planTurn.finalResponse));

      emit({ type: 'phase', phase: 'investigating' });
      emit({
        type: 'node',
        id: 'coordinator',
        status: 'waiting',
        detail: 'Delegation plan ready. Waiting for investigations and reproduction.',
      });
      emit({ type: 'node', id: 'test-job', status: 'running', detail: 'Reproducing the bug', attempt: 1 });
      const [sourceTurn, testTurn, initialTests] = await Promise.all([
        investigate(assignmentFor(plan, 'source')),
        investigate(assignmentFor(plan, 'tests')),
        this.runTests(input.workspace).then((result) => {
          emit({ type: 'test-progress', completed: result.completed, total: result.total });
          emit({
            type: 'node',
            id: 'test-job',
            status: 'complete',
            detail: result.passed ? 'Unexpectedly passed' : 'Bug reproduced',
          });
          return result;
        }),
      ]);

      emit({ type: 'phase', phase: 'implementing' });
      emit({
        type: 'node',
        id: 'coordinator',
        status: 'running',
        detail: 'Applying the minimal fix from both investigations',
        attempt: 1,
      });
      const implementation = await runCodex('coordinator', {
        role: 'implementer',
        prompt: implementationPrompt(
          plan,
          { source: sourceTurn.finalResponse, tests: testTurn.finalResponse },
          initialTests.output,
        ),
        sandboxMode: 'workspace-write',
        threadId: planTurn.threadId,
      });

      emit({ type: 'phase', phase: 'testing' });
      emit({ type: 'node', id: 'test-job', status: 'running', detail: 'Final verification' });
      const finalTests = await this.runTests(input.workspace);
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
      return emit({ type: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }
}
