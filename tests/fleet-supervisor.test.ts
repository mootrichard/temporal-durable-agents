import { expect, it } from 'vitest';

import { decodeHeartbeatStringArray } from '../src/supervisor/fleet-supervisor.js';

it('decodes Temporal default JSON heartbeat payloads for test checkpoints', () => {
  const data = new TextEncoder().encode(
    JSON.stringify(['tests/retry-success.test.ts', 'tests/retry-eventual-success.test.ts']),
  );
  expect(decodeHeartbeatStringArray({ payloads: [{ data }] })).toEqual([
    'tests/retry-success.test.ts',
    'tests/retry-eventual-success.test.ts',
  ]);
});

it('ignores heartbeat payloads that are not filename arrays', () => {
  const data = new TextEncoder().encode(JSON.stringify({ threadId: 'codex-thread' }));
  expect(decodeHeartbeatStringArray({ payloads: [{ data }] })).toBeUndefined();
});
