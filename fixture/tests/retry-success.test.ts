import { expect, it } from 'vitest';

import { retry } from '../src/retry.js';

it('returns immediately when the first attempt succeeds', async () => {
  await expect(retry(async () => 'ok', 3)).resolves.toBe('ok');
});
