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
  delegationPlanJsonSchema,
  parseDelegationPlan,
  type SubagentAssignment,
} from '../shared/delegation-plan.js';
import {
  applyRunEvent,
  createInitialSnapshot,
  type RunEvent,
  type RunNode,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import type { createActivities } from './activities.js';
import type {
  FixWorkflowInput,
  SubagentWorkflowInput,
  SubagentWorkflowResult,
  TemporalWorkflowResult,
} from './contracts.js';

const activities = proxyActivities<ReturnType<typeof createActivities>>({
  startToCloseTimeout: '10 minutes',
  heartbeatTimeout: '20 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '10 seconds', maximumAttempts: 5 },
});

export const snapshotQuery = defineQuery<RunSnapshot>('snapshot');

export async function FixWorkflow(input: FixWorkflowInput): Promise<TemporalWorkflowResult> {
  let snapshot = createInitialSnapshot(input.runId, 'temporal', input.runnerMode);
  const emit = (event: RunEvent): RunSnapshot => {
    snapshot = applyRunEvent(snapshot, event);
    return snapshot;
  };
  setHandler(snapshotQuery, () => snapshot);

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
    const source = assignmentFor(plan.assignments, 'source');
    const tests = assignmentFor(plan.assignments, 'tests');

    emit({ type: 'phase', phase: 'investigating' });
    emit({
      type: 'node',
      id: 'coordinator',
      status: 'waiting',
      detail: 'Delegation plan ready. Waiting for investigations and reproduction.',
    });
    markInvestigationStarted(emit, source);
    markInvestigationStarted(emit, tests);
    emit({ type: 'node', id: 'test-job', status: 'running', detail: 'Reproducing the bug', attempt: 1 });

    const sourcePromise = executeChild(SubagentWorkflow, {
      workflowId: `${input.runId}-source-investigator`,
      args: [{ ...input, assignment: source }],
      parentClosePolicy: ParentClosePolicy.REQUEST_CANCEL,
    }).then((result) => {
      completeInvestigation(emit, result);
      recordCodex(emit, result.codex, nodeFor(result.assignment));
      return result;
    });
    const testPromise = executeChild(SubagentWorkflow, {
      workflowId: `${input.runId}-test-investigator`,
      args: [{ ...input, assignment: tests }],
      parentClosePolicy: ParentClosePolicy.REQUEST_CANCEL,
    }).then((result) => {
      completeInvestigation(emit, result);
      recordCodex(emit, result.codex, nodeFor(result.assignment));
      return result;
    });
    const initialTestsPromise = activities.runTests({ workspace: input.workspace, phase: 'initial' })
      .then((result) => {
        emit({ type: 'test-progress', completed: result.completed, total: result.total });
        emit({ type: 'node', id: 'test-job', status: 'complete', detail: 'Bug reproduced' });
        return result;
      });

    const [sourceResult, testResult, initialTests] = await Promise.all([
      sourcePromise,
      testPromise,
      initialTestsPromise,
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
    return emit({ type: 'failed', error: error instanceof Error ? error.message : String(error) });
  }
}

export async function SubagentWorkflow(
  input: SubagentWorkflowInput,
): Promise<SubagentWorkflowResult> {
  const role = input.assignment.focus === 'source' ? 'source-investigator' : 'test-investigator';
  const codex = await activities.runCodexTurn({
    role,
    prompt: investigationPrompt(input.assignment.prompt),
    workspace: input.workspace,
    sandboxMode: 'read-only',
    runnerMode: input.runnerMode,
  });
  return { assignment: input.assignment, codex };
}

function nodeFor(assignment: SubagentAssignment): Extract<
  RunNode['id'],
  'source-investigator' | 'test-investigator'
> {
  return assignment.focus === 'source' ? 'source-investigator' : 'test-investigator';
}

function markInvestigationStarted(
  emit: (event: RunEvent) => RunSnapshot,
  assignment: SubagentAssignment,
): void {
  emit({ type: 'node', id: nodeFor(assignment), status: 'running', detail: assignment.title, attempt: 1 });
}

function completeInvestigation(
  emit: (event: RunEvent) => RunSnapshot,
  result: SubagentWorkflowResult,
): void {
  emit({
    type: 'node',
    id: nodeFor(result.assignment),
    status: 'complete',
    detail: result.codex.finalResponse,
    threadId: result.codex.threadId,
    attempt: result.codex.activityAttempt,
  });
}

function assignmentFor(
  assignments: SubagentAssignment[],
  focus: SubagentAssignment['focus'],
): SubagentAssignment {
  const assignment = assignments.find((candidate) => candidate.focus === focus);
  if (!assignment) throw new Error(`The delegation plan omitted the ${focus} investigation`);
  return assignment;
}

function recordCodex(
  emit: (event: RunEvent) => RunSnapshot,
  result: import('./contracts.js').CodexActivityResult,
  nodeId: RunNode['id'],
): void {
  for (const progress of result.trace) {
    emit({
      type: 'trace',
      entry: {
        id: `${nodeId}-${progress.id}`,
        nodeId,
        kind: progress.type === 'item' ? 'tool' : progress.type,
        status: progress.status,
        message: progress.message,
      },
    });
  }
  for (let retry = 1; retry < result.activityAttempt; retry += 1) emit({ type: 'codex-retry' });
  emit({ type: 'codex-complete', ...result.usage });
}
