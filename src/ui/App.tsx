import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CopyIcon,
  ChartBarHorizontalIcon,
  FlowArrowIcon,
  MagnifyingGlassIcon,
  MinusCircleIcon,
  PlayCircleIcon,
  PlayIcon,
  StopIcon,
  TerminalWindowIcon,
  TestTubeIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import type { Preflight } from '../runtime/preflight.js';
import {
  createInitialSnapshot,
  isRunFinished,
  nodeLabels,
  type DemoMode,
  type NodeId,
  type NodeStatus,
  type RunnerMode,
  type RunNode,
  type RunPhase,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import { api, errorMessage } from './api.js';
import { actionLabels, deriveRunControlState, type RunControlState } from './run-control-state.js';
import { useReturnFocus } from './use-return-focus.js';

const AgentConsole = lazy(() => import('./AgentConsole.js'));
const WorkflowTimeline = lazy(() => import('./WorkflowTimeline.js'));

type Snapshots = Partial<Record<DemoMode, RunSnapshot>>;

type StoredRunSession = {
  mode: DemoMode;
  runnerMode: RunnerMode;
  runIds: Partial<Record<DemoMode, string>>;
};

const storedRunSessionKey = 'durable-agent-tree-session';
const modes: DemoMode[] = ['baseline', 'temporal'];

const PHASES = [
  { label: 'Plan', phase: 'planning' },
  { label: 'Investigate', phase: 'investigating' },
  { label: 'Implement', phase: 'implementing' },
  { label: 'Verify', phase: 'testing' },
] as const;

const phaseTitles: Record<RunPhase, string> = {
  idle: 'Ready to start',
  planning: 'Planning',
  investigating: 'Investigating',
  implementing: 'Implementing',
  testing: 'Verifying',
  complete: 'Run complete',
  failed: 'Run failed',
  interrupted: 'Workers stopped',
};

const coordinatorSummaries: Record<RunPhase, string> = {
  idle: 'Ready to inspect the frozen fixture.',
  planning: 'Creating the delegation plan.',
  investigating: 'Dispatching investigations and consolidating results.',
  implementing: 'Applying the smallest verified fix.',
  testing: 'Coordinating final verification.',
  complete: 'Results consolidated and execution complete.',
  failed: 'Execution stopped on a failed step.',
  interrupted: 'Waiting for workers to restart.',
};

const statusLabels: Record<NodeStatus, string> = {
  waiting: 'Waiting',
  running: 'In progress',
  complete: 'Completed',
  failed: 'Failed',
  interrupted: 'Interrupted',
};

const waitingCopy: Record<NodeId, string> = {
  coordinator: 'Ready to inspect the frozen fixture.',
  'source-investigator': 'Queued until the coordinator returns the delegation plan.',
  'test-investigator': 'Queued until the coordinator returns the delegation plan.',
  'test-job': 'Queued with the investigations after planning.',
};

export function App() {
  const [initialSession] = useState(loadStoredRunSession);
  const [mode, setMode] = useState<DemoMode>(initialSession.mode);
  const [runnerMode, setRunnerMode] = useState<RunnerMode>(initialSession.runnerMode);
  const [snapshots, setSnapshots] = useState<Snapshots>({});
  const [sessionReady, setSessionReady] = useState(
    !initialSession.runIds.baseline && !initialSession.runIds.temporal,
  );
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const [preflight, setPreflight] = useState<Preflight>();
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId>('test-investigator');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const actionInFlight = useRef(false);
  const fleetActionRef = useRef<HTMLButtonElement>(null);
  const keepRunningRef = useRef<HTMLButtonElement>(null);
  const consoleLaunchRef = useRef<HTMLButtonElement>(null);
  const timelineLaunchRef = useRef<HTMLButtonElement>(null);
  const snapshot = snapshots[mode] ?? createInitialSnapshot('preview', mode, runnerMode);
  const { action, runActive, showRunnerChoice } = deriveRunControlState(snapshot);
  const selectedNode = snapshot.nodes.find(({ id }) => id === selectedNodeId) ?? snapshot.nodes[0]!;

  useEffect(() => {
    const storedRuns = modes.flatMap((storedMode) => {
      const runId = initialSession.runIds[storedMode];
      return runId ? [{ mode: storedMode, runId }] : [];
    });
    if (storedRuns.length === 0) return;

    let active = true;
    void Promise.all(storedRuns.map(async ({ mode: storedMode, runId }) => {
      try {
        return [storedMode, await api<RunSnapshot>(`/api/runs/${runId}`)] as const;
      } catch {
        return undefined;
      }
    })).then((results) => {
      if (!active) return;
      const restored: Snapshots = {};
      for (const result of results) {
        if (result) restored[result[0]] = result[1];
      }
      setSnapshots(restored);
      setSessionReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    saveStoredRunSession(mode, runnerMode, snapshots);
  }, [
    mode,
    runnerMode,
    sessionReady,
    snapshots.baseline?.runId,
    snapshots.temporal?.runId,
  ]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const status = await api<Preflight>('/api/preflight');
        if (active) setPreflight(status);
      } catch {
        // The primary run request surfaces API errors; this indicator stays unknown.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (snapshot.runId === 'preview' || snapshot.frozen || isRunFinished(snapshot)) return;
    const timer = window.setInterval(async () => {
      try {
        const current = await api<RunSnapshot>(`/api/runs/${snapshot.runId}`);
        setSnapshots((existing) => ({ ...existing, [mode]: current }));
      } catch (error) {
        setRequestError(errorMessage(error));
      }
    }, 650);
    return () => window.clearInterval(timer);
  }, [mode, snapshot.frozen, snapshot.phase, snapshot.runId]);

  useEffect(() => {
    if (!confirmKill) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmKill(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [confirmKill]);

  useReturnFocus(consoleOpen, consoleLaunchRef);
  useReturnFocus(timelineOpen, timelineLaunchRef);
  useReturnFocus(confirmKill, fleetActionRef, keepRunningRef);

  const codexReady = preflight?.codexReady;
  const runtimeReady = sessionReady
    && (mode !== 'temporal' || preflight?.temporalReachable !== false)
    && (runnerMode !== 'live' || codexReady !== false);
  const runtimeLabel = !sessionReady
    ? 'Restoring run…'
    : preflight === undefined
      ? 'Checking runtime…'
      : mode === 'temporal' && !preflight.temporalReachable
        ? `Temporal offline · ${preflight.temporalAddress}`
        : runnerMode === 'live' && !codexReady
          ? 'Codex login required'
          : runnerMode === 'live'
            ? 'Live Codex ready'
            : 'Fixture ready';
  function chooseMode(nextMode: DemoMode): void {
    setMode(nextMode);
    setHistoryOpen(false);
    setConfirmKill(false);
    setConsoleOpen(false);
    setTimelineOpen(false);
  }

  async function start(): Promise<void> {
    await perform(async () => {
      const created = await api<RunSnapshot>('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ mode, runnerMode }),
      });
      setSnapshots((existing) => ({ ...existing, [mode]: created }));
      setHistoryOpen(false);
      setConsoleOpen(false);
    });
  }

  async function changeFleet(operation: 'kill' | 'restart'): Promise<void> {
    await perform(async () => {
      const changed = await api<RunSnapshot>(`/api/runs/${snapshot.runId}/${operation}`, {
        method: 'POST',
      });
      setSnapshots((existing) => ({ ...existing, [mode]: changed }));
    });
  }

  async function handleFleetAction(): Promise<void> {
    if (action === 'kill') {
      setConfirmKill(true);
      return;
    }
    if (action === 'restart') return changeFleet('restart');
    return start();
  }

  async function confirmFleetKill(): Promise<void> {
    setConfirmKill(false);
    await changeFleet('kill');
  }

  async function perform(action: () => Promise<void>): Promise<void> {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true);
    setRequestError(undefined);
    try {
      await action();
    } catch (error) {
      setRequestError(errorMessage(error));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main className={`shell mode-${mode} ${snapshot.frozen ? 'is-frozen' : ''}`}>
      <header className="app-bar">
        <div className="brand-lockup" aria-label="Temporal durable agent execution demo">
          <span className="brand-mark" aria-hidden="true"><FlowArrowIcon weight="regular" /></span>
          <strong>Temporal</strong>
        </div>

        <div className="durability-control">
          <div className="mode-switch" aria-label="Choose run durability" role="group">
            <button
              aria-pressed={mode === 'baseline'}
              className={mode === 'baseline' ? 'active' : ''}
              data-testid="mode-baseline"
              onClick={() => chooseMode('baseline')}
              type="button"
            >
              <strong>Baseline</strong>
              <span>Process memory</span>
            </button>
            <button
              aria-pressed={mode === 'temporal'}
              className={mode === 'temporal' ? 'active' : ''}
              data-testid="mode-temporal"
              onClick={() => chooseMode('temporal')}
              type="button"
            >
              <strong>Temporal</strong>
              <span>Survives worker failure</span>
            </button>
          </div>
          <p className="ownership-note">
            {mode === 'temporal'
              ? 'Run state is recorded in Event History.'
              : 'Run state lives only in process memory.'}
          </p>
        </div>

        <div className="run-controls">
          {showRunnerChoice ? (
            <div className="runtime-setup">
              <span className={`runtime-health ${runtimeReady ? 'ready' : 'blocked'}`} data-testid="runtime-status">
                <i />{runtimeLabel}
              </span>
              <div className="runner-switch" aria-label="Choose Codex runner" role="group">
                <button
                  aria-pressed={runnerMode === 'fixture'}
                  className={runnerMode === 'fixture' ? 'active' : ''}
                  onClick={() => setRunnerMode('fixture')}
                  type="button"
                >Fixture</button>
                <button
                  aria-pressed={runnerMode === 'live'}
                  className={runnerMode === 'live' ? 'active' : ''}
                  onClick={() => setRunnerMode('live')}
                  type="button"
                >Live Codex</button>
              </div>
            </div>
          ) : (
            <div className="run-status" aria-live="polite" role="status">
              <span className={snapshot.phase === 'failed' ? 'offline' : snapshot.workersOnline ? 'online' : 'offline'} />
              <div>
                <strong>
                  {snapshot.phase === 'failed'
                    ? 'Run failed'
                    : snapshot.phase === 'complete'
                      ? 'Run complete'
                      : snapshot.workersOnline
                        ? 'Running'
                        : 'Workers stopped'}
                </strong>
                <small>
                  {isRunFinished(snapshot) && snapshot.workersOnline
                    ? 'Workers still online'
                    : runnerMode === 'live'
                      ? 'Live Codex'
                      : 'Fixture runtime'}
                </small>
              </div>
            </div>
          )}
          <button
            ref={fleetActionRef}
            data-testid="fleet-action"
            className={`fleet-action ${runActive ? 'danger' : ''}`}
            disabled={busy || (action !== 'kill' && !runtimeReady)}
            onClick={() => void handleFleetAction()}
            type="button"
          >
            <ActionIcon action={action} />
            {busy ? 'Working…' : actionLabels[action]}
          </button>
          {snapshot.runId !== 'preview' && (
            <button
              ref={consoleLaunchRef}
              aria-label="Open agent consoles"
              className="console-launch"
              onClick={() => {
                setConfirmKill(false);
                setConsoleOpen(true);
              }}
              type="button"
            >
              <TerminalWindowIcon aria-hidden="true" weight="bold" />
              Agent consoles
            </button>
          )}
          {mode === 'temporal' && snapshot.runId !== 'preview' && (
            <button
              ref={timelineLaunchRef}
              aria-label="Open workflow timeline"
              className="console-launch"
              onClick={() => {
                setConfirmKill(false);
                setConsoleOpen(false);
                setTimelineOpen(true);
              }}
              type="button"
            >
              <ChartBarHorizontalIcon aria-hidden="true" weight="bold" />
              Workflow timeline
            </button>
          )}
        </div>
      </header>

      {requestError && <div className="request-error" role="alert">{requestError}</div>}

      <div className="content-frame">
        <section className="status-overview" aria-labelledby="phase-heading">
          <div className="status-copy">
            <span className="sr-only" data-testid="run-phase">{snapshot.phase}</span>
            <h1 id="phase-heading">{phaseTitles[snapshot.phase]}</h1>
            <p>{phaseSummary(snapshot)}</p>
          </div>
          <PhaseTrack snapshot={snapshot} />
        </section>

        {snapshot.frozen && (
          <div className="frozen-notice" data-testid="frozen-snapshot" role="status">
            <StopIcon aria-hidden="true" weight="fill" />
            <div>
              <strong>Every worker is offline.</strong>
              <span>{mode === 'temporal' ? 'History is waiting. Restart to resume this run.' : 'Memory is gone. Restart to begin a new run.'}</span>
            </div>
          </div>
        )}

        <section className="execution-stage" data-testid="execution-tree">
          <div className="tree-column">
            <CoordinatorNode
              node={snapshot.nodes[0]!}
              onSelect={() => setSelectedNodeId('coordinator')}
              selected={selectedNodeId === 'coordinator'}
              summary={coordinatorSummaries[snapshot.phase]}
            />
            <div className="tree-connector" aria-hidden="true" />
            <div className="worker-stack">
              {snapshot.nodes.slice(1).map((node) => (
                <WorkerNode
                  key={node.id}
                  node={node}
                  onSelect={() => setSelectedNodeId(node.id)}
                  selected={selectedNodeId === node.id}
                  snapshot={snapshot}
                />
              ))}
            </div>
          </div>

          <NodeInspector
            historyOpen={historyOpen}
            node={selectedNode}
            onToggleHistory={() => setHistoryOpen((open) => !open)}
            snapshot={snapshot}
          />
        </section>

      </div>

      {consoleOpen && (
        <Suspense fallback={(
          <div className="agent-console-backdrop">
            <div className="agent-console-loading" role="status">Opening agent consoles…</div>
          </div>
        )}>
          <AgentConsole onClose={() => setConsoleOpen(false)} snapshot={snapshot} />
        </Suspense>
      )}

      {timelineOpen && (
        <Suspense fallback={(
          <div className="agent-console-backdrop">
            <div className="agent-console-loading" role="status">Opening workflow timeline…</div>
          </div>
        )}>
          <WorkflowTimeline onClose={() => setTimelineOpen(false)} snapshot={snapshot} />
        </Suspense>
      )}

      <div
        aria-hidden={!confirmKill}
        className={`dialog-backdrop ${confirmKill ? 'is-open' : ''}`}
        inert={!confirmKill}
      >
          <section aria-describedby="stop-description" aria-labelledby="stop-title" aria-modal={confirmKill ? 'true' : undefined} className="stop-dialog" role="dialog">
            <span className="dialog-icon" aria-hidden="true"><StopIcon weight="fill" /></span>
            <h2 id="stop-title">Stop every worker?</h2>
            <p id="stop-description">
              {snapshot.phase === 'failed'
                ? 'This run has failed, but its worker fleet is still online. Stop the workers before starting a clean run.'
                : snapshot.phase === 'complete'
                  ? 'The run is complete. Stop its worker fleet before starting another run.'
                  : mode === 'temporal'
                    ? 'Temporal keeps the run in Event History. Restarting the workers resumes from the last durable checkpoint.'
                    : 'The baseline stores this run in process memory. Stopping the workers clears its in-flight progress.'}
            </p>
            <div className="dialog-actions">
              <button ref={keepRunningRef} className="secondary-action" onClick={() => setConfirmKill(false)} type="button">Keep running</button>
              <button className="danger-action" data-testid="confirm-fleet-stop" onClick={() => void confirmFleetKill()} type="button">Stop workers</button>
            </div>
          </section>
        </div>
    </main>
  );
}

function ActionIcon({ action }: { action: RunControlState['action'] }) {
  if (action === 'kill') return <StopIcon aria-hidden="true" weight="fill" />;
  if (action === 'restart') return <ArrowClockwiseIcon aria-hidden="true" weight="bold" />;
  return <PlayIcon aria-hidden="true" weight="fill" />;
}

function PhaseTrack({ snapshot }: { snapshot: RunSnapshot }) {
  const activeIndex = phaseIndex(snapshot);
  return (
    <ol className="phase-track" aria-label="Run phases">
      {PHASES.map((item, index) => (
        <li className={snapshot.phase === 'complete' || index < activeIndex ? 'complete' : index === activeIndex ? 'current' : ''} key={item.phase}>
          <span>{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

function CoordinatorNode({
  node,
  onSelect,
  selected,
  summary,
}: {
  node: RunNode;
  onSelect: () => void;
  selected: boolean;
  summary: string;
}) {
  return (
    <article className={`coordinator-node status-${node.status} ${selected ? 'selected' : ''}`} data-testid="node-coordinator">
      <button aria-expanded={selected} onClick={onSelect} type="button">
        <span className="coordinator-label"><i />Coordinator</span>
        <strong>{summary}</strong>
        {node.threadId && <code>thread:{shortThread(node.threadId)}</code>}
        <span className="node-status-text">{statusLabels[node.status]}</span>
      </button>
    </article>
  );
}

function WorkerNode({
  node,
  onSelect,
  selected,
  snapshot,
}: {
  node: RunNode;
  onSelect: () => void;
  selected: boolean;
  snapshot: RunSnapshot;
}) {
  const progress = snapshot.metrics.totalTests === 0
    ? 0
    : snapshot.metrics.completedTests / snapshot.metrics.totalTests;

  return (
    <article className={`worker-node status-${node.status} ${selected ? 'selected' : ''}`} data-testid={`node-${node.id}`}>
      <button aria-expanded={selected} className="worker-summary" onClick={onSelect} type="button">
        <span className="worker-icon" aria-hidden="true"><NodeIcon nodeId={node.id} status={node.status} /></span>
        <span className="worker-identity">
          <strong>{nodeLabels[node.id]}</strong>
          <span>{node.detail ?? waitingCopy[node.id]}</span>
        </span>
        <span className="worker-state">
          <strong>{statusLabels[node.status]}</strong>
          <span>{statusDetail(node)}</span>
        </span>
        {selected ? <CaretUpIcon aria-hidden="true" /> : <CaretDownIcon aria-hidden="true" />}
      </button>

      {selected && (
        <div className="worker-expanded">
          <div className="activity-card">
            <span>Latest activity</span>
            <strong>{node.detail ?? waitingCopy[node.id]}</strong>
            <small>Attempt {node.attempt || '—'}</small>
          </div>
          <div className="checkpoint-card">
            <span>Test checkpoint</span>
            <strong data-testid="test-progress">{snapshot.metrics.completedTests} / {snapshot.metrics.totalTests}</strong>
            <div className="progress-track" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
            <small>
              {snapshot.phase === 'complete'
                ? 'All tests passed.'
                : snapshot.mode === 'temporal'
                  ? 'Progress is saved with the run.'
                  : 'Progress lives inside this process.'}
            </small>
          </div>
        </div>
      )}
    </article>
  );
}

function NodeInspector({
  historyOpen,
  node,
  onToggleHistory,
  snapshot,
}: {
  historyOpen: boolean;
  node: RunNode;
  onToggleHistory: () => void;
  snapshot: RunSnapshot;
}) {
  const [copied, setCopied] = useState(false);
  const nodeEvents = useMemo(
    () => snapshot.trace.filter(({ nodeId }) => nodeId === node.id).slice(-3),
    [node.id, snapshot.trace],
  );
  const diffLines = useMemo(() => snapshot.diff?.split('\n').filter(Boolean) ?? [], [snapshot.diff]);

  useEffect(() => setCopied(false), [node.id, node.threadId]);

  async function copyThread(): Promise<void> {
    if (!node.threadId) return;
    await navigator.clipboard.writeText(node.threadId);
    setCopied(true);
  }

  return (
    <aside className="node-inspector" aria-label={`${nodeLabels[node.id]} details`} data-testid="node-inspector">
      <div className="inspector-field">
        <span>Thread ID</span>
        <div className="thread-value">
          <code>{node.threadId ? `thread:${shortThread(node.threadId)}` : 'Not started'}</code>
          <button aria-label={copied ? 'Thread ID copied' : 'Copy thread ID'} disabled={!node.threadId} onClick={() => void copyThread()} type="button">
            {copied ? <CheckCircleIcon aria-hidden="true" weight="fill" /> : <CopyIcon aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="inspector-field">
        <span>Attempt</span>
        <strong>{node.attempt || '—'}</strong>
      </div>

      <div className="inspector-events">
        <span>Last {Math.max(nodeEvents.length, 1)} {nodeEvents.length === 1 ? 'event' : 'events'}</span>
        <ol>
          {nodeEvents.length > 0 ? nodeEvents.map((entry) => (
            <li className={`trace-${entry.status}`} key={entry.id}>
              <i />
              <span>{entry.message}</span>
            </li>
          )) : (
            <li className="trace-empty"><i /><span>{node.status === 'waiting' ? 'Waiting for work to begin.' : 'No event receipt yet.'}</span></li>
          )}
        </ol>
      </div>

      <div className="completion-receipt">
        <span>{snapshot.phase === 'complete' ? 'Completion receipt' : 'Run evidence'}</span>
        <dl>
          <div><dt>Codex turns</dt><dd data-testid="completed-turns">{snapshot.metrics.completedCodexTurns}</dd></div>
          <div><dt>Retries</dt><dd data-testid="retried-turns">{snapshot.metrics.retriedCodexTurns}</dd></div>
        </dl>
        {diffLines.length > 0 && (
          <pre data-testid="final-diff">{diffLines.map((line) => <code className={line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : ''} key={line}>{line}{'\n'}</code>)}</pre>
        )}
      </div>

      <button aria-expanded={historyOpen} className="history-toggle" onClick={onToggleHistory} type="button">
        {historyOpen ? 'Hide event history' : 'View full event history'}
        {historyOpen ? <CaretDownIcon aria-hidden="true" /> : <CaretRightIcon aria-hidden="true" />}
      </button>

      <div className="history-panel" hidden={!historyOpen}>
        <ol className="execution-trace" data-testid="execution-trace" aria-live="polite">
          {snapshot.trace.length > 0 ? snapshot.trace.map((entry) => (
            <li className={`trace-${entry.status}`} key={entry.id}>
              <span>{nodeLabels[entry.nodeId]}</span>
              <strong>{entry.message}</strong>
            </li>
          )) : (
            <li className="trace-empty"><span>System</span><strong>Start a run to see thread and tool events.</strong></li>
          )}
        </ol>
      </div>
    </aside>
  );
}

function NodeIcon({ nodeId, status }: { nodeId: NodeId; status: NodeStatus }) {
  if (status === 'complete') return <CheckCircleIcon weight="fill" />;
  if (status === 'running') return <CircleNotchIcon className="spinning" weight="bold" />;
  if (status === 'failed' || status === 'interrupted') return <XCircleIcon weight="fill" />;
  if (nodeId === 'source-investigator') return <MagnifyingGlassIcon />;
  if (nodeId === 'test-investigator') return <TestTubeIcon />;
  if (nodeId === 'test-job') return <PlayCircleIcon />;
  return <MinusCircleIcon />;
}

function phaseSummary(snapshot: RunSnapshot): string {
  switch (snapshot.phase) {
    case 'idle':
      return 'Choose a runtime, then start the reliability demo.';
    case 'planning':
      return 'The coordinator is creating the delegation plan.';
    case 'investigating': {
      const completed = snapshot.nodes.filter(({ id, status }) => id !== 'coordinator' && status === 'complete').length;
      return `The coordinator started two investigations and one test job. ${completed} of 3 branches ${completed === 1 ? 'has' : 'have'} completed.`;
    }
    case 'implementing':
      return 'The investigations agree. The coordinator is applying the fix.';
    case 'testing':
      return `The fix is in place. Tests are ${snapshot.metrics.completedTests} of ${snapshot.metrics.totalTests}.`;
    case 'complete':
      return snapshot.summary ?? 'The fix is verified and the run is complete.';
    case 'failed':
      return snapshot.error ?? 'The run stopped because a step failed.';
    case 'interrupted':
      return snapshot.mode === 'temporal'
        ? 'Event History kept the run. Restart the workers to continue.'
        : 'Process memory was lost. Restarting begins a new run.';
  }
}

function phaseIndex(snapshot: RunSnapshot): number {
  switch (snapshot.phase) {
    case 'planning':
      return 0;
    case 'investigating':
      return 1;
    case 'implementing':
      return 2;
    case 'testing':
    case 'complete':
      return 3;
    case 'interrupted':
      if (snapshot.metrics.completedTests > 0) return 3;
      if (snapshot.nodes.some(({ id, status }) => id !== 'coordinator' && status === 'complete')) return 1;
      return 0;
    default:
      return -1;
  }
}

function statusDetail(node: RunNode): string {
  if (node.status === 'complete') return node.detail ?? 'Work recorded.';
  if (node.status === 'running') return node.detail ?? 'Work is underway.';
  if (node.status === 'interrupted') return 'Worker stopped.';
  if (node.status === 'failed') return node.detail ?? 'This step failed.';
  return 'Queued for this phase.';
}

function shortThread(threadId: string): string {
  return threadId.length > 18 ? threadId.slice(0, 18) : threadId;
}

function loadStoredRunSession(): StoredRunSession {
  const fallback: StoredRunSession = { mode: 'baseline', runnerMode: 'fixture', runIds: {} };
  try {
    const candidate = JSON.parse(window.localStorage.getItem(storedRunSessionKey) ?? 'null') as {
      mode?: unknown;
      runnerMode?: unknown;
      runIds?: Partial<Record<DemoMode, unknown>>;
    } | null;
    if (!candidate) return fallback;
    const runIds: StoredRunSession['runIds'] = {};
    for (const storedMode of modes) {
      const runId = candidate.runIds?.[storedMode];
      if (typeof runId === 'string') runIds[storedMode] = runId;
    }
    return {
      mode: candidate.mode === 'temporal' ? 'temporal' : 'baseline',
      runnerMode: candidate.runnerMode === 'live' ? 'live' : 'fixture',
      runIds,
    };
  } catch {
    return fallback;
  }
}

function saveStoredRunSession(mode: DemoMode, runnerMode: RunnerMode, snapshots: Snapshots): void {
  const runIds: StoredRunSession['runIds'] = {};
  for (const storedMode of modes) {
    const runId = snapshots[storedMode]?.runId;
    if (runId && runId !== 'preview') runIds[storedMode] = runId;
  }
  try {
    window.localStorage.setItem(storedRunSessionKey, JSON.stringify({ mode, runnerMode, runIds }));
  } catch {
    // Browser persistence is best-effort; the active in-memory run remains usable.
  }
}
