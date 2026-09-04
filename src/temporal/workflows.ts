import { ActivityFailure, RetryState } from '@temporalio/common';
import {
  defineQuery,
  executeChild,
  ParentClosePolicy,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';

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
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import {
  childWorkflowId,
  type Activities,
  type CodexActivityResult,
  type FixWorkflowInput,
  type SubagentWorkflowInput,
  type SubagentWorkflowResult,
  type TemporalWorkflowResult,
} from './contracts.js';

const maximumActivityAttempts = 5;

const activities = proxyActivities<Activities>({
  startToCloseTimeout: '10 minutes',
  heartbeatTimeout: '20 seconds',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '10 seconds',
    maximumAttempts: maximumActivityAttempts,
  },
});

export const snapshotQuery = defineQuery<RunSnapshot>('snapshot');

export async function FixWorkflow(input: FixWorkflowInput): Promise<TemporalWorkflowResult> {
  let snapshot = createInitialSnapshot(input.runId, 'temporal', input.runnerMode);
  const emit = (event: RunEvent): RunSnapshot => {
    snapshot = applyRunEvent(snapshot, event);
    return snapshot;
  };
  setHandler(snapshotQuery, () => snapshot);

  const investigate = async (assignment: SubagentAssignment): Promise<SubagentWorkflowResult> => {
    const nodeId = investigatorFor[assignment.focus];
    emit({ type: 'node', id: nodeId, status: 'running', detail: assignment.title, attempt: 1 });
    const result = await executeChild(SubagentWorkflow, {
      workflowId: childWorkflowId(input.runId, nodeId),
      args: [{ ...input, assignment }],
      parentClosePolicy: ParentClosePolicy.REQUEST_CANCEL,
    });
    emit({
      type: 'node',
      id: nodeId,
      status: 'complete',
      detail: result.codex.finalResponse,
      threadId: result.codex.threadId,
      attempt: result.codex.activityAttempt,
    });
    recordCodex(emit, result.codex, nodeId);
    return result;
  };

  try {
    emit({ type: 'phase', phase: 'planning' });
    emit({ type: 'node', id: 'coordinator', status: 'running', attempt: 1 });
    const planTurn = await activities.runCodexTurn({
      role: 'planner',
      prompt: plannerPrompt,
      workspace: input.workspace,
      sandboxMode: 'read-only',
      runnerMode: input.runnerMode,
      outputSchema: delegationPlanJsonSchema,
    });
    recordCodex(emit, planTurn, 'coordinator');
    emit({
      type: 'node',
      id: 'coordinator',
      status: 'running',
      threadId: planTurn.threadId,
      attempt: planTurn.activityAttempt,
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
    const [sourceResult, testResult, initialTests] = await Promise.all([
      investigate(assignmentFor(plan, 'source')),
      investigate(assignmentFor(plan, 'tests')),
      activities.runTests({ workspace: input.workspace, phase: 'initial' }).then((result) => {
        emit({ type: 'test-progress', completed: result.completed, total: result.total });
        emit({ type: 'node', id: 'test-job', status: 'complete', detail: 'Bug reproduced' });
        return result;
      }),
    ]);

    emit({ type: 'phase', phase: 'implementing' });
    emit({ type: 'node', id: 'coordinator', status: 'running', detail: 'Applying the minimal fix' });
    const implementation = await activities.runCodexTurn({
      role: 'implementer',
      prompt: implementationPrompt(
        plan,
        {
          source: sourceResult.codex.finalResponse,
          tests: testResult.codex.finalResponse,
        },
        initialTests.output,
      ),
      workspace: input.workspace,
      sandboxMode: 'workspace-write',
      runnerMode: input.runnerMode,
      threadId: planTurn.threadId,
    });
    recordCodex(emit, implementation, 'coordinator');
    emit({
      type: 'node',
      id: 'coordinator',
      status: 'running',
      threadId: implementation.threadId,
      attempt: implementation.activityAttempt,
      detail: implementation.finalResponse,
    });

    emit({ type: 'phase', phase: 'testing' });
    emit({ type: 'node', id: 'test-job', status: 'running', detail: 'Final verification' });
    const finalTests = await activities.runTests({ workspace: input.workspace, phase: 'final' });
    emit({ type: 'test-progress', completed: finalTests.completed, total: finalTests.total });
    if (!finalTests.passed) throw new Error(`The final fixture tests failed:\n${finalTests.output}`);

    emit({ type: 'node', id: 'test-job', status: 'complete', detail: '4 of 4 passed' });
    emit({ type: 'node', id: 'coordinator', status: 'complete', detail: implementation.finalResponse });
    const diff = await activities.getDiff(input.workspace);
    return emit({
      type: 'complete',
      summary: 'The durable execution tree recovered and verified the one-line retry fix.',
      diff,
    });
  } catch (error) {
    recordExhaustedCodexRetries(emit, error);
    return emit({ type: 'failed', error: error instanceof Error ? error.message : String(error) });
  }
}

export async function SubagentWorkflow(
  input: SubagentWorkflowInput,
): Promise<SubagentWorkflowResult> {
  const codex = await activities.runCodexTurn({
    role: investigatorFor[input.assignment.focus],
    prompt: investigationPrompt(input.assignment.prompt),
    workspace: input.workspace,
    sandboxMode: 'read-only',
    runnerMode: input.runnerMode,
  });
  return { assignment: input.assignment, codex };
}

function recordCodex(
  emit: (event: RunEvent) => RunSnapshot,
  result: CodexActivityResult,
  nodeId: NodeId,
): void {
  for (const progress of result.trace) emit(traceEvent(nodeId, progress));
  for (let retry = 1; retry < result.activityAttempt; retry += 1) emit({ type: 'codex-retry' });
  emit({ type: 'codex-complete', ...result.usage });
}

/** A Codex Activity that exhausted its retry policy never returns, so its retries are counted here. */
function recordExhaustedCodexRetries(
  emit: (event: RunEvent) => RunSnapshot,
  error: unknown,
): void {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if (
      cause instanceof ActivityFailure
      && cause.activityType === 'runCodexTurn'
      && cause.retryState === RetryState.MAXIMUM_ATTEMPTS_REACHED
    ) {
      for (let retry = 1; retry < maximumActivityAttempts; retry += 1) emit({ type: 'codex-retry' });
      return;
    }
  }
}
