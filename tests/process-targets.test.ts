import { expect, it } from 'vitest';

import { validateProcessTarget } from '../src/supervisor/process-targets.js';

it('accepts a recorded worker process group owned by the current supervisor', () => {
  expect(
    validateProcessTarget(
      { pid: 12001, processGroupId: 12001, ownerToken: 'demo-owner' },
      'demo-owner',
    ),
  ).toEqual({ pid: 12001, processGroupId: 12001 });
});

it.each([
  [{ pid: 1, processGroupId: 1, ownerToken: 'demo-owner' }, 'demo-owner'],
  [{ pid: 12001, processGroupId: 22, ownerToken: 'demo-owner' }, 'demo-owner'],
  [{ pid: 12001, processGroupId: 12001, ownerToken: 'another-owner' }, 'demo-owner'],
])('rejects unsafe or foreign process targets', (target, expectedOwner) => {
  expect(() => validateProcessTarget(target, expectedOwner)).toThrow();
});
