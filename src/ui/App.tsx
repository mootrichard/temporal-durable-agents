import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CopyIcon,
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

import {
  createInitialSnapshot,
  type DemoMode,
  type NodeStatus,
  type RunnerMode,
  type RunNode,
  type RunPhase,
  type RunSnapshot,
} from '../shared/run-snapshot.js';
import {
  deriveRunControlState,
  isCodexLoginReady,
} from './run-control-state.js';

const AgentConsole = lazy(() => import('./AgentConsole.js'));

type Snapshots = Partial<Record<DemoMode, RunSnapshot>>;
type Preflight = {
  codexLogin: string;
  temporalAddress: string;
  temporalReachable: boolean;
};

const PHASES = [
  { label: 'Plan', phase: 'planning' },
  { label: 'Investigate', phase: 'investigating' },
  { label: 'Implement', phase: 'implementing' },
  { label: 'Verify', phase: 'testing' },
] as const;

export function App() {
  const [mode, setMode] = useState<DemoMode>('baseline');
  const [runnerMode, setRunnerMode] = useState<RunnerMode>('fixture');
  const [snapshots, setSnapshots] = useState<Snapshots>({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const [preflight, setPreflight] = useState<Preflight>();
  const [selectedNodeId, setSelectedNodeId] = useState<RunNode['id']>('test-investigator');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const actionInFlight = useRef(false);
  const fleetActionRef = useRef<HTMLButtonElement>(null);
  const keepRunningRef = useRef<HTMLButtonElement>(null);
  const restoreFleetFocus = useRef(false);
  const consoleLaunchRef = useRef<HTMLButtonElement>(null);
  const restoreConsoleFocus = useRef(false);
  const snapshot = snapshots[mode] ?? createInitialSnapshot('preview', mode, runnerMode);
  const { action, actionLabel, runActive, showRunnerChoice } = deriveRunControlState(snapshot);
  const selectedNode = snapshot.nodes.find(({ id }) => id === selectedNodeId) ?? snapshot.nodes[0]!;

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
    if (!snapshot.runId || snapshot.runId === 'preview' || snapshot.frozen) return;
    if (snapshot.phase === 'complete' || snapshot.phase === 'failed') return;
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

  useEffect(() => {
    if (consoleOpen) {
      restoreConsoleFocus.current = true;
      return;
    }
    if (restoreConsoleFocus.current) {
      restoreConsoleFocus.current = false;
      consoleLaunchRef.current?.focus();
    }
  }, [consoleOpen]);

  useEffect(() => {
    if (confirmKill) {
      restoreFleetFocus.current = true;
      const frame = window.requestAnimationFrame(() => keepRunningRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (restoreFleetFocus.current) {
      restoreFleetFocus.current = false;
      fleetActionRef.current?.focus();
    }
  }, [confirmKill]);

  const codexReady = preflight === undefined
    ? undefined
    : isCodexLoginReady(preflight.codexLogin);
  const runtimeReady = (mode !== 'temporal' || preflight?.temporalReachable !== false)
    && (runnerMode !== 'live' || codexReady !== false);
  const runtimeLabel = preflight === undefined
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
                <strong>{snapshot.phase === 'failed' ? 'Run failed' : snapshot.workersOnline ? 'Running' : 'Workers stopped'}</strong>
                <small>{snapshot.phase === 'failed' && snapshot.workersOnline ? 'Workers still online' : runnerMode === 'live' ? 'Live Codex' : 'Fixture runtime'}</small>
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
            <ActionIcon actionLabel={actionLabel} />
            {busy ? 'Working…' : actionLabel}
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
        </div>
      </header>

      {requestError && <div className="request-error" role="alert">{requestError}</div>}

      <div className="content-frame">
        <section className="status-overview" aria-labelledby="phase-heading">
          <div className="status-copy">
            <span className="sr-only" data-testid="run-phase">{snapshot.phase}</span>
            <h1 id="phase-heading">{phaseTitle(snapshot.phase)}</h1>
            <p>{phaseSummary(snapshot)}</p>
          </div>
          <PhaseTrack phase={snapshot.phase} snapshot={snapshot} />
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
              node={snapshot.nodes.find(({ id }) => id === 'coordinator')!}
              onSelect={() => setSelectedNodeId('coordinator')}
              selected={selectedNodeId === 'coordinator'}
              summary={coordinatorSummary(snapshot.phase)}
            />
            <div className="tree-connector" aria-hidden="true" />
            <div className="worker-stack">
              {snapshot.nodes.filter(({ id }) => id !== 'coordinator').map((node) => (
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

function ActionIcon({ actionLabel }: { actionLabel: string }) {
  if (actionLabel === 'Kill workers') return <StopIcon aria-hidden="true" weight="fill" />;
  if (actionLabel === 'Restart workers') return <ArrowClockwiseIcon aria-hidden="true" weight="bold" />;
  return <PlayIcon aria-hidden="true" weight="fill" />;
}

function PhaseTrack({ phase, snapshot }: { phase: RunPhase; snapshot: RunSnapshot }) {
  const activeIndex = phaseIndex(phase, snapshot);
  return (
    <ol className="phase-track" aria-label="Run phases">
      {PHASES.map((item, index) => (
        <li className={phase === 'complete' || index < activeIndex ? 'complete' : index === activeIndex ? 'current' : ''} key={item.phase}>
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
        <span className="node-status-text">{statusLabel(node.status)}</span>
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
    : (snapshot.metrics.completedTests / snapshot.metrics.totalTests) * 100;

  return (
    <article className={`worker-node status-${node.status} ${selected ? 'selected' : ''}`} data-testid={`node-${node.id}`}>
      <button aria-expanded={selected} className="worker-summary" onClick={onSelect} type="button">
        <span className="worker-icon" aria-hidden="true"><NodeIcon nodeId={node.id} status={node.status} /></span>
        <span className="worker-identity">
          <strong>{workerRole(node.id)}</strong>
          <span>{node.detail ?? waitingCopy(node.id)}</span>
        </span>
        <span className="worker-state">
          <strong>{statusLabel(node.status)}</strong>
          <span>{statusDetail(node)}</span>
        </span>
        {selected ? <CaretUpIcon aria-hidden="true" /> : <CaretDownIcon aria-hidden="true" />}
      </button>

      {selected && (
        <div className="worker-expanded">
          <div className="activity-card">
            <span>Latest activity</span>
            <strong>{node.detail ?? waitingCopy(node.id)}</strong>
            <small>Attempt {node.attempt || '—'}</small>
          </div>
          <div className="checkpoint-card">
            <span>Test checkpoint</span>
            <strong data-testid="test-progress">{snapshot.metrics.completedTests} / {snapshot.metrics.totalTests}</strong>
            <div className="progress-track" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
            <small>{checkpointCopy(snapshot)}</small>
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
    <aside className="node-inspector" aria-label={`${workerRole(node.id)} details`} data-testid="node-inspector">
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
              <span>{traceNodeLabel(entry.nodeId)}</span>
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

function NodeIcon({ nodeId, status }: { nodeId: RunNode['id']; status: NodeStatus }) {
  if (status === 'complete') return <CheckCircleIcon weight="fill" />;
  if (status === 'running') return <CircleNotchIcon className="spinning" weight="bold" />;
  if (status === 'failed' || status === 'interrupted') return <XCircleIcon weight="fill" />;
  if (nodeId === 'source-investigator') return <MagnifyingGlassIcon />;
  if (nodeId === 'test-investigator') return <TestTubeIcon />;
  if (nodeId === 'test-job') return <PlayCircleIcon />;
  return <MinusCircleIcon />;
}

function phaseTitle(phase: RunPhase): string {
  if (phase === 'idle') return 'Ready to start';
  if (phase === 'planning') return 'Planning';
  if (phase === 'investigating') return 'Investigating';
  if (phase === 'implementing') return 'Implementing';
  if (phase === 'testing') return 'Verifying';
  if (phase === 'complete') return 'Run complete';
  if (phase === 'failed') return 'Run failed';
  return 'Workers stopped';
}

function phaseSummary(snapshot: RunSnapshot): string {
  const leaves = snapshot.nodes.filter(({ id }) => id !== 'coordinator');
  const completed = leaves.filter(({ status }) => status === 'complete').length;
  if (snapshot.phase === 'idle') return 'Choose a runtime, then start the reliability demo.';
  if (snapshot.phase === 'planning') return 'The coordinator is creating the delegation plan.';
  if (snapshot.phase === 'investigating') {
    return `The coordinator started two investigations and one test job. ${completed} of 3 branches ${completed === 1 ? 'has' : 'have'} completed.`;
  }
  if (snapshot.phase === 'implementing') return 'The investigations agree. The coordinator is applying the fix.';
  if (snapshot.phase === 'testing') return `The fix is in place. Tests are ${snapshot.metrics.completedTests} of ${snapshot.metrics.totalTests}.`;
  if (snapshot.phase === 'complete') return snapshot.summary ?? 'The fix is verified and the run is complete.';
  if (snapshot.phase === 'failed') return snapshot.error ?? 'The run stopped because a step failed.';
  return snapshot.mode === 'temporal'
    ? 'Event History kept the run. Restart the workers to continue.'
    : 'Process memory was lost. Restarting begins a new run.';
}

function coordinatorSummary(phase: RunPhase): string {
  if (phase === 'idle') return 'Ready to inspect the frozen fixture.';
  if (phase === 'planning') return 'Creating the delegation plan.';
  if (phase === 'investigating') return 'Dispatching investigations and consolidating results.';
  if (phase === 'implementing') return 'Applying the smallest verified fix.';
  if (phase === 'testing') return 'Coordinating final verification.';
  if (phase === 'complete') return 'Results consolidated and execution complete.';
  if (phase === 'failed') return 'Execution stopped on a failed step.';
  return 'Waiting for workers to restart.';
}

function phaseIndex(phase: RunPhase, snapshot: RunSnapshot): number {
  if (phase === 'planning') return 0;
  if (phase === 'investigating') return 1;
  if (phase === 'implementing') return 2;
  if (phase === 'testing' || phase === 'complete') return 3;
  if (phase === 'interrupted') {
    if (snapshot.metrics.completedTests > 0) return 3;
    if (snapshot.nodes.some(({ id, status }) => id !== 'coordinator' && status === 'complete')) return 1;
    return 0;
  }
  return -1;
}

function statusLabel(status: NodeStatus): string {
  if (status === 'complete') return 'Completed';
  if (status === 'running') return 'In progress';
  if (status === 'interrupted') return 'Interrupted';
  if (status === 'failed') return 'Failed';
  return 'Waiting';
}

function statusDetail(node: RunNode): string {
  if (node.status === 'complete') return node.detail ?? 'Work recorded.';
  if (node.status === 'running') return node.detail ?? 'Work is underway.';
  if (node.status === 'interrupted') return 'Worker stopped.';
  if (node.status === 'failed') return node.detail ?? 'This step failed.';
  return 'Queued for this phase.';
}

function checkpointCopy(snapshot: RunSnapshot): string {
  if (snapshot.phase === 'complete') return 'All tests passed.';
  if (snapshot.mode === 'temporal') return 'Progress is saved with the run.';
  return 'Progress lives inside this process.';
}

function workerRole(id: RunNode['id']): string {
  if (id === 'coordinator') return 'Coordinator';
  if (id === 'source-investigator') return 'Source investigator';
  if (id === 'test-investigator') return 'Test investigator';
  return 'Test runner';
}

function waitingCopy(id: RunNode['id']): string {
  if (id === 'coordinator') return 'Ready to inspect the frozen fixture.';
  if (id === 'test-job') return 'Queued with the investigations after planning.';
  return 'Queued until the coordinator returns the delegation plan.';
}

function shortThread(threadId: string): string {
  return threadId.length > 18 ? threadId.slice(0, 18) : threadId;
}

function traceNodeLabel(nodeId: RunSnapshot['trace'][number]['nodeId']): string {
  if (nodeId === 'source-investigator') return 'Source';
  if (nodeId === 'test-investigator') return 'Tests';
  if (nodeId === 'test-job') return 'Test runner';
  if (nodeId === 'system') return 'System';
  return 'Coordinator';
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed with ${response.status}`);
  return body;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
