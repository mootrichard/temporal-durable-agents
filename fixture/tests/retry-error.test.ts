import { expect, it } from 'vitest';

import { retry } from '../src/retry.js';

it('rethrows the final operation error', async () => {
  await expect(
    retry(async () => {
      throw new TypeError('network unavailable');
    }, 1),
  ).rejects.toThrow(TypeError);
});
