import { describe, expect, it } from 'vitest';

import {
  applyRunEvent,
  createInitialSnapshot,
} from '../src/shared/run-snapshot.js';

describe('run snapshot', () => {
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
});
