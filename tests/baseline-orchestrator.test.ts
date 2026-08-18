import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, expect, it } from 'vitest';

import { BaselineOrchestrator } from '../src/baseline/orchestrator.js';
import { FixtureCodexRunner } from '../src/codex/fixture-runner.js';
import { createRunWorkspace } from '../src/runtime/workspace.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

it('implements the fixture fix through the baseline public run interface', async () => {
  const baseDirectory = await mkdtemp(path.join(tmpdir(), 'baseline-agent-tree-'));
  temporaryDirectories.push(baseDirectory);
  const workspace = await createRunWorkspace('baseline-run', { baseDirectory });
  const snapshots: string[] = [];
  const orchestrator = new BaselineOrchestrator({
    codex: new FixtureCodexRunner({ delayMs: 0 }),
    runTests: async (_workspace, phase) => ({
      passed: phase === 'final',
      completed: phase === 'final' ? 4 : 2,
      total: 4,
      output: phase === 'final' ? '4 passed' : '1 failed, 2 passed',
    }),
  });

  const result = await orchestrator.run(
    { runId: 'baseline-run', runnerMode: 'fixture', workspace },
    (snapshot) => snapshots.push(snapshot.phase),
  );

  expect(result.phase).toBe('complete');
  expect(result.diff).toContain('attempt < maxAttempts');
  expect(snapshots).toContain('investigating');
  expect(snapshots).toContain('testing');
});
