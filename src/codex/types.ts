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
};

export type CodexCheckpoint = {
  threadId: string;
  threadTurnNumber: number;
  lastItemId?: string;
};

export type CodexProgressEvent = {
  type: 'thread' | 'item' | 'message';
  message: string;
};

export type CodexRunHooks = {
  onCheckpoint?: (checkpoint: CodexCheckpoint) => void;
  onProgress?: (event: CodexProgressEvent) => void;
};

export type CodexRunResult = {
  threadId: string;
  finalResponse: string;
  resumed: boolean;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

export interface CodexRunner {
  run(request: CodexRunRequest, hooks?: CodexRunHooks): Promise<CodexRunResult>;
}
