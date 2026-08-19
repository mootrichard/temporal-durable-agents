import { expect, it } from 'vitest';

import {
  decodeCodexHeartbeat,
  decodeHeartbeatStringArray,
  ensureTemporalReachable,
  shouldProjectTemporalProgress,
  temporalProgressWorkflowIds,
} from '../src/supervisor/fleet-supervisor.js';
import { applyRunEvent, createInitialSnapshot } from '../src/shared/run-snapshot.js';

it('decodes Temporal default JSON heartbeat payloads for test checkpoints', () => {
  const data = new TextEncoder().encode(
    JSON.stringify(['tests/retry-success.test.ts', 'tests/retry-eventual-success.test.ts']),
  );
  expect(decodeHeartbeatStringArray({ payloads: [{ data }] })).toEqual([
    'tests/retry-success.test.ts',
    'tests/retry-eventual-success.test.ts',
  ]);
});

it('ignores heartbeat payloads that are not filename arrays', () => {
  const data = new TextEncoder().encode(JSON.stringify({ threadId: 'codex-thread' }));
  expect(decodeHeartbeatStringArray({ payloads: [{ data }] })).toBeUndefined();
});

it('fails fast with an actionable message when Temporal is offline', async () => {
  await expect(ensureTemporalReachable('127.0.0.1:1', 50)).rejects.toThrow(
    'Temporal is offline at 127.0.0.1:1. Start it with npm run temporal:up.',
  );
});

it('inspects the parent and both Child Workflows for live progress', () => {
  expect(temporalProgressWorkflowIds('temporal-run')).toEqual([
    'temporal-run',
    'temporal-run-source-investigator',
    'temporal-run-test-investigator',
  ]);
});

it('decodes a Child Workflow Codex heartbeat', () => {
  const heartbeat = {
    threadId: 'fixture-source-investigator',
    role: 'source-investigator',
    progress: {
      id: 'source-investigator-thread',
      type: 'thread',
      status: 'running',
      message: 'source-investigator started',
    },
  };
  const data = new TextEncoder().encode(JSON.stringify(heartbeat));

  expect(decodeCodexHeartbeat({ payloads: [{ data }] })).toEqual(heartbeat);
});

it('does not let pending Activity heartbeats overwrite a terminal run', () => {
  const running = createInitialSnapshot('temporal-run', 'temporal', 'live');
  const failed = applyRunEvent(running, { type: 'failed', error: 'Activity failed' });

  expect(shouldProjectTemporalProgress(running)).toBe(true);
  expect(shouldProjectTemporalProgress(failed)).toBe(false);
});
