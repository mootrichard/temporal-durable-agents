import { Codex, type ThreadEvent } from '@openai/codex-sdk';

import type {
  CodexRunHooks,
  CodexRunRequest,
  CodexRunResult,
  CodexRunner,
} from './types.js';

export class LiveCodexRunner implements CodexRunner {
  private readonly codex: Codex;
  private readonly model?: string;

  constructor(options: { model?: string } = {}) {
    this.codex = new Codex();
    this.model = options.model;
  }

  async run(request: CodexRunRequest, hooks: CodexRunHooks = {}): Promise<CodexRunResult> {
    const resumed = request.threadId !== undefined;
    const threadOptions = {
      workingDirectory: request.workspace,
      sandboxMode: request.sandboxMode,
      approvalPolicy: 'never' as const,
      networkAccessEnabled: false,
      ...(this.model ? { model: this.model } : {}),
    };
    const thread = request.threadId
      ? this.codex.resumeThread(request.threadId, threadOptions)
      : this.codex.startThread(threadOptions);
    const streamed = await thread.runStreamed(request.prompt, {
      ...(request.outputSchema ? { outputSchema: request.outputSchema } : {}),
    });

    let threadId = request.threadId;
    let finalResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let lastItemId: string | undefined;

    for await (const event of streamed.events) {
      const progress = describeEvent(event);
      if (progress) hooks.onProgress?.(progress);

      if (event.type === 'thread.started') {
        threadId = event.thread_id;
        hooks.onCheckpoint?.({ threadId, attempt: resumed ? 2 : 1 });
      }
      if (event.type === 'item.completed') {
        lastItemId = event.item.id;
        if (event.item.type === 'agent_message') finalResponse = event.item.text;
        if (threadId) hooks.onCheckpoint?.({ threadId, attempt: resumed ? 2 : 1, lastItemId });
      }
      if (event.type === 'turn.completed') {
        inputTokens = event.usage.input_tokens;
        outputTokens = event.usage.output_tokens;
      }
      if (event.type === 'turn.failed' || event.type === 'error') {
        const message = event.type === 'error' ? event.message : event.error.message;
        throw new Error(`Codex turn failed: ${message}`);
      }
    }

    threadId ??= thread.id ?? undefined;
    if (!threadId) throw new Error('Codex did not emit a thread ID');
    if (!finalResponse) throw new Error('Codex completed without a final response');

    return {
      threadId,
      finalResponse,
      resumed,
      usage: { inputTokens, outputTokens },
    };
  }
}

function describeEvent(event: ThreadEvent) {
  if (event.type === 'thread.started') {
    return { type: 'thread' as const, message: `Codex thread ${event.thread_id.slice(0, 8)} started` };
  }
  if (event.type === 'item.completed') {
    return { type: 'item' as const, message: `${event.item.type.replaceAll('_', ' ')} completed` };
  }
  if (event.type === 'turn.completed') {
    return { type: 'message' as const, message: 'Codex turn completed' };
  }
  return undefined;
}
