import { expect, it } from 'vitest';

import { retry } from '../src/retry.js';

it('returns when an operation succeeds within the attempt limit', async () => {
  let calls = 0;
  const result = await retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary');
    return 'recovered';
  }, 3);

  expect(result).toBe('recovered');
  expect(calls).toBe(3);
});
