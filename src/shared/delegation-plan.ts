import { z } from 'zod';

const assignmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  focus: z.enum(['source', 'tests']),
});

const delegationPlanSchema = z.object({
  diagnosis: z.string().min(1),
  assignments: z
    .array(assignmentSchema)
    .length(2, 'Delegation plans must contain exactly 2 investigations')
    .refine(
      ([first, second]) => first?.focus !== second?.focus,
      'Delegation plans must cover source and tests',
    ),
});

export type SubagentAssignment = z.infer<typeof assignmentSchema>;
export type DelegationPlan = z.infer<typeof delegationPlanSchema>;
export type InvestigatorId = (typeof investigatorFor)[SubagentAssignment['focus']];

/** The run node that owns each investigation focus. */
export const investigatorFor = { source: 'source-investigator', tests: 'test-investigator' } as const;

/** Codex structured-output schema; the `.refine` cross-field check runs in `parseDelegationPlan`. */
export const delegationPlanJsonSchema: Record<string, unknown> = (({ $schema: _, ...schema }) => schema)(
  z.toJSONSchema(delegationPlanSchema),
);

export function parseDelegationPlan(value: unknown): DelegationPlan {
  return delegationPlanSchema.parse(value);
}

export function assignmentFor(
  plan: DelegationPlan,
  focus: SubagentAssignment['focus'],
): SubagentAssignment {
  const assignment = plan.assignments.find((candidate) => candidate.focus === focus);
  if (!assignment) throw new Error(`The delegation plan omitted the ${focus} investigation`);
  return assignment;
}
