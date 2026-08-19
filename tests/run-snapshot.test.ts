import { describe, expect, it } from 'vitest';

import {
  applyRunEvent,
  createInitialSnapshot,
} from '../src/shared/run-snapshot.js';
import {
  deriveRunControlState,
  isCodexLoginReady,
} from '../src/ui/run-control-state.js';

describe('run snapshot', () => {
  it('enables Live Codex only for an authenticated CLI status', () => {
    expect(isCodexLoginReady('Logged in using ChatGPT')).toBe(true);
    expect(isCodexLoginReady('Not logged in')).toBe(false);
  });

  it('starts with one coordinator, two subagents, and one test job', () => {
    const snapshot = createInitialSnapshot('run-1', 'temporal', 'fixture');

    expect(snapshot.phase).toBe('idle');
    expect(snapshot.nodes.map(({ id }) => id)).toEqual([
      'coordinator',
      'source-investigator',
      'test-investigator',
      'test-job',
    ]);
  });

  it('freezes the last known tree while workers are offline', () => {
    const running = applyRunEvent(
      createInitialSnapshot('run-1', 'temporal', 'fixture'),
      { type: 'node', id: 'source-investigator', status: 'complete' },
    );
    const offline = applyRunEvent(running, {
      type: 'workers',
      online: false,
    });

    expect(offline.frozen).toBe(true);
    expect(offline.nodes.find(({ id }) => id === 'source-investigator')?.status).toBe(
      'complete',
    );
  });

  it('records retry attempts separately from completed Codex turns', () => {
    const initial = createInitialSnapshot('run-1', 'temporal', 'fixture');
    const retried = applyRunEvent(initial, { type: 'codex-retry' });
    const completed = applyRunEvent(retried, {
      type: 'codex-complete',
      inputTokens: 120,
      outputTokens: 30,
    });

    expect(completed.metrics).toMatchObject({
      completedCodexTurns: 1,
      retriedCodexTurns: 1,
      inputTokens: 120,
      outputTokens: 30,
    });
  });

  it('keeps a bounded execution trace and updates an in-flight tool entry', () => {
    const initial = createInitialSnapshot('run-1', 'baseline', 'live');
    const started = applyRunEvent(initial, {
      type: 'trace',
      entry: {
        id: 'planner-tool-1',
        nodeId: 'coordinator',
        kind: 'tool',
        status: 'running',
        message: 'Running: rg --files',
      },
    });
    const completed = applyRunEvent(started, {
      type: 'trace',
      entry: {
        id: 'planner-tool-1',
        nodeId: 'coordinator',
        kind: 'tool',
        status: 'complete',
        message: 'Completed: rg --files',
      },
    });

    expect(completed.trace).toEqual([
      expect.objectContaining({
        id: 'planner-tool-1',
        status: 'complete',
        message: 'Completed: rg --files',
      }),
    ]);
  });

  it('settles in-flight nodes when a run fails', () => {
    let snapshot = createInitialSnapshot('run-1', 'temporal', 'live');
    snapshot = applyRunEvent(snapshot, { type: 'node', id: 'coordinator', status: 'waiting' });
    snapshot = applyRunEvent(snapshot, { type: 'node', id: 'source-investigator', status: 'running' });
    snapshot = applyRunEvent(snapshot, { type: 'node', id: 'test-investigator', status: 'running' });
    snapshot = applyRunEvent(snapshot, { type: 'node', id: 'test-job', status: 'complete' });

    const failed = applyRunEvent(snapshot, { type: 'failed', error: 'Child Workflow execution failed' });

    expect(failed.nodes.map(({ status }) => status)).toEqual([
      'failed',
      'failed',
      'failed',
      'complete',
    ]);
  });

  it('keeps worker shutdown available after a run fails with workers online', () => {
    const failed = applyRunEvent(
      createInitialSnapshot('run-1', 'temporal', 'live'),
      { type: 'failed', error: 'Child Workflow execution failed' },
    );

    expect(deriveRunControlState(failed)).toMatchObject({
      action: 'kill',
      actionLabel: 'Kill workers',
      runActive: true,
      showRunnerChoice: false,
    });
  });
});
