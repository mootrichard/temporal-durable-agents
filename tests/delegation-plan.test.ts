import { describe, expect, it } from 'vitest';

import { parseDelegationPlan } from '../src/shared/delegation-plan.js';

describe('parseDelegationPlan', () => {
  it('accepts exactly two bounded read-only investigations', () => {
    const plan = parseDelegationPlan({
      diagnosis: 'The failing behavior needs source and test investigation.',
      assignments: [
        {
          id: 'source-investigator',
          title: 'Inspect implementation',
          prompt: 'Find the defect in src/retry.ts and return evidence only.',
          focus: 'source',
        },
        {
          id: 'test-investigator',
          title: 'Inspect tests',
          prompt: 'Explain the contract encoded by the retry tests.',
          focus: 'tests',
        },
      ],
    });

    expect(plan.assignments.map((assignment) => assignment.focus)).toEqual([
      'source',
      'tests',
    ]);
  });

  it('rejects plans that delegate more or less than two investigations', () => {
    expect(() =>
      parseDelegationPlan({
        diagnosis: 'Too small.',
        assignments: [
          {
            id: 'source-investigator',
            title: 'Inspect implementation',
            prompt: 'Inspect source.',
            focus: 'source',
          },
        ],
      }),
    ).toThrow(/exactly 2/i);
  });
});
