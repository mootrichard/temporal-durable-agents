import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
} from '@temporalio/client';
import { defaultPayloadConverter, fromPayloadsAtIndex } from '@temporalio/common';
import type { temporal } from '@temporalio/proto';

import { snapshotLinePrefix } from '../baseline/orchestrator.js';
import { temporalAddress } from '../runtime/environment.js';
import { ensureTemporalReachable } from '../runtime/preflight.js';
import { createRunWorkspace, getDemoRoot } from '../runtime/workspace.js';
import {
  applyRunEvent,
  createInitialSnapshot,
  isRunFinished,
  traceEvent,
  type DemoMode,
  type NodeId,
  type RunnerMode,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import type { WorkflowTimeline } from '../shared/workflow-timeline.js';
import {
  childWorkflowId,
  investigators,
  temporalTaskQueue,
  type CodexHeartbeat,
} from '../temporal/contracts.js';
import { projectWorkflowTimeline, type ChildHistory } from '../temporal/timeline.js';
import { FixWorkflow } from '../temporal/workflows.js';
import { terminateProcessGroup, type RecordedProcessTarget } from './process-targets.js';

type ManagedRun = {
  runId: string;
  mode: DemoMode;
  runnerMode: RunnerMode;
  workspace: string;
  snapshot: RunSnapshot;
  process?: ChildProcess;
  target?: RecordedProcessTarget;
  expectedExit: boolean;
};

const codexRoleNode: Record<CodexHeartbeat['role'], NodeId> = {
  planner: 'coordinator',
  implementer: 'coordinator',
  'source-investigator': 'source-investigator',
  'test-investigator': 'test-investigator',
};

export class FleetSupervisor {
  private readonly runs = new Map<string, ManagedRun>();
  private readonly ownerToken = randomUUID();
  private temporalConnection?: Connection;
  private temporalClient?: Client;

  async start(mode: DemoMode, runnerMode: RunnerMode): Promise<RunSnapshot> {
    if (mode === 'temporal') await ensureTemporalReachable(temporalAddress());
    const runId = `${mode}-${randomUUID().slice(0, 8)}`;
    const workspace = await createRunWorkspace(runId);
    const managed: ManagedRun = {
      runId,
      mode,
      runnerMode,
      workspace,
      snapshot: createInitialSnapshot(runId, mode, runnerMode),
      expectedExit: false,
    };
    this.runs.set(runId, managed);

    if (mode === 'temporal') {
      const client = await this.getTemporalClient();
      await client.workflow.start(FixWorkflow, {
        workflowId: runId,
        taskQueue: temporalTaskQueue(runId),
        args: [{ runId, runnerMode, workspace }],
      });
    }
    this.spawnFleet(managed);
    return managed.snapshot;
  }

  async snapshot(runId: string): Promise<RunSnapshot> {
    const managed = this.requireRun(runId);
    if (managed.mode === 'temporal' && managed.snapshot.workersOnline) {
      try {
        const client = await this.getTemporalClient();
        managed.snapshot = await client.workflow.getHandle(runId).query<RunSnapshot>('snapshot');
      } catch (error) {
        if (!isQueryTemporarilyUnavailable(error)) throw error;
      }
      await this.projectPendingActivities(managed);
      if (isRunFinished(managed.snapshot) && managed.target && managed.process) {
        // The Workflow has closed, so the per-run Worker has nothing left to poll.
        managed.expectedExit = true;
        const closed = once(managed.process, 'close');
        terminateProcessGroup(managed.target, this.ownerToken, 'SIGTERM');
        await closed;
      }
    }
    return structuredClone(managed.snapshot);
  }

  async timeline(runId: string): Promise<WorkflowTimeline> {
    const managed = this.requireRun(runId);
    if (managed.mode !== 'temporal') throw new Error('Workflow timeline is available for Temporal runs');
    const client = await this.getTemporalClient();
    const rootHistory = await client.workflow.getHandle(runId).fetchHistory();
    const children: ChildHistory[] = [];
    for (const laneId of investigators) {
      const workflowId = childWorkflowId(runId, laneId);
      try {
        children.push({ workflowId, laneId, history: await client.workflow.getHandle(workflowId).fetchHistory() });
      } catch (error) {
        if (!(error instanceof WorkflowNotFoundError)) throw error;
      }
    }
    return projectWorkflowTimeline(runId, rootHistory, children);
  }

  async kill(runId: string): Promise<RunSnapshot> {
    const managed = this.requireRun(runId);
    if (!managed.target) throw new Error('The Worker fleet is already offline');
    managed.expectedExit = true;
    terminateProcessGroup(managed.target, this.ownerToken, 'SIGKILL');
    managed.process = undefined;
    managed.target = undefined;
    if (managed.mode === 'temporal') await this.projectPendingActivities(managed);

    const baseline = managed.mode === 'baseline';
    managed.snapshot = {
      ...managed.snapshot,
      phase: baseline ? 'interrupted' : managed.snapshot.phase,
      workersOnline: false,
      frozen: !isRunFinished(managed.snapshot),
      sequence: managed.snapshot.sequence + 1,
      error: baseline ? 'The in-memory coordinator and its process tree were killed.' : managed.snapshot.error,
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
      // Process memory is gone, so the baseline can only begin again from a fresh workspace.
      managed.workspace = await createRunWorkspace(runId);
      managed.snapshot = createInitialSnapshot(runId, managed.mode, managed.runnerMode);
    } else {
      managed.snapshot = {
        ...managed.snapshot,
        error: undefined,
        nodes: managed.snapshot.nodes.map((node) =>
          node.status === 'interrupted' ? { ...node, status: 'running' } : node,
        ),
      };
    }
    this.spawnFleet(managed);
    return structuredClone(managed.snapshot);
  }

  async close(): Promise<void> {
    for (const managed of this.runs.values()) {
      if (managed.target) terminateProcessGroup(managed.target, this.ownerToken, 'SIGTERM');
    }
    await this.temporalConnection?.close();
  }

  /** Launches the run's Worker fleet as a detached process group so the demo can kill exactly that group. */
  private spawnFleet(managed: ManagedRun): void {
    const root = getDemoRoot();
    const entrypoint = managed.mode === 'baseline' ? 'src/baseline/process.ts' : 'src/temporal/worker.ts';
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', path.join(root, entrypoint)],
      {
        cwd: root,
        detached: true,
        env: {
          ...process.env,
          DEMO_RUN_ID: managed.runId,
          DEMO_RUNNER_MODE: managed.runnerMode,
          DEMO_WORKSPACE: managed.workspace,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    if (!child.pid) throw new Error(`Failed to launch ${entrypoint}`);
    managed.process = child;
    managed.target = { pid: child.pid, processGroupId: child.pid, ownerToken: this.ownerToken };
    managed.snapshot = { ...managed.snapshot, workersOnline: true, frozen: false };

    let buffered = '';
    child.stdout!.setEncoding('utf8');
    child.stdout!.on('data', (chunk: string) => {
      if (managed.mode !== 'baseline') {
        process.stdout.write(`[${managed.runId}] ${chunk}`);
        return;
      }
      const lines = `${buffered}${chunk}`.split('\n');
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith(snapshotLinePrefix)) {
          managed.snapshot = JSON.parse(line.slice(snapshotLinePrefix.length)) as RunSnapshot;
        }
      }
    });
    child.stderr!.setEncoding('utf8');
    child.stderr!.on('data', (chunk: string) => process.stderr.write(`[${managed.runId}] ${chunk}`));
    child.once('close', (code, signal) => {
      if (managed.process !== child) return;
      managed.process = undefined;
      managed.target = undefined;
      managed.snapshot = {
        ...managed.snapshot,
        workersOnline: false,
        sequence: managed.snapshot.sequence + 1,
      };
      if (!managed.expectedExit && managed.snapshot.phase !== 'complete') {
        managed.snapshot = {
          ...managed.snapshot,
          phase: 'failed',
          frozen: true,
          error: `${entrypoint} exited with ${signal ?? `code ${code ?? 'unknown'}`}`,
        };
      }
    });
  }

  private requireRun(runId: string): ManagedRun {
    const managed = this.runs.get(runId);
    if (!managed) throw new Error(`Unknown run ${runId}`);
    return managed;
  }

  private async getTemporalClient(): Promise<Client> {
    if (!this.temporalClient) {
      this.temporalConnection = await Connection.connect({ address: temporalAddress() });
      this.temporalClient = new Client({ connection: this.temporalConnection });
    }
    return this.temporalClient;
  }

  /**
   * Overlays pending Activity heartbeats onto the cached snapshot. The Workflow cannot see
   * in-flight heartbeats, so this is the only live view of a running Codex turn or test file.
   */
  private async projectPendingActivities(managed: ManagedRun): Promise<void> {
    // A settled run must not be pulled back to `running` by a stale heartbeat.
    if (isRunFinished(managed.snapshot)) return;
    try {
      const client = await this.getTemporalClient();
      const workflowIds = [managed.runId, ...investigators.map((id) => childWorkflowId(managed.runId, id))];
      const descriptions = await Promise.all(workflowIds.map(async (workflowId) => {
        try {
          return await client.workflow.getHandle(workflowId).describe();
        } catch (error) {
          if (workflowId !== managed.runId && error instanceof WorkflowNotFoundError) return undefined;
          throw error;
        }
      }));
      for (const pending of descriptions.flatMap((description) => description?.raw.pendingActivities ?? [])) {
        managed.snapshot = projectPendingActivity(managed.snapshot, pending);
      }
    } catch (error) {
      if (!isQueryTemporarilyUnavailable(error)) throw error;
    }
  }
}

export function projectPendingActivity(
  snapshot: RunSnapshot,
  pending: temporal.api.workflow.v1.IPendingActivityInfo,
): RunSnapshot {
  const details = fromPayloadsAtIndex<unknown>(defaultPayloadConverter, 0, pending.heartbeatDetails?.payloads);
  if (pending.activityType?.name === 'runTests' && Array.isArray(details)) {
    return {
      ...snapshot,
      metrics: {
        ...snapshot.metrics,
        completedTests: Math.max(snapshot.metrics.completedTests, details.length),
      },
    };
  }
  if (pending.activityType?.name !== 'runCodexTurn' || !details) return snapshot;

  const heartbeat = details as CodexHeartbeat;
  const nodeId = codexRoleNode[heartbeat.role];
  const next = applyRunEvent(snapshot, {
    type: 'node',
    id: nodeId,
    status: 'running',
    detail: heartbeat.progress?.message,
    threadId: heartbeat.threadId,
    attempt: pending.attempt ?? 1,
  });
  return heartbeat.progress ? applyRunEvent(next, traceEvent(nodeId, heartbeat.progress)) : next;
}

function isQueryTemporarilyUnavailable(error: unknown): boolean {
  if (error instanceof WorkflowExecutionAlreadyStartedError) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /query|workflow task|deadline|timed out|worker/i.test(message);
}
