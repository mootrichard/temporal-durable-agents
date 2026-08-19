import { readFile } from 'node:fs/promises';

import { expect, it } from 'vitest';

it('renders a completed coordinator with the success color', async () => {
  const styles = await readFile(
    new URL('../src/ui/styles.css', import.meta.url),
    'utf8',
  );

  expect(styles).toMatch(
    /\.coordinator-node\.status-complete \.coordinator-label[^}]*color:\s*var\(--success\)/,
  );
  expect(styles).toMatch(
    /\.coordinator-node\.status-complete \.node-status-text[^}]*color:\s*var\(--success\)/,
  );
  expect(styles).toMatch(
    /\.worker-node\.status-complete\.selected[^}]*border-color:\s*rgba\(36,\s*138,\s*61/,
  );
  expect(styles).toMatch(
    /\.worker-node\.status-complete\.selected \.worker-state strong[^}]*color:\s*var\(--success\)/,
  );
});
