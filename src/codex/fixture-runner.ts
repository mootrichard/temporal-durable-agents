import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  CodexRunHooks,
  CodexRunRequest,
  CodexRunResult,
  CodexRunner,
} from './types.js';

const fixtureResponses = {
  planner: JSON.stringify({
    diagnosis:
      'The retry helper exceeds its documented total-attempt limit. Source and tests can be investigated independently.',
    assignments: [
      {
        id: 'source-investigator',
        title: 'Inspect implementation',
        prompt:
          'Inspect src/retry.ts. Identify the defect and return evidence with a minimal fix recommendation. Do not edit files.',
        focus: 'source',
      },
      {
        id: 'test-investigator',
        title: 'Inspect test contract',
        prompt:
          'Inspect tests/*.test.ts. Explain the retry contract and identify the failing expectation. Do not edit files.',
        focus: 'tests',
      },
    ],
  }),
  'source-investigator':
    'src/retry.ts uses attempt <= maxAttempts, so maxAttempts=3 permits four calls. Change the loop condition to attempt < maxAttempts.',
  'test-investigator':
    'retry-limit.test.ts defines maxAttempts as the total call limit and expects exactly three calls. The other three tests already pass.',
  implementer:
    'Changed the retry loop from <= to < so maxAttempts is the total attempt count. No other files changed.',
} as const;

export class FixtureCodexRunner implements CodexRunner {
  private readonly delayMs: number;

  constructor(options: { delayMs?: number } = {}) {
    this.delayMs = options.delayMs ?? 1_500;
  }

  async run(request: CodexRunRequest, hooks: CodexRunHooks = {}): Promise<CodexRunResult> {
    const threadId = request.threadId ?? `fixture-${request.role}`;
    hooks.onCheckpoint?.({ threadId, threadTurnNumber: request.threadId ? 2 : 1 });
    hooks.onProgress?.({ type: 'thread', message: `${request.role} started` });
    await delay(this.delayMs);

    if (request.role === 'implementer') {
      if (request.sandboxMode !== 'workspace-write') {
        throw new Error('The fixture implementer requires workspace-write mode');
      }
      const filename = path.join(request.workspace, 'src/retry.ts');
      const source = await readFile(filename, 'utf8');
      if (!source.includes('attempt <= maxAttempts')) {
        throw new Error('The frozen retry defect was not found in the run workspace');
      }
      await writeFile(filename, source.replace('attempt <= maxAttempts', 'attempt < maxAttempts'));
      hooks.onProgress?.({ type: 'item', message: 'Applied the one-line retry fix' });
    }

    await delay(this.delayMs);
    hooks.onProgress?.({ type: 'message', message: `${request.role} completed` });
    return {
      threadId,
      finalResponse: fixtureResponses[request.role],
      resumed: request.threadId !== undefined,
      usage: {
        inputTokens: request.role === 'planner' ? 240 : 180,
        outputTokens: request.role === 'planner' ? 120 : 70,
      },
    };
  }
}

async function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
