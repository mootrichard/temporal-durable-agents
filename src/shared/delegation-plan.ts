import { z } from 'zod';

export const subagentAssignmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  focus: z.enum(['source', 'tests']),
});

export const delegationPlanSchema = z.object({
  diagnosis: z.string().min(1),
  assignments: z
    .array(subagentAssignmentSchema)
    .length(2, 'Delegation plans must contain exactly 2 investigations')
    .refine(
      (assignments) => new Set(assignments.map(({ focus }) => focus)).size === 2,
      'Delegation plans must cover source and tests',
    ),
});

export type SubagentAssignment = z.infer<typeof subagentAssignmentSchema>;
export type DelegationPlan = z.infer<typeof delegationPlanSchema>;

export function parseDelegationPlan(value: unknown): DelegationPlan {
  return delegationPlanSchema.parse(value);
}

export const delegationPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['diagnosis', 'assignments'],
  properties: {
    diagnosis: { type: 'string', minLength: 1 },
    assignments: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'prompt', 'focus'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          prompt: { type: 'string', minLength: 1 },
          focus: { type: 'string', enum: ['source', 'tests'] },
        },
      },
    },
  },
} as const;
