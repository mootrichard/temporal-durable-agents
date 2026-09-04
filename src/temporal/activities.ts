import { Context } from '@temporalio/activity';

import { createCodexRunner } from '../codex/create-runner.js';
import type { CodexRunner } from '../codex/types.js';
import { runFixtureTests } from '../runtime/test-executor.js';
import { getWorkspaceDiff } from '../runtime/workspace.js';
import type {
  Activities,
  CodexActivityInput,
  CodexActivityResult,
  CodexHeartbeat,
  TestActivityInput,
  TestActivityResult,
} from './contracts.js';

const heartbeatLeaseMs = 5_000;

export function createActivities(createRunner = createCodexRunner): Activities {
  return {
    async runCodexTurn(input: CodexActivityInput): Promise<CodexActivityResult> {
      const context = Context.current();
      const checkpoint = context.info.heartbeatDetails as CodexHeartbeat | undefined;
      const durableThreadId = checkpoint?.threadId ?? input.threadId;
      const runner = createRunner(input.runnerMode);

      try {
        return await runCodex(context, runner, { ...input, threadId: durableThreadId });
      } catch (error) {
        if (!durableThreadId || !isUnavailableLocalSession(error)) throw error;
        // The local Codex session is gone; the durable prompt and Git workspace start a replacement thread.
        return runCodex(context, runner, { ...input, threadId: undefined });
      }
    },

    async runTests(input: TestActivityInput): Promise<TestActivityResult> {
      const context = Context.current();
      const completed = context.info.heartbeatDetails as string[] | undefined;
      const result = await runFixtureTests(
        input.workspace,
        completed,
        (completedFiles) => context.heartbeat(completedFiles),
      );
      return { ...result, activityAttempt: context.info.attempt };
    },

    getDiff: getWorkspaceDiff,
  };
}

async function runCodex(
  context: Context,
  runner: CodexRunner,
  request: CodexActivityInput,
): Promise<CodexActivityResult> {
  let heartbeat: CodexHeartbeat = { role: request.role, threadId: request.threadId };
  const trace: CodexActivityResult['trace'] = [];
  const result = await withHeartbeatLease(
    () => context.heartbeat(heartbeat),
    () => runner.run(
      { ...request, signal: context.cancellationSignal },
      {
        onThread: (threadId) => {
          heartbeat = { ...heartbeat, threadId };
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
    activityAttempt: context.info.attempt,
    trace: trace.slice(-24),
  };
}

/** Repeats the latest heartbeat during quiet SDK periods so the attempt stays inside its heartbeat timeout. */
export async function withHeartbeatLease<T>(
  heartbeat: () => void,
  task: () => Promise<T>,
  intervalMs = heartbeatLeaseMs,
): Promise<T> {
  heartbeat();
  const timer = setInterval(heartbeat, intervalMs);
  try {
    return await task();
  } finally {
    clearInterval(timer);
  }
}

function isUnavailableLocalSession(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(thread|session).*(missing|not found|unavailable|cannot resume|failed to resume)/i.test(
    message,
  );
}
