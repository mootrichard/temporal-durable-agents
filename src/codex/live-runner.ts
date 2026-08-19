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
      ...(request.signal ? { signal: request.signal } : {}),
    });

    let threadId = request.threadId;
    let finalResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let lastItemId: string | undefined;

    for await (const event of streamed.events) {
      const progress = codexProgressForEvent(event, request.role);
      if (progress) hooks.onProgress?.(progress);

      if (event.type === 'thread.started') {
        threadId = event.thread_id;
        hooks.onCheckpoint?.({ threadId, threadTurnNumber: resumed ? 2 : 1 });
      }
      if (event.type === 'item.completed') {
        lastItemId = event.item.id;
        if (event.item.type === 'agent_message') finalResponse = event.item.text;
        if (threadId) {
          hooks.onCheckpoint?.({
            threadId,
            threadTurnNumber: resumed ? 2 : 1,
            lastItemId,
          });
        }
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

export function codexProgressForEvent(event: ThreadEvent, role: CodexRunRequest['role']) {
  if (event.type === 'thread.started') {
    return {
      id: `${role}-thread-${event.thread_id}`,
      type: 'thread' as const,
      status: 'running' as const,
      message: `Thread ${event.thread_id.slice(0, 8)} connected`,
    };
  }
  if (event.type === 'turn.started') {
    return {
      id: `${role}-turn`,
      type: 'message' as const,
      status: 'running' as const,
      message: roleRunningMessage(role),
    };
  }
  if (event.type === 'item.started' || event.type === 'item.updated' || event.type === 'item.completed') {
    return {
      id: `${role}-item-${event.item.id}`,
      type: 'item' as const,
      status: event.type === 'item.completed'
        ? itemFailed(event.item) ? 'failed' as const : 'complete' as const
        : 'running' as const,
      message: describeItem(event.item, event.type === 'item.completed'),
    };
  }
  if (event.type === 'turn.completed') {
    return {
      id: `${role}-turn`,
      type: 'message' as const,
      status: 'complete' as const,
      message: `${roleLabel(role)} completed`,
    };
  }
  if (event.type === 'turn.failed' || event.type === 'error') {
    return {
      id: `${role}-turn`,
      type: 'message' as const,
      status: 'failed' as const,
      message: event.type === 'error' ? event.message : event.error.message,
    };
  }
  return undefined;
}

function roleRunningMessage(role: CodexRunRequest['role']): string {
  if (role === 'planner') return 'Preparing the delegation plan';
  if (role === 'source-investigator') return 'Inspecting the implementation';
  if (role === 'test-investigator') return 'Inspecting the test contract';
  return 'Applying the minimal fix';
}

function roleLabel(role: CodexRunRequest['role']): string {
  return role.replaceAll('-', ' ');
}

function itemFailed(item: Extract<ThreadEvent, { type: 'item.completed' }>['item']): boolean {
  if (item.type === 'error') return true;
  return (
    item.type === 'command_execution'
    || item.type === 'file_change'
    || item.type === 'mcp_tool_call'
  ) && item.status === 'failed';
}

function describeItem(
  item: Extract<ThreadEvent, { type: 'item.completed' }>['item'],
  completed: boolean,
): string {
  const verb = completed ? 'Completed' : 'Running';
  switch (item.type) {
    case 'command_execution':
      return `${verb}: ${compact(item.command)}`;
    case 'mcp_tool_call':
      return `${verb}: ${item.server}.${item.tool}`;
    case 'web_search':
      return `${verb}: web search for ${compact(item.query)}`;
    case 'file_change':
      return `${item.status === 'failed' ? 'Failed to change' : completed ? 'Changed' : 'Changing'}: ${item.changes.map(({ path }) => path).join(', ')}`;
    case 'reasoning':
      return compact(item.text) || 'Reasoning about the task';
    case 'todo_list':
      return `Plan: ${item.items.filter(({ completed: done }) => done).length}/${item.items.length} steps complete`;
    case 'agent_message':
      return completed ? 'Response ready' : 'Drafting response';
    case 'error':
      return compact(item.message);
  }
}

function compact(value: string, limit = 92): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit - 1)}…` : oneLine;
}
