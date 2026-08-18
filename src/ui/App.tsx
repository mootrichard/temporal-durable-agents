import { useEffect, useMemo, useRef, useState } from 'react';

import { createInitialSnapshot, type DemoMode, type RunnerMode, type RunSnapshot } from '../shared/run-snapshot.js';

type Snapshots = Partial<Record<DemoMode, RunSnapshot>>;

export function App() {
  const [mode, setMode] = useState<DemoMode>('baseline');
  const [runnerMode, setRunnerMode] = useState<RunnerMode>('fixture');
  const [snapshots, setSnapshots] = useState<Snapshots>({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const actionInFlight = useRef(false);
  const snapshot = snapshots[mode] ?? createInitialSnapshot('preview', mode, runnerMode);
  const runFinished = snapshot.phase === 'complete' || snapshot.phase === 'failed';

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

  const act = mode === 'baseline' ? 'ACT I' : 'ACT II';
  const ownership = mode === 'baseline' ? 'PROCESS MEMORY OWNS THE RUN' : 'EVENT HISTORY OWNS THE RUN';
  const actionLabel = snapshot.runId === 'preview'
    ? 'Start run'
    : runFinished
      ? 'Start new run'
      : snapshot.frozen
        ? 'Restart workers'
        : 'Kill all workers';

  async function start(): Promise<void> {
    await perform(async () => {
      const created = await api<RunSnapshot>('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ mode, runnerMode }),
      });
      setSnapshots((existing) => ({ ...existing, [mode]: created }));
    });
  }

  async function actOnFleet(): Promise<void> {
    if (snapshot.runId === 'preview' || runFinished) return start();
    const operation = snapshot.frozen ? 'restart' : 'kill';
    await perform(async () => {
      const changed = await api<RunSnapshot>(`/api/runs/${snapshot.runId}/${operation}`, {
        method: 'POST',
      });
      setSnapshots((existing) => ({ ...existing, [mode]: changed }));
    });
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
      <header className="masthead">
        <div className="title-lockup">
          <span className="eyebrow">A durable agent execution field test</span>
          <h1>The orchestrator died.<br /><em>The work didn’t.</em></h1>
        </div>
        <div className="act-switch" aria-label="Choose demo act">
          {(['baseline', 'temporal'] as const).map((candidate) => (
            <button
              className={mode === candidate ? 'active' : ''}
              key={candidate}
              onClick={() => setMode(candidate)}
              type="button"
            >
              <span>{candidate === 'baseline' ? 'Act I' : 'Act II'}</span>
              {candidate === 'baseline' ? 'Process tree' : 'Execution tree'}
            </button>
          ))}
        </div>
      </header>

      <section className="control-strip" aria-label="Demo controls">
        <div className="act-caption"><b>{act}</b><span>{ownership}</span></div>
        <div className="runner-switch" aria-label="Codex runner">
          <button className={runnerMode === 'fixture' ? 'active' : ''} onClick={() => setRunnerMode('fixture')}>Fixture</button>
          <button className={runnerMode === 'live' ? 'active' : ''} onClick={() => setRunnerMode('live')}>Live Codex</button>
        </div>
        <button
          data-testid="fleet-action"
          className={`fleet-action ${snapshot.frozen ? 'restart' : ''}`}
          disabled={busy}
          onClick={actOnFleet}
          type="button"
        >
          <span className="action-mark" aria-hidden="true">{snapshot.frozen ? '↻' : snapshot.runId === 'preview' || runFinished ? '▶' : '■'}</span>
          {busy ? 'Working…' : actionLabel}
        </button>
      </section>

      {requestError && <div className="request-error" role="alert">{requestError}</div>}

      <section className="stage">
        <ExecutionTree snapshot={snapshot} />
        <EvidenceRail snapshot={snapshot} />
      </section>

      <footer className="footer-line">
        <span>Worker process ≠ execution</span>
        <span>{mode === 'temporal' ? 'Temporal resumes from durable history' : 'Restart creates a fresh in-memory run'}</span>
        <span>Run {snapshot.runId === 'preview' ? '—' : snapshot.runId}</span>
      </footer>
    </main>
  );
}

function ExecutionTree({ snapshot }: { snapshot: RunSnapshot }) {
  const coordinator = snapshot.nodes.find(({ id }) => id === 'coordinator')!;
  const leaves = snapshot.nodes.filter(({ id }) => id !== 'coordinator');

  return (
    <div className="tree-panel">
      <div className="fleet-state">
        <span className={`fleet-lamp ${snapshot.workersOnline ? 'online' : 'offline'}`} />
        Worker fleet {snapshot.workersOnline ? 'online' : 'offline'}
        {snapshot.frozen && <strong>last known snapshot</strong>}
      </div>
      <div className="tree" data-testid="execution-tree">
        <AgentNode node={coordinator} primary />
        <div className="trunk" aria-hidden="true"><span /></div>
        <div className="leaf-grid">
          {leaves.map((node) => <AgentNode key={node.id} node={node} />)}
        </div>
        {snapshot.frozen && (
          <div className="freeze-stamp" data-testid="frozen-snapshot">
            <span>WORKERS OFFLINE</span>
            <b>{snapshot.mode === 'temporal' ? 'History is waiting.' : 'Memory is gone.'}</b>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentNode({ node, primary = false }: { node: RunSnapshot['nodes'][number]; primary?: boolean }) {
  return (
    <article className={`agent-node status-${node.status} ${primary ? 'primary' : ''}`}>
      <div className="node-topline">
        <span className="node-kind">{node.kind}</span>
        <span className="node-status"><i />{node.status}</span>
      </div>
      <h2>{node.label}</h2>
      <p>{node.detail ?? waitingCopy(node.id)}</p>
      <div className="node-receipt">
        <span>{node.threadId ? `thread ${node.threadId.slice(0, 12)}` : 'thread —'}</span>
        <span>attempt {node.attempt || '—'}</span>
      </div>
    </article>
  );
}

function EvidenceRail({ snapshot }: { snapshot: RunSnapshot }) {
  const progress = snapshot.metrics.totalTests === 0
    ? 0
    : (snapshot.metrics.completedTests / snapshot.metrics.totalTests) * 100;
  const diffLines = useMemo(() => snapshot.diff?.split('\n').filter(Boolean) ?? [], [snapshot.diff]);

  return (
    <aside className="evidence-rail">
      <div className="phase-readout">
        <span>Current phase</span>
        <b data-testid="run-phase">{snapshot.phase}</b>
        <small>snapshot #{snapshot.sequence.toString().padStart(2, '0')}</small>
      </div>

      <div className="metric-pair">
        <div><strong data-testid="completed-turns">{snapshot.metrics.completedCodexTurns}</strong><span>Codex turns<br />recorded</span></div>
        <div><strong>{snapshot.metrics.retriedCodexTurns}</strong><span>turns<br />retried</span></div>
      </div>

      <div className="test-progress">
        <div><span>Test checkpoint</span><b data-testid="test-progress">{snapshot.metrics.completedTests} / {snapshot.metrics.totalTests}</b></div>
        <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
        <small>{snapshot.mode === 'temporal' ? 'Passed files are heartbeat checkpoints.' : 'Progress lives inside the process.'}</small>
      </div>

      <div className="diff-window">
        <div className="diff-title"><span>Final diff</span><b>{snapshot.diff ? 'verified' : 'pending'}</b></div>
        <pre data-testid="final-diff">
          {diffLines.length > 0
            ? diffLines.map((line, index) => <code className={line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : ''} key={`${line}-${index}`}>{line}{'\n'}</code>)
            : <code className="empty">The verified patch will appear here.</code>}
        </pre>
      </div>

      <div className="ownership-ledger">
        <span>State ownership</span>
        <dl>
          <div><dt>Orchestration</dt><dd>{snapshot.mode === 'temporal' ? 'Temporal history' : 'JS memory'}</dd></div>
          <div><dt>Agent context</dt><dd>Codex session</dd></div>
          <div><dt>Code</dt><dd>isolated Git worktree</dd></div>
          <div><dt>Test progress</dt><dd>{snapshot.mode === 'temporal' ? 'Activity heartbeat' : 'local promise'}</dd></div>
        </dl>
      </div>
    </aside>
  );
}

function waitingCopy(id: RunSnapshot['nodes'][number]['id']): string {
  if (id === 'coordinator') return 'Waiting to inspect the frozen fixture.';
  if (id === 'test-job') return 'Four test files, one known failure.';
  return 'Bounded read-only investigation.';
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
