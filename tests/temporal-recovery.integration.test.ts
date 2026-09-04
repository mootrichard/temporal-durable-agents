import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Context } from '@temporalio/activity';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { afterAll, beforeAll, expect, it } from 'vitest';

import { FixtureCodexRunner } from '../src/codex/fixture-runner.js';
import type { CodexRole, CodexRunner } from '../src/codex/types.js';
import { executeFixtureTestFile } from '../src/runtime/test-executor.js';
import { createRunWorkspace, fixtureTestFiles } from '../src/runtime/workspace.js';
import type { RunSnapshot } from '../src/shared/run-snapshot.js';
import { createActivities } from '../src/temporal/activities.js';
import type { Activities, CodexActivityResult, TestActivityInput } from '../src/temporal/contracts.js';
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
        hooks.onThread?.('fixture-test-investigator');
        interruptedStarted();
        await Context.current().cancelled;
        throw new Error('The cancelled Activity unexpectedly continued');
      }
      if (input.role === 'test-investigator' && input.threadId) {
        resumedThreadIds.push(input.threadId);
      }
      const result = await new FixtureCodexRunner(0).run(input, hooks);
      if (input.role === 'source-investigator') sourceFinished();
      return result;
    },
  };
  const firstActivities = activitySet({ runCodexTurn: createActivities(() => recoveryRunner).runCodexTurn });

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
  const inFlight = await waitForSnapshot(
    handle,
    (snapshot) =>
      snapshot.nodes.find(({ id }) => id === 'source-investigator')?.status === 'complete'
      && snapshot.nodes.find(({ id }) => id === 'test-investigator')?.status === 'running',
  );
  expect(inFlight.nodes.find(({ id }) => id === 'source-investigator')?.status).toBe('complete');
  expect(inFlight.nodes.find(({ id }) => id === 'test-investigator')?.status).toBe('running');
  expect(inFlight.nodes.find(({ id }) => id === 'coordinator')?.status).toBe('waiting');
  workerOne.shutdown();
  await workerOneRun;

  const workerTwo = await Worker.create({
    connection: environment.nativeConnection,
    taskQueue,
    workflowsPath: new URL('../src/temporal/workflows.ts', import.meta.url).pathname,
    activities: firstActivities,
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

  const interruptingTests = async (input: TestActivityInput) => {
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
    activities: activitySet({ runTests: interruptingTests }),
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
    activities: activitySet({ runTests: interruptingTests }),
    maxHeartbeatThrottleInterval: '100 milliseconds',
    defaultHeartbeatThrottleInterval: '100 milliseconds',
  });
  const result = await workerTwo.runUntil(handle.result());

  expect(result.phase, result.error).toBe('complete');
  for (const filename of fixtureTestFiles) {
    expect(executions.filter((executed) => executed === filename), filename).toHaveLength(1);
  }
}, 120_000);

it('reports retries when a Codex Activity exhausts its retry policy', async () => {
  const runId = 'temporal-codex-exhausted';
  const taskQueue = `test-${runId}`;
  const workspace = await createRunWorkspace(runId, { baseDirectory: temporaryDirectory });
  let attempts = 0;
  const alwaysFailingCodex = async (): Promise<CodexActivityResult> => {
    attempts += 1;
    throw new Error('Codex unavailable');
  };
  const worker = await Worker.create({
    connection: environment.nativeConnection,
    taskQueue,
    workflowsPath: new URL('../src/temporal/workflows.ts', import.meta.url).pathname,
    activities: activitySet({ runCodexTurn: alwaysFailingCodex }),
  });
  const handle = await environment.client.workflow.start(FixWorkflow, {
    workflowId: runId,
    taskQueue,
    args: [{ runId, runnerMode: 'fixture', workspace }],
  });

  const result = await worker.runUntil(handle.result());

  expect(result.phase).toBe('failed');
  expect(attempts).toBe(5);
  expect(result.metrics.retriedCodexTurns).toBe(4);
}, 30_000);

/** The fixture Activities with any overrides a scenario needs. */
function activitySet(overrides: Partial<Activities>): Activities {
  return { ...createActivities(() => new FixtureCodexRunner(0)), ...overrides };
}

async function waitForSnapshot(
  handle: { query<T>(query: string): Promise<T> },
  predicate: (snapshot: RunSnapshot) => boolean,
): Promise<RunSnapshot> {
  const deadline = Date.now() + 3_000;
  let snapshot!: RunSnapshot;
  while (Date.now() < deadline) {
    snapshot = await handle.query('snapshot');
    if (predicate(snapshot)) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return snapshot;
}
