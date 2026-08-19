import { Context } from '@temporalio/activity';

import { createCodexRunner } from '../codex/create-runner.js';
import type { CodexRunner } from '../codex/types.js';
import { runFixtureTests } from '../runtime/test-executor.js';
import { getWorkspaceDiff } from '../runtime/workspace.js';
import type {
  CodexActivityInput,
  CodexActivityResult,
  CodexHeartbeat,
  TestActivityInput,
  TestActivityResult,
} from './contracts.js';

export type ActivityDependencies = {
  createRunner?: typeof createCodexRunner;
};

export function createActivities(dependencies: ActivityDependencies = {}) {
  const runnerFactory = dependencies.createRunner ?? createCodexRunner;

  return {
    async runCodexTurn(input: CodexActivityInput): Promise<CodexActivityResult> {
      const context = Context.current();
      const checkpoint = asCodexHeartbeat(context.info.heartbeatDetails);
      const durableThreadId = checkpoint?.threadId ?? input.threadId;
      const runner = runnerFactory(input.runnerMode);
      let replacementThread = false;

      try {
        return await executeCodex(runner, { ...input, threadId: durableThreadId }, replacementThread);
      } catch (error) {
        if (!durableThreadId || !isUnavailableLocalSession(error)) throw error;
        replacementThread = true;
        return executeCodex(runner, { ...input, threadId: undefined }, replacementThread);
      }

      async function executeCodex(
        codex: CodexRunner,
        request: CodexActivityInput,
        replaced: boolean,
      ): Promise<CodexActivityResult> {
        let heartbeat: CodexHeartbeat = {
          ...checkpoint,
          ...(request.threadId ? { threadId: request.threadId } : {}),
          role: request.role,
        };
        const trace: NonNullable<CodexActivityResult['trace']> = [];
        const result = await withHeartbeatLease(
          () => context.heartbeat(heartbeat),
          () => codex.run(
            { ...request, signal: context.cancellationSignal },
            {
              onCheckpoint: ({ threadId, lastItemId }) => {
                heartbeat = { ...heartbeat, threadId, lastItemId };
                context.heartbeat(heartbeat);
              },
              onProgress: (progress) => {
                trace.push(progress);
                heartbeat = { ...heartbeat, progress };
                context.heartbeat(heartbeat);
              },
            },
          ),
        );
        return {
          ...result,
          replacementThread: replaced,
          activityAttempt: context.info.attempt,
          trace: trace.slice(-24),
        };
      }
    },

    async runTests(input: TestActivityInput): Promise<TestActivityResult> {
      const context = Context.current();
      const completed = asCompletedFiles(context.info.heartbeatDetails);
      const result = await runFixtureTests(
        input.workspace,
        input.phase,
        completed,
        (completedFiles) => context.heartbeat(completedFiles),
      );
      return {
        ...result,
        completedFiles: result.completedFiles ?? [],
        activityAttempt: context.info.attempt,
      };
    },

    async getDiff(workspace: string): Promise<string> {
      return getWorkspaceDiff(workspace);
    },
  };
}

export async function withHeartbeatLease<T>(
  heartbeat: () => void,
  task: () => Promise<T>,
  intervalMs = 5_000,
): Promise<T> {
  heartbeat();
  const timer = setInterval(heartbeat, intervalMs);
  try {
    return await task();
  } finally {
    clearInterval(timer);
  }
}

function asCodexHeartbeat(value: unknown): CodexHeartbeat | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if ('threadId' in value && value.threadId !== undefined && typeof value.threadId !== 'string') return undefined;
  return value as CodexHeartbeat;
}

function asCompletedFiles(value: unknown): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : [];
}

function isUnavailableLocalSession(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(thread|session).*(missing|not found|unavailable|cannot resume|failed to resume)/i.test(
    message,
  );
}
