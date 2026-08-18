import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { FixtureCodexRunner } from '../src/codex/fixture-runner.js';
import {
  createRunWorkspace,
  getWorkspaceDiff,
} from '../src/runtime/workspace.js';
import { parseDelegationPlan } from '../src/shared/delegation-plan.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('FixtureCodexRunner', () => {
  it('returns the same valid two-agent delegation plan on every run', async () => {
    const runner = new FixtureCodexRunner({ delayMs: 0 });
    const result = await runner.run({
      role: 'planner',
      prompt: 'Plan the fix.',
      workspace: '/tmp/fixture',
      sandboxMode: 'read-only',
    });

    const plan = parseDelegationPlan(JSON.parse(result.finalResponse));
    expect(plan.assignments).toHaveLength(2);
  });

  it('applies the known fix only inside the isolated run workspace', async () => {
    const baseDirectory = await mkdtemp(path.join(tmpdir(), 'agent-tree-demo-'));
    temporaryDirectories.push(baseDirectory);
    const workspace = await createRunWorkspace('fixture-run', { baseDirectory });
    const runner = new FixtureCodexRunner({ delayMs: 0 });

    await runner.run({
      role: 'implementer',
      prompt: 'Implement the fix.',
      workspace,
      sandboxMode: 'workspace-write',
    });

    const source = await readFile(path.join(workspace, 'src/retry.ts'), 'utf8');
    expect(source).toContain('attempt < maxAttempts');
    expect(await getWorkspaceDiff(workspace)).toContain('attempt <= maxAttempts');
  });
});
