import { describe, expect, it } from 'vitest';

import { codexProgressForEvent } from '../src/codex/live-runner.js';

describe('LiveCodexRunner progress', () => {
  it('reports a failed file change as a failed trace event', () => {
    const progress = codexProgressForEvent(
      {
        type: 'item.completed',
        item: {
          id: 'patch-1',
          type: 'file_change',
          changes: [{ path: 'src/retry.ts', kind: 'update' }],
          status: 'failed',
        },
      },
      'implementer',
    );

    expect(progress).toMatchObject({
      id: 'implementer-item-patch-1',
      status: 'failed',
    });
  });

  it('reports a non-fatal SDK error item as a failed trace event', () => {
    const progress = codexProgressForEvent(
      {
        type: 'item.completed',
        item: {
          id: 'error-1',
          type: 'error',
          message: 'Patch application failed',
        },
      },
      'implementer',
    );

    expect(progress).toMatchObject({
      id: 'implementer-item-error-1',
      status: 'failed',
      message: 'Patch application failed',
    });
  });
});
