import type { DelegationPlan } from '../shared/delegation-plan.js';

export const plannerPrompt = `You are coordinating a small TypeScript bug fix in an isolated fixture repository.

Inspect the repository and return a delegation plan with exactly two read-only investigations:
1. one focused on the implementation;
2. one focused on the test contract.

Do not edit files. Keep each assignment bounded and evidence-oriented.`;

export function investigationPrompt(prompt: string): string {
  return `${prompt}\n\nReturn a concise finding with filenames, evidence, and a minimal recommendation. Do not edit files.`;
}

export function implementationPrompt(
  plan: DelegationPlan,
  findings: { source: string; tests: string },
  initialTestOutput: string,
): string {
  return `Continue the fix you planned for this isolated fixture repository.

Diagnosis:
${plan.diagnosis}

Source investigation:
${findings.source}

Test-contract investigation:
${findings.tests}

Initial test evidence:
${initialTestOutput}

Make the smallest correct source change. Do not change tests. Then summarize the edit.`;
}
