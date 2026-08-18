import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Context } from '@temporalio/activity';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { afterAll, beforeAll, expect, it } from 'vitest';

import { FixtureCodexRunner } from '../src/codex/fixture-runner.js';
import type { CodexRole, CodexRunner } from '../src/codex/types.js';
import { executeFixtureTestFile, runFixtureTests } from '../src/runtime/test-executor.js';
import { createRunWorkspace, fixtureTestFiles, getWorkspaceDiff } from '../src/runtime/workspace.js';
import { createActivities } from '../src/temporal/activities.js';
import type { CodexActivityInput, CodexActivityResult } from '../src/temporal/contracts.js';
import { FixWorkflow } from '../src/temporal/workflows.js';

let environment: TestWorkflowEnvironment;
let temporaryDirectory: string;

beforeAll(async () => {
  environment = await TestWorkflowEnvironment.createLocal();
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'durable-agent-tree-temporal-'));
}, 120_000);

afterAll(async () => {
  await environment?.teardown();
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

it('reuses a completed child and retries only interrupted work on a replacement Worker', async () => {
  const runId = 'temporal-worker-replacement';
  const taskQueue = `test-${runId}`;
  const workspace = await createRunWorkspace(runId, { baseDirectory: temporaryDirectory });
  const calls: Record<CodexRole, number> = {
    planner: 0,
    'source-investigator': 0,
    'test-investigator': 0,
    implementer: 0,
  };
  let sourceFinished!: () => void;
  let interruptedStarted!: () => void;
  const sourceDone = new Promise<void>((resolve) => { sourceFinished = resolve; });
  const interruptionReady = new Promise<void>((resolve) => { interruptedStarted = resolve; });
  const resumedThreadIds: string[] = [];
  const recoveryRunner: CodexRunner = {
    async run(input, hooks = {}) {
      calls[input.role] += 1;
      if (input.role === 'test-investigator' && !input.threadId) {
        hooks.onCheckpoint?.({
          threadId: 'fixture-test-investigator',
          threadTurnNumber: 1,
        });
        interruptedStarted();
        await Context.current().cancelled;
        throw new Error('The cancelled Activity unexpectedly continued');
      }
      if (input.role === 'test-investigator' && input.threadId) {
        resumedThreadIds.push(input.threadId);
      }
      const result = await new FixtureCodexRunner({ delayMs: 0 }).run(input, hooks);
      if (input.role === 'source-investigator') sourceFinished();
      return result;
    },
  };
  const supportActivities = activitySet(successfulCodex);
  const durableCodexActivity = createActivities({ createRunner: () => recoveryRunner }).runCodexTurn;
  const firstActivities = { ...supportActivities, runCodexTurn: durableCodexActivity };

  const workerOne = await Worker.create({
    connection: environment.nativeConnection,
    taskQueue,
    workflowsPath: new URL('../src/temporal/workflows.ts', import.meta.url).pathname,
    activities: firstActivities,
    shutdownGraceTime: '1 second',
  });
  const workerOneRun = workerOne.run();
  const handle = await environment.client.workflow.start(FixWorkflow, {
    workflowId: runId,
    taskQueue,
    args: [{ runId, runnerMode: 'fixture', workspace }],
  });

  await Promise.all([sourceDone, interruptionReady]);
  workerOne.shutdown();
  await workerOneRun;

  const workerTwo = await Worker.create({
    connection: environment.nativeConnection,
    taskQueue,
    workflowsPath: new URL('../src/temporal/workflows.ts', import.meta.url).pathname,
    activities: { ...supportActivities, runCodexTurn: durableCodexActivity },
  });

  const result = await workerTwo.runUntil(handle.result());
  expect(result.phase, result.error).toBe('complete');
  expect(result.diff).toContain('attempt < maxAttempts');
  expect(calls['source-investigator']).toBe(1);
  expect(calls['test-investigator']).toBe(2);
  expect(resumedThreadIds).toEqual(['fixture-test-investigator']);
  expect(result.metrics.retriedCodexTurns).toBeGreaterThanOrEqual(1);
}, 120_000);

it('restores heartbeated test filenames and skips them on a replacement Worker', async () => {
  const runId = 'temporal-test-checkpoint';
  const taskQueue = `test-${runId}`;
  const workspace = await createRunWorkspace(runId, { baseDirectory: temporaryDirectory });
  const executions: string[] = [];
  let checkpointReady!: () => void;
  const checkpointed = new Promise<void>((resolve) => { checkpointReady = resolve; });

  const interruptingTests = async (input: { workspace: string; phase: 'initial' | 'final' }) => {
    const context = Context.current();
    if (input.phase === 'initial') {
      return {
        passed: false,
        completed: 2,
        total: 4,
        output: 'Known retry-limit failure reproduced',
        completedFiles: [...fixtureTestFiles.slice(0, 2)],
        activityAttempt: context.info.attempt,
      };
    }

    const completed = Array.isArray(context.info.heartbeatDetails)
      ? [...context.info.heartbeatDetails as string[]]
      : [];
    for (const filename of fixtureTestFiles) {
      if (completed.includes(filename)) continue;
      executions.push(filename);
      const result = await executeFixtureTestFile(input.workspace, filename);
      if (!result.passed) throw new Error(result.output);
      completed.push(filename);
      context.heartbeat([...completed]);
      if (completed.length === 2 && context.info.attempt === 1) {
        await context.sleep(250);
        checkpointReady();
        await context.cancelled;
      }
    }
    return {
      passed: true,
      completed: completed.length,
      total: fixtureTestFiles.length,
      output: 'All files passed',
      completedFiles: completed,
      activityAttempt: context.info.attempt,
    };
  };

  const workerOne = await Worker.create({
    connection: environment.nativeConnection,
    taskQueue,
    workflowsPath: new URL('../src/temporal/workflows.ts', import.meta.url).pathname,
    activities: activitySet(successfulCodex, interruptingTests),
    shutdownGraceTime: '1 second',
    maxHeartbeatThrottleInterval: '100 milliseconds',
    defaultHeartbeatThrottleInterval: '100 milliseconds',
  });
  const workerOneRun = workerOne.run();
  const handle = await environment.client.workflow.start(FixWorkflow, {
    workflowId: runId,
    taskQueue,
    args: [{ runId, runnerMode: 'fixture', workspace }],
  });

  await checkpointed;
  workerOne.shutdown();
  await workerOneRun;

  const workerTwo = await Worker.create({
    connection: environment.nativeConnection,
    taskQueue,
    workflowsPath: new URL('../src/temporal/workflows.ts', import.meta.url).pathname,
    activities: activitySet(successfulCodex, interruptingTests),
    maxHeartbeatThrottleInterval: '100 milliseconds',
    defaultHeartbeatThrottleInterval: '100 milliseconds',
  });
  const result = await workerTwo.runUntil(handle.result());

  expect(result.phase, result.error).toBe('complete');
  for (const filename of fixtureTestFiles) {
    expect(executions.filter((executed) => executed === filename), filename).toHaveLength(1);
  }
}, 120_000);

function activitySet(
  runCodexTurn: (input: CodexActivityInput) => Promise<CodexActivityResult>,
  runTestsOverride?: (input: { workspace: string; phase: 'initial' | 'final' }) => Promise<{
    passed: boolean;
    completed: number;
    total: number;
    output: string;
    completedFiles: string[];
    activityAttempt: number;
  }>,
) {
  return {
    runCodexTurn,
    runTests: runTestsOverride ?? (async (input: { workspace: string; phase: 'initial' | 'final' }) => {
      const context = Context.current();
      const previous = Array.isArray(context.info.heartbeatDetails)
        ? context.info.heartbeatDetails as string[]
        : [];
      const result = await runFixtureTests(
        input.workspace,
        input.phase,
        previous,
        (completed) => context.heartbeat(completed),
      );
      return {
        ...result,
        completedFiles: result.completedFiles ?? [],
        activityAttempt: context.info.attempt,
      };
    }),
    getDiff: (workspace: string) => getWorkspaceDiff(workspace),
  };
}

async function successfulCodex(input: CodexActivityInput): Promise<CodexActivityResult> {
  const context = Context.current();
  const runner = new FixtureCodexRunner({ delayMs: 0 });
  const result = await runner.run(input, {
    onCheckpoint: ({ threadId, lastItemId }) => context.heartbeat({ threadId, lastItemId }),
  });
  return {
    ...result,
    replacementThread: false,
    activityAttempt: context.info.attempt,
  };
}
