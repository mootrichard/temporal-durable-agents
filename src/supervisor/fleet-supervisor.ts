import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import path from 'node:path';

import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
} from '@temporalio/client';

import {
  applyRunEvent,
  createInitialSnapshot,
  type DemoMode,
  type RunNode,
  type RunnerMode,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import type { CodexHeartbeat } from '../temporal/contracts.js';
import { createRunWorkspace, getDemoRoot } from '../runtime/workspace.js';
import { temporalTaskQueue } from '../temporal/contracts.js';
import { FixWorkflow } from '../temporal/workflows.js';
import {
  terminateProcessGroup,
  type RecordedProcessTarget,
} from './process-targets.js';

type ManagedRun = {
  runId: string;
  mode: DemoMode;
  runnerMode: RunnerMode;
  workspace: string;
  snapshot: RunSnapshot;
  process?: ChildProcess;
  target?: RecordedProcessTarget;
  expectedExit: boolean;
  stdoutBuffer: string;
};

export class FleetSupervisor {
  private readonly runs = new Map<string, ManagedRun>();
  private readonly ownerToken = randomUUID();
  private temporalConnection?: Connection;
  private temporalClient?: Client;

  async start(mode: DemoMode, runnerMode: RunnerMode): Promise<RunSnapshot> {
    if (mode === 'temporal') {
      await ensureTemporalReachable(process.env.TEMPORAL_ADDRESS ?? 'localhost:7233');
    }
    const runId = `${mode}-${randomUUID().slice(0, 8)}`;
    const workspace = await createRunWorkspace(runId);
    const managed: ManagedRun = {
      runId,
      mode,
      runnerMode,
      workspace,
      snapshot: createInitialSnapshot(runId, mode, runnerMode),
      expectedExit: false,
      stdoutBuffer: '',
    };
    this.runs.set(runId, managed);

    if (mode === 'temporal') {
      const client = await this.getTemporalClient();
      await client.workflow.start(FixWorkflow, {
        workflowId: runId,
        taskQueue: temporalTaskQueue(runId),
        args: [{ runId, runnerMode, workspace }],
      });
      this.spawnTemporalWorker(managed);
    } else {
      this.spawnBaseline(managed);
    }
    return managed.snapshot;
  }

  async snapshot(runId: string): Promise<RunSnapshot> {
    const managed = this.requireRun(runId);
    if (managed.mode === 'temporal' && managed.snapshot.workersOnline) {
      try {
        const client = await this.getTemporalClient();
        const queried = await client.workflow.getHandle(runId).query<RunSnapshot>('snapshot');
        managed.snapshot = queried;
      } catch (error) {
        if (!isQueryTemporarilyUnavailable(error)) throw error;
      }
      await this.refreshTemporalProgress(managed);
    }
    return structuredClone(managed.snapshot);
  }

  async kill(runId: string): Promise<RunSnapshot> {
    const managed = this.requireRun(runId);
    if (!managed.target) throw new Error('The Worker fleet is already offline');
    managed.expectedExit = true;
    terminateProcessGroup(managed.target, this.ownerToken, 'SIGKILL');
    managed.process = undefined;
    managed.target = undefined;
    if (managed.mode === 'temporal') {
      await this.refreshTemporalProgress(managed);
    }
    managed.snapshot = {
      ...managed.snapshot,
      phase: managed.mode === 'baseline' ? 'interrupted' : managed.snapshot.phase,
      workersOnline: false,
      frozen: true,
      sequence: managed.snapshot.sequence + 1,
      error:
        managed.mode === 'baseline'
          ? 'The in-memory coordinator and its process tree were killed.'
          : managed.snapshot.error,
      nodes: managed.snapshot.nodes.map((node) =>
        node.status === 'running' ? { ...node, status: 'interrupted' } : node,
      ),
    };
    return structuredClone(managed.snapshot);
  }

  async restart(runId: string): Promise<RunSnapshot> {
    const managed = this.requireRun(runId);
    if (managed.target) throw new Error('The Worker fleet is already online');
    managed.expectedExit = false;

    if (managed.mode === 'baseline') {
      managed.workspace = await createRunWorkspace(runId);
      managed.snapshot = createInitialSnapshot(runId, managed.mode, managed.runnerMode);
      this.spawnBaseline(managed);
    } else {
      managed.snapshot = {
        ...managed.snapshot,
        workersOnline: true,
        frozen: false,
        error: undefined,
        nodes: managed.snapshot.nodes.map((node) =>
          node.status === 'interrupted' ? { ...node, status: 'running' } : node,
        ),
      };
      this.spawnTemporalWorker(managed);
    }
    return structuredClone(managed.snapshot);
  }

  async close(): Promise<void> {
    for (const managed of this.runs.values()) {
      if (managed.target) terminateProcessGroup(managed.target, this.ownerToken, 'SIGTERM');
    }
    await this.temporalConnection?.close();
  }

  private spawnBaseline(managed: ManagedRun): void {
    this.spawnManaged(managed, 'src/baseline/process.ts', {
      DEMO_RUN_ID: managed.runId,
      DEMO_RUNNER_MODE: managed.runnerMode,
      DEMO_WORKSPACE: managed.workspace,
    });
  }

  private spawnTemporalWorker(managed: ManagedRun): void {
    this.spawnManaged(managed, 'src/temporal/worker.ts', {
      DEMO_RUN_ID: managed.runId,
    });
  }

  private spawnManaged(managed: ManagedRun, entrypoint: string, environment: Record<string, string>): void {
    const root = getDemoRoot();
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', path.join(root, entrypoint)],
      {
        cwd: root,
        detached: true,
        env: { ...process.env, ...environment },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    if (!child.pid) throw new Error(`Failed to launch ${entrypoint}`);
    managed.process = child;
    managed.target = { pid: child.pid, processGroupId: child.pid, ownerToken: this.ownerToken };
    managed.snapshot = { ...managed.snapshot, workersOnline: true, frozen: false };
    managed.stdoutBuffer = '';

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => this.readBaselineOutput(managed, chunk));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => process.stderr.write(`[${managed.runId}] ${chunk}`));
    child.once('exit', (code, signal) => {
      if (managed.process !== child) return;
      managed.process = undefined;
      managed.target = undefined;
      if (!managed.expectedExit && managed.snapshot.phase !== 'complete') {
        managed.snapshot = {
          ...managed.snapshot,
          phase: 'failed',
          workersOnline: false,
          frozen: true,
          error: `${entrypoint} exited with ${signal ?? `code ${code ?? 'unknown'}`}`,
        };
      }
    });
  }

  private readBaselineOutput(managed: ManagedRun, chunk: string): void {
    if (managed.mode !== 'baseline') return;
    managed.stdoutBuffer += chunk;
    const lines = managed.stdoutBuffer.split('\n');
    managed.stdoutBuffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('DEMO_SNAPSHOT ')) continue;
      managed.snapshot = JSON.parse(line.slice('DEMO_SNAPSHOT '.length)) as RunSnapshot;
    }
  }

  private requireRun(runId: string): ManagedRun {
    const managed = this.runs.get(runId);
    if (!managed) throw new Error(`Unknown run ${runId}`);
    return managed;
  }

  private async getTemporalClient(): Promise<Client> {
    if (!this.temporalClient) {
      this.temporalConnection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
      });
      this.temporalClient = new Client({ connection: this.temporalConnection });
    }
    return this.temporalClient;
  }

  private async refreshTemporalProgress(managed: ManagedRun): Promise<void> {
    if (!shouldProjectTemporalProgress(managed.snapshot)) return;
    try {
      const client = await this.getTemporalClient();
      const descriptions = await Promise.all(
        temporalProgressWorkflowIds(managed.runId).map(async (workflowId) => {
          try {
            return await client.workflow.getHandle(workflowId).describe();
          } catch (error) {
            if (workflowId !== managed.runId && error instanceof WorkflowNotFoundError) return undefined;
            throw error;
          }
        }),
      );
      for (const pending of descriptions.flatMap(
        (description) => description?.raw.pendingActivities ?? [],
      )) {
        if (pending.activityType?.name === 'runTests') {
          const completedFiles = decodeHeartbeatStringArray(pending.heartbeatDetails);
          if (!completedFiles) continue;
          managed.snapshot = {
            ...managed.snapshot,
            metrics: {
              ...managed.snapshot.metrics,
              completedTests: Math.max(managed.snapshot.metrics.completedTests, completedFiles.length),
            },
          };
          continue;
        }
        if (pending.activityType?.name !== 'runCodexTurn') continue;
        const heartbeat = decodeCodexHeartbeat(pending.heartbeatDetails);
        if (!heartbeat?.role) continue;
        const nodeId = nodeForCodexRole(heartbeat.role);
        managed.snapshot = applyRunEvent(managed.snapshot, {
          type: 'node',
          id: nodeId,
          status: 'running',
          detail: heartbeat.progress?.message,
          threadId: heartbeat.threadId,
          attempt: pending.attempt ?? 1,
        });
        if (heartbeat.progress) {
          managed.snapshot = applyRunEvent(managed.snapshot, {
            type: 'trace',
            entry: {
              id: `${nodeId}-${heartbeat.progress.id}`,
              nodeId,
              kind: heartbeat.progress.type === 'item' ? 'tool' : heartbeat.progress.type,
              status: heartbeat.progress.status,
              message: heartbeat.progress.message,
            },
          });
        }
      }
    } catch (error) {
      if (!isQueryTemporarilyUnavailable(error)) throw error;
    }
  }
}

export function shouldProjectTemporalProgress(snapshot: RunSnapshot): boolean {
  return snapshot.phase !== 'complete' && snapshot.phase !== 'failed';
}

export function temporalProgressWorkflowIds(runId: string): string[] {
  return [
    runId,
    `${runId}-source-investigator`,
    `${runId}-test-investigator`,
  ];
}

export async function ensureTemporalReachable(address: string, timeoutMs = 350): Promise<void> {
  const { host, port } = parseTemporalAddress(address);
  const reachable = await new Promise<boolean>((resolve) => {
    const socket = new Socket();
    const finish = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
  if (!reachable) {
    throw new Error(`Temporal is offline at ${address}. Start it with npm run temporal:up.`);
  }
}

function parseTemporalAddress(address: string): { host: string; port: number } {
  const separator = address.lastIndexOf(':');
  if (separator <= 0) return { host: address, port: 7233 };
  return {
    host: address.slice(0, separator).replace(/^\[|\]$/g, ''),
    port: Number.parseInt(address.slice(separator + 1), 10),
  };
}

function nodeForCodexRole(role: NonNullable<CodexHeartbeat['role']>): RunNode['id'] {
  if (role === 'source-investigator') return 'source-investigator';
  if (role === 'test-investigator') return 'test-investigator';
  return 'coordinator';
}

export function decodeCodexHeartbeat(value: Parameters<typeof decodeHeartbeatStringArray>[0]): CodexHeartbeat | undefined {
  const decoded = decodeHeartbeatPayload(value);
  return typeof decoded === 'object' && decoded !== null ? decoded as CodexHeartbeat : undefined;
}

export function decodeHeartbeatStringArray(value: {
  payloads?: Array<{ data?: Uint8Array | null } | null> | null;
} | null | undefined): string[] | undefined {
  const decoded = decodeHeartbeatPayload(value);
  try {
    return Array.isArray(decoded) && decoded.every((entry) => typeof entry === 'string')
      ? decoded
      : undefined;
  } catch {
    return undefined;
  }
}

function decodeHeartbeatPayload(value: {
  payloads?: Array<{ data?: Uint8Array | null } | null> | null;
} | null | undefined): unknown {
  const bytes = value?.payloads?.[0]?.data;
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

function isQueryTemporarilyUnavailable(error: unknown): boolean {
  if (error instanceof WorkflowExecutionAlreadyStartedError) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /query|workflow task|deadline|timed out|worker/i.test(message);
}
