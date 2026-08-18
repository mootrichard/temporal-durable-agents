import { expect, it } from 'vitest';

import { retry } from '../src/retry.js';

it('runs no more than maxAttempts times', async () => {
  let calls = 0;

  await expect(
    retry(async () => {
      calls += 1;
      throw new Error('still failing');
    }, 3),
  ).rejects.toThrow('still failing');

  expect(calls).toBe(3);
});
