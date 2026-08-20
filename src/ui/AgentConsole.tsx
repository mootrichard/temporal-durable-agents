import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { TerminalWindowIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef } from 'react';

import type { RunNode, RunSnapshot, RunTraceEntry } from '../shared/run-snapshot.js';
import '@xterm/xterm/css/xterm.css';

type AgentConsoleProps = {
  onClose: () => void;
  snapshot: RunSnapshot;
};

type TerminalSystemState = {
  attempt?: number;
  detail?: string;
  threadId?: string;
  workersOnline?: boolean;
};

const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[38;2;126;137;166m',
  text: '\u001b[38;2;223;228;242m',
  violet: '\u001b[38;2;155;143;255m',
  green: '\u001b[38;2;109;211;154m',
  amber: '\u001b[38;2;245;190;83m',
  red: '\u001b[38;2;255;111;123m',
  cyan: '\u001b[38;2;103;202;224m',
};

export function AgentConsole({ onClose, snapshot }: AgentConsoleProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const attachmentRef = useRef<{
    nodeEntryCounts: Partial<Record<RunNode['id'], number>>;
    sequence: number;
    traceCount: number;
  } | null>(null);
  if (attachmentRef.current === null) {
    attachmentRef.current = {
      nodeEntryCounts: Object.fromEntries(snapshot.nodes.map((node) => [
        node.id,
        snapshot.trace.filter(({ nodeId }) => nodeId === node.id).length,
      ])),
      sequence: snapshot.sequence,
      traceCount: snapshot.trace.length,
    };
  }
  const attachment = attachmentRef.current;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButtonRef.current?.focus();
    }
  }

  return (
    <div
      className="agent-console-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="agent-console-title"
        aria-modal="true"
        className="agent-console-dialog"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <header className="agent-console-header">
          <div className="agent-console-title">
            <span aria-hidden="true"><TerminalWindowIcon weight="duotone" /></span>
            <div>
              <h2 id="agent-console-title">Agent consoles</h2>
              <p data-testid="agent-console-attachment">
                {attachment.traceCount > 0
                  ? `Attached at snapshot #${attachment.sequence} · replaying ${attachment.traceCount} recorded events, then following live progress.`
                  : `Attached at snapshot #${attachment.sequence} · waiting at the live edge.`}
              </p>
            </div>
          </div>

          <div className="agent-console-run">
            <span className={snapshot.workersOnline ? 'online' : 'offline'}>
              <i />{snapshot.workersOnline ? 'Fleet online' : 'Fleet offline'}
            </span>
            <code>{snapshot.runId}</code>
          </div>

          <button
            ref={closeButtonRef}
            aria-label="Close agent consoles"
            className="agent-console-close"
            onClick={onClose}
            type="button"
          >
            <XIcon aria-hidden="true" />
          </button>
        </header>

        <div className="agent-console-grid">
          {snapshot.nodes.map((node, index) => (
            <AgentTerminalPane
              entries={snapshot.trace.filter(({ nodeId }) => nodeId === node.id)}
              index={index + 1}
              initialEntryCount={attachment.nodeEntryCounts[node.id] ?? 0}
              key={node.id}
              node={node}
              snapshot={snapshot}
            />
          ))}
        </div>

        <footer className="agent-console-footer">
          <span><i className="violet" />Live SDK event</span>
          <span><i className="green" />{snapshot.mode === 'temporal' ? 'Durable receipt' : 'Completed event'}</span>
          <span><i className="red" />Worker interruption</span>
          <strong>{snapshot.mode === 'temporal' ? 'Event History owns continuation' : 'Process memory owns continuation'}</strong>
        </footer>
      </section>
    </div>
  );
}

export default AgentConsole;

function AgentTerminalPane({
  entries,
  index,
  initialEntryCount,
  node,
  snapshot,
}: {
  entries: RunTraceEntry[];
  index: number;
  initialEntryCount: number;
  node: RunNode;
  snapshot: RunSnapshot;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const renderedEntriesRef = useRef(new Map<string, string>());
  const initialBoundaryRenderedRef = useRef(false);
  const systemStateRef = useRef<TerminalSystemState>({});
  const label = consoleLabel(node.id);
  const accessibleTranscript = useMemo(
    () => [
      snapshot.workersOnline
        ? 'Worker fleet online.'
        : snapshot.mode === 'temporal'
          ? 'Workers stopped. Event History retained.'
          : 'Workers stopped. Process memory lost.',
      initialEntryCount > 0
        ? `${initialEntryCount} events were recorded before this console opened. Following live events now.`
        : 'Console opened at the live edge. Following new events.',
      node.detail,
      ...entries.map(({ message }) => sanitizeTerminalText(message)),
    ].filter(Boolean).join(' '),
    [entries, initialEntryCount, node.detail, snapshot.mode, snapshot.workersOnline],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const terminal = new Terminal({
      allowTransparency: true,
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: '"SFMono-Regular", "SF Mono", Menlo, Consolas, monospace',
      fontSize: 11.5,
      letterSpacing: 0.2,
      lineHeight: 1.38,
      scrollback: 500,
      theme: {
        background: '#0b1020',
        foreground: '#dfe4f2',
        cursor: '#9b8fff',
        selectionBackground: '#34305f',
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);
    terminalRef.current = terminal;
    terminal.writeln(`${ANSI.dim}agent://${node.id}${ANSI.reset}`);
    terminal.writeln(`${ANSI.bold}${ANSI.text}${label}${ANSI.reset} ${ANSI.dim}read-only stream attached${ANSI.reset}`);
    terminal.writeln('');

    const fit = () => {
      if (host.clientWidth > 0 && host.clientHeight > 0) fitAddon.fit();
    };
    const frame = window.requestAnimationFrame(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(host);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      renderedEntriesRef.current.clear();
      initialBoundaryRenderedRef.current = false;
      systemStateRef.current = {};
    };
  }, [label, node.id]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const previous = systemStateRef.current;

    if (previous.workersOnline !== snapshot.workersOnline) {
      terminal.writeln(snapshot.workersOnline
        ? terminalDivider(
            previous.workersOnline === false
              ? 'WORKER FLEET ONLINE · STREAM RESUMED'
              : 'WORKER FLEET ONLINE · LIVE STREAM ATTACHED',
            ANSI.green,
          )
        : terminalDivider(
            snapshot.mode === 'temporal'
              ? 'WORKERS STOPPED · EVENT HISTORY RETAINED'
              : 'WORKERS STOPPED · PROCESS MEMORY LOST',
            ANSI.red,
          ));
    }
    const renderingInitialSnapshot = !initialBoundaryRenderedRef.current;
    if (renderingInitialSnapshot && initialEntryCount > 0) {
      terminal.writeln(terminalDivider(
        `REPLAYING ${initialEntryCount} RECORDED ${initialEntryCount === 1 ? 'EVENT' : 'EVENTS'}`,
        ANSI.amber,
      ));
    }
    if (node.attempt > 1 && previous.attempt !== node.attempt) {
      terminal.writeln(terminalDivider(`REPLACEMENT WORKER · ATTEMPT ${node.attempt}`, ANSI.green));
    }
    if (node.threadId && previous.threadId !== node.threadId) {
      terminal.writeln(`${ANSI.cyan}◆ THREAD${ANSI.reset} ${sanitizeTerminalText(node.threadId)}`);
    }
    if (node.detail && previous.detail !== node.detail) {
      terminal.writeln(`${statusColor(node.status)}● ${statusWord(node.status)}${ANSI.reset} ${sanitizeTerminalText(node.detail)}`);
    }

    for (const entry of entries) {
      const signature = `${entry.status}:${entry.kind}:${entry.message}`;
      if (renderedEntriesRef.current.get(entry.id) === signature) continue;
      renderedEntriesRef.current.set(entry.id, signature);
      terminal.writeln(formatTraceEntry(entry));
    }
    if (renderingInitialSnapshot) {
      terminal.writeln(terminalDivider(
        initialEntryCount > 0 ? 'LIVE EDGE · NEW EVENTS FOLLOW' : 'LIVE EDGE · WAITING FOR FIRST EVENT',
        ANSI.cyan,
      ));
      initialBoundaryRenderedRef.current = true;
    }
    terminal.scrollToBottom();
    systemStateRef.current = {
      attempt: node.attempt,
      detail: node.detail,
      threadId: node.threadId,
      workersOnline: snapshot.workersOnline,
    };
  }, [entries, initialEntryCount, node.attempt, node.detail, node.status, node.threadId, snapshot.mode, snapshot.workersOnline]);

  return (
    <section aria-label={`${label} console`} className={`agent-terminal-pane status-${node.status}`} role="region">
      <header className="agent-terminal-header">
        <span>{String(index).padStart(2, '0')}</span>
        <div>
          <strong>{label}</strong>
          <small>{node.detail ?? 'Waiting for work'}</small>
        </div>
        <div className="agent-terminal-state">
          <strong><i />{statusWord(node.status)}</strong>
          <code>{node.threadId ? shortThread(node.threadId) : `attempt ${node.attempt || '—'}`}</code>
        </div>
      </header>
      <div aria-hidden="true" className="agent-terminal-host" ref={hostRef} />
      <p
        aria-live="polite"
        className="sr-only"
        data-testid={`agent-console-transcript-${node.id}`}
      >
        {accessibleTranscript}
      </p>
    </section>
  );
}

function formatTraceEntry(entry: RunTraceEntry): string {
  const message = sanitizeTerminalText(entry.message);
  const color = entry.status === 'failed'
    ? ANSI.red
    : entry.status === 'complete'
      ? ANSI.green
      : entry.kind === 'thread'
        ? ANSI.cyan
        : ANSI.violet;
  const prefix = entry.kind === 'tool'
    ? '$ TOOL'
    : entry.kind === 'reasoning'
      ? '· THINK'
      : entry.kind === 'thread'
        ? '◆ THREAD'
        : entry.kind === 'error'
          ? '! ERROR'
          : entry.kind === 'status'
            ? '● STATUS'
            : '› AGENT';
  return `${color}${prefix}${ANSI.reset} ${message}`;
}

function terminalDivider(label: string, color: string): string {
  return `${color}──── ${label} ────${ANSI.reset}`;
}

function statusColor(status: RunNode['status']): string {
  if (status === 'complete') return ANSI.green;
  if (status === 'failed' || status === 'interrupted') return ANSI.red;
  if (status === 'running') return ANSI.violet;
  return ANSI.amber;
}

function statusWord(status: RunNode['status']): string {
  if (status === 'complete') return 'Complete';
  if (status === 'failed') return 'Failed';
  if (status === 'interrupted') return 'Interrupted';
  if (status === 'running') return 'Running';
  return 'Waiting';
}

function consoleLabel(id: RunNode['id']): string {
  if (id === 'coordinator') return 'Coordinator';
  if (id === 'source-investigator') return 'Source investigator';
  if (id === 'test-investigator') return 'Test investigator';
  return 'Test runner';
}

function shortThread(threadId: string): string {
  return threadId.length > 20 ? `${threadId.slice(0, 17)}…` : threadId;
}

function sanitizeTerminalText(value: string): string {
  return value
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}
