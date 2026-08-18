import { describe, expect, it, vi } from 'vitest';

import { runCheckpointedTests } from '../src/shared/checkpointed-tests.js';

describe('runCheckpointedTests', () => {
  it('skips completed test files after a retry and heartbeats new progress', async () => {
    const execute = vi.fn(async (_filename: string) => ({ passed: true, output: 'passed' }));
    const heartbeat = vi.fn();

    const result = await runCheckpointedTests(
      ['a.test.ts', 'b.test.ts', 'c.test.ts'],
      ['a.test.ts'],
      execute,
      heartbeat,
    );

    expect(execute.mock.calls.map(([filename]) => filename)).toEqual([
      'b.test.ts',
      'c.test.ts',
    ]);
    expect(heartbeat).toHaveBeenLastCalledWith(['a.test.ts', 'b.test.ts', 'c.test.ts']);
    expect(result.completed).toEqual(['a.test.ts', 'b.test.ts', 'c.test.ts']);
  });

  it('stops after the first failing test and preserves prior progress', async () => {
    const execute = vi.fn(async (filename: string) => ({
      passed: filename !== 'b.test.ts',
      output: filename === 'b.test.ts' ? 'failed' : 'passed',
    }));

    const result = await runCheckpointedTests(
      ['a.test.ts', 'b.test.ts', 'c.test.ts'],
      [],
      execute,
      () => undefined,
    );

    expect(result.passed).toBe(false);
    expect(result.completed).toEqual(['a.test.ts']);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
