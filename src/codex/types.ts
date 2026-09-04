export type CodexRole =
  | 'planner'
  | 'source-investigator'
  | 'test-investigator'
  | 'implementer';

export type CodexSandboxMode = 'read-only' | 'workspace-write';

export type CodexRunRequest = {
  role: CodexRole;
  prompt: string;
  workspace: string;
  sandboxMode: CodexSandboxMode;
  threadId?: string;
  outputSchema?: unknown;
  signal?: AbortSignal;
};

export type CodexProgressEvent = {
  id: string;
  type: 'thread' | 'item' | 'message';
  status: 'running' | 'complete' | 'failed';
  message: string;
};

export type CodexRunHooks = {
  /** Fires as soon as the thread ID is known, before the turn produces output. */
  onThread?: (threadId: string) => void;
  onProgress?: (event: CodexProgressEvent) => void;
};

export type CodexRunResult = {
  threadId: string;
  finalResponse: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

export interface CodexRunner {
  run(request: CodexRunRequest, hooks?: CodexRunHooks): Promise<CodexRunResult>;
}
