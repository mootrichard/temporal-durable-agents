import { Codex, type ThreadEvent } from '@openai/codex-sdk';

import type {
  CodexProgressEvent,
  CodexRole,
  CodexRunHooks,
  CodexRunRequest,
  CodexRunResult,
  CodexRunner,
} from './types.js';

type ThreadItem = Extract<ThreadEvent, { type: 'item.completed' }>['item'];

const runningMessage: Record<CodexRole, string> = {
  planner: 'Preparing the delegation plan',
  'source-investigator': 'Inspecting the implementation',
  'test-investigator': 'Inspecting the test contract',
  implementer: 'Applying the minimal fix',
};

export class LiveCodexRunner implements CodexRunner {
  private readonly codex = new Codex();

  constructor(private readonly model?: string) {}

  async run(request: CodexRunRequest, hooks: CodexRunHooks = {}): Promise<CodexRunResult> {
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
    let usage = { inputTokens: 0, outputTokens: 0 };

    for await (const event of streamed.events) {
      const progress = codexProgressForEvent(event, request.role);
      if (progress) hooks.onProgress?.(progress);

      if (event.type === 'thread.started') {
        threadId = event.thread_id;
        hooks.onThread?.(threadId);
      }
      if (event.type === 'item.completed' && event.item.type === 'agent_message') {
        finalResponse = event.item.text;
      }
      if (event.type === 'turn.completed') {
        usage = { inputTokens: event.usage.input_tokens, outputTokens: event.usage.output_tokens };
      }
      if (event.type === 'turn.failed' || event.type === 'error') {
        const message = event.type === 'error' ? event.message : event.error.message;
        throw new Error(`Codex turn failed: ${message}`);
      }
    }

    threadId ??= thread.id ?? undefined;
    if (!threadId) throw new Error('Codex did not emit a thread ID');
    if (!finalResponse) throw new Error('Codex completed without a final response');
    return { threadId, finalResponse, usage };
  }
}

export function codexProgressForEvent(
  event: ThreadEvent,
  role: CodexRole,
): CodexProgressEvent | undefined {
  switch (event.type) {
    case 'thread.started':
      return {
        id: `${role}-thread-${event.thread_id}`,
        type: 'thread',
        status: 'running',
        message: `Thread ${event.thread_id.slice(0, 8)} connected`,
      };
    case 'turn.started':
      return { id: `${role}-turn`, type: 'message', status: 'running', message: runningMessage[role] };
    case 'item.started':
    case 'item.updated':
    case 'item.completed': {
      const completed = event.type === 'item.completed';
      return {
        id: `${role}-item-${event.item.id}`,
        type: 'item',
        status: completed ? (itemFailed(event.item) ? 'failed' : 'complete') : 'running',
        message: describeItem(event.item, completed),
      };
    }
    case 'turn.completed':
      return {
        id: `${role}-turn`,
        type: 'message',
        status: 'complete',
        message: `${role.replaceAll('-', ' ')} completed`,
      };
    case 'turn.failed':
      return { id: `${role}-turn`, type: 'message', status: 'failed', message: event.error.message };
    case 'error':
      return { id: `${role}-turn`, type: 'message', status: 'failed', message: event.message };
    default:
      return undefined;
  }
}

function itemFailed(item: ThreadItem): boolean {
  if (item.type === 'error') return true;
  return (
    item.type === 'command_execution'
    || item.type === 'file_change'
    || item.type === 'mcp_tool_call'
  ) && item.status === 'failed';
}

function describeItem(item: ThreadItem, completed: boolean): string {
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
