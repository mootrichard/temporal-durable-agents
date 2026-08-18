import { FixtureCodexRunner } from './fixture-runner.js';
import { LiveCodexRunner } from './live-runner.js';
import type { CodexRunner } from './types.js';
import type { RunnerMode } from '../shared/run-snapshot.js';

export function createCodexRunner(mode: RunnerMode): CodexRunner {
  return mode === 'live'
    ? new LiveCodexRunner({ model: process.env.CODEX_MODEL })
    : new FixtureCodexRunner({
        delayMs: Number.parseInt(process.env.FIXTURE_DELAY_MS ?? '1500', 10),
      });
}
