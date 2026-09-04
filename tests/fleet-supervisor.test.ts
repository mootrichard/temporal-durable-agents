import { rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { defaultPayloadConverter } from '@temporalio/common';
import { expect, it } from 'vitest';

import { ensureTemporalReachable } from '../src/runtime/preflight.js';
import { getDemoRoot } from '../src/runtime/workspace.js';
import { applyRunEvent, createInitialSnapshot } from '../src/shared/run-snapshot.js';
import { FleetSupervisor, projectPendingActivity } from '../src/supervisor/fleet-supervisor.js';
import type { CodexHeartbeat } from '../src/temporal/contracts.js';

function pendingActivity(name: string, details: unknown, attempt = 1) {
  return {
    activityType: { name },
    attempt,
    heartbeatDetails: { payloads: [defaultPayloadConverter.toPayload(details)] },
  };
}

it('projects a heartbeated test checkpoint onto the cached snapshot', () => {
  const snapshot = createInitialSnapshot('temporal-run', 'temporal', 'fixture');
  const files = ['tests/retry-success.test.ts', 'tests/retry-eventual-success.test.ts'];

  expect(projectPendingActivity(snapshot, pendingActivity('runTests', files)).metrics.completedTests).toBe(2);
});

it('projects a Child Workflow Codex heartbeat as live node progress and a trace entry', () => {
  const snapshot = createInitialSnapshot('temporal-run', 'temporal', 'fixture');
  const heartbeat: CodexHeartbeat = {
    threadId: 'fixture-source-investigator',
    role: 'source-investigator',
    progress: {
      id: 'source-investigator-thread',
      type: 'thread',
      status: 'running',
      message: 'source-investigator started',
    },
  };

  const projected = projectPendingActivity(snapshot, pendingActivity('runCodexTurn', heartbeat, 2));

  expect(projected.nodes.find(({ id }) => id === 'source-investigator')).toMatchObject({
    status: 'running',
    threadId: 'fixture-source-investigator',
    detail: 'source-investigator started',
    attempt: 2,
  });
  expect(projected.trace).toEqual([{ ...heartbeat.progress, nodeId: 'source-investigator' }]);
});

it('ignores pending activities without heartbeat details', () => {
  const snapshot = createInitialSnapshot('temporal-run', 'temporal', 'fixture');

  expect(projectPendingActivity(snapshot, { activityType: { name: 'runCodexTurn' } })).toBe(snapshot);
});

it('fails fast with an actionable message when Temporal is offline', async () => {
  await expect(ensureTemporalReachable('127.0.0.1:1', 50)).rejects.toThrow(
    'Temporal is offline at 127.0.0.1:1. Start it with npm run temporal:up.',
  );
});

it('marks a completed baseline fleet offline after its process exits', async () => {
  const previousDelay = process.env.FIXTURE_DELAY_MS;
  process.env.FIXTURE_DELAY_MS = '0';
  const supervisor = new FleetSupervisor();
  let runId: string | undefined;

  try {
    let snapshot = await supervisor.start('baseline', 'fixture');
    runId = snapshot.runId;
    const deadline = Date.now() + 10_000;
    while (
      Date.now() < deadline
      && (snapshot.phase !== 'complete' || snapshot.workersOnline)
    ) {
      // This integration boundary can only observe the detached child through supervisor snapshots.
      await delay(25);
      snapshot = await supervisor.snapshot(runId);
    }

    expect(snapshot.phase).toBe('complete');
    expect(snapshot.workersOnline).toBe(false);
    expect(snapshot.frozen).toBe(false);
  } finally {
    await supervisor.close();
    if (runId) {
      await rm(path.join(getDemoRoot(), '.demo-runs', runId), {
        recursive: true,
        force: true,
      });
    }
    if (previousDelay === undefined) delete process.env.FIXTURE_DELAY_MS;
    else process.env.FIXTURE_DELAY_MS = previousDelay;
  }
}, 15_000);
