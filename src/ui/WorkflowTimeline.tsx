import {
  ArrowsOutSimpleIcon,
  ChartBarHorizontalIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { RunSnapshot } from '../shared/run-snapshot.js';
import type {
  TimelineLaneId,
  TimelineSpan,
  WorkflowTimeline as WorkflowTimelineData,
} from '../shared/workflow-timeline.js';

type WorkflowTimelineProps = {
  onClose: () => void;
  snapshot: RunSnapshot;
};

const LANES: Array<{ id: TimelineLaneId; label: string; detail: string }> = [
  { id: 'coordinator', label: 'Coordinator', detail: 'Parent Workflow' },
  { id: 'source-investigator', label: 'Source investigator', detail: 'Child Workflow' },
  { id: 'test-investigator', label: 'Test investigator', detail: 'Child Workflow' },
  { id: 'test-job', label: 'Test runner', detail: 'Activity' },
];

const ZOOM_LEVELS = [1, 1.75, 3] as const;

export function WorkflowTimeline({ onClose, snapshot }: WorkflowTimelineProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [timeline, setTimeline] = useState<WorkflowTimelineData>();
  const [error, setError] = useState<string>();
  const [zoomIndex, setZoomIndex] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/runs/${encodeURIComponent(snapshot.runId)}/timeline`);
        const body = await response.json() as WorkflowTimelineData | { error?: string };
        if (!response.ok) throw new Error('error' in body && body.error ? body.error : `Request failed (${response.status})`);
        if (active) {
          setTimeline(body as WorkflowTimelineData);
          setError(undefined);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : String(caught));
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 1_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [snapshot.runId]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const duration = timeline ? formatDuration(
    Date.parse(timeline.endTime ?? timeline.observedAt) - Date.parse(timeline.startTime),
  ) : '—';

  return (
    <div
      className="agent-console-backdrop workflow-timeline-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        aria-labelledby="workflow-timeline-title"
        aria-modal="true"
        className="agent-console-dialog workflow-timeline-dialog"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <header className="agent-console-header">
          <div className="agent-console-title">
            <span aria-hidden="true"><ChartBarHorizontalIcon weight="duotone" /></span>
            <div>
              <h2 id="workflow-timeline-title">Workflow timeline</h2>
              <p>Temporal Event History grouped into execution spans.</p>
            </div>
          </div>

          <div className="agent-console-run">
            <span className={snapshot.workersOnline ? '' : 'offline'}>
              <i />{snapshot.workersOnline ? 'History live' : 'Compute offline'}
            </span>
            <code>{snapshot.runId}</code>
          </div>

          <button
            ref={closeButtonRef}
            aria-label="Close workflow timeline"
            className="agent-console-close"
            onClick={onClose}
            type="button"
          >
            <XIcon aria-hidden="true" />
          </button>
        </header>

        <div className="timeline-toolbar">
          <div className="timeline-summary" aria-live="polite">
            <span><strong>{timeline?.eventCount ?? '—'}</strong> recorded events</span>
            <span><strong>{duration}</strong> execution time</span>
          </div>
          <div className="timeline-zoom" aria-label="Timeline zoom" role="group">
            <button
              aria-label="Zoom out"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
              type="button"
            ><MagnifyingGlassMinusIcon aria-hidden="true" /></button>
            <button onClick={() => setZoomIndex(0)} type="button">
              <ArrowsOutSimpleIcon aria-hidden="true" />Fit
            </button>
            <button
              aria-label="Zoom in"
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
              type="button"
            ><MagnifyingGlassPlusIcon aria-hidden="true" /></button>
          </div>
        </div>

        <div className="timeline-body">
          {error && !timeline ? (
            <div className="timeline-message timeline-error" role="alert">
              <strong>Timeline unavailable</strong>
              <span>{error}</span>
            </div>
          ) : !timeline ? (
            <div className="timeline-message" role="status">Reading Event History…</div>
          ) : (
            <TimelineChart
              timeline={timeline}
              workersOnline={snapshot.workersOnline}
              zoom={ZOOM_LEVELS[zoomIndex]!}
            />
          )}
        </div>

        <footer className="agent-console-footer workflow-timeline-footer">
          <span><i className="violet" />Running</span>
          <span><i className="green" />Recorded</span>
          <span><i className="red" />Failed or interrupted</span>
          <strong>Temporal Event History is the source</strong>
        </footer>
      </section>
    </div>
  );
}

export default WorkflowTimeline;

function TimelineChart({
  timeline,
  workersOnline,
  zoom,
}: {
  timeline: WorkflowTimelineData;
  workersOnline: boolean;
  zoom: number;
}) {
  const start = Date.parse(timeline.startTime);
  const observedEnd = Date.parse(timeline.endTime ?? timeline.observedAt);
  const total = Math.max(observedEnd - start, 1);
  const ticks = useMemo(() => Array.from({ length: 6 }, (_, index) => ({
    label: formatDuration(total * index / 5),
    left: `${index * 20}%`,
  })), [total]);

  return (
    <div className="timeline-scroll" data-testid="workflow-timeline">
      <div className="timeline-canvas" style={{ width: `${zoom * 100}%` }}>
        <div className="timeline-ruler" aria-hidden="true">
          <div className="timeline-lane-label ruler-label">Execution</div>
          <div className="timeline-ruler-track">
            {ticks.map((tick) => <span key={tick.left} style={{ left: tick.left }}>{tick.label}</span>)}
          </div>
        </div>
        {LANES.map((lane) => {
          const spans = timeline.spans.filter(({ laneId }) => laneId === lane.id);
          return (
            <div className="timeline-lane" key={lane.id}>
              <div className="timeline-lane-label">
                <strong>{lane.label}</strong>
                <span>{lane.detail}</span>
              </div>
              <div
                className="timeline-lane-track"
                style={{ minHeight: `${Math.max(62, spans.length * 37 + 20)}px` }}
              >
                <div className="timeline-grid" aria-hidden="true">
                  {ticks.map((tick) => <i key={tick.left} style={{ left: tick.left }} />)}
                </div>
                {spans.map((span, index) => (
                  <TimelineBar
                    index={index}
                    key={span.id}
                    observedEnd={observedEnd}
                    span={span}
                    start={start}
                    total={total}
                  />
                ))}
                {spans.length === 0 && <span className="timeline-empty-lane">Waiting for history</span>}
                {!workersOnline && <div className="timeline-compute-gap"><span>compute offline</span></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineBar({
  index,
  observedEnd,
  span,
  start,
  total,
}: {
  index: number;
  observedEnd: number;
  span: TimelineSpan;
  start: number;
  total: number;
}) {
  const spanStart = Date.parse(span.startTime);
  const spanEnd = Date.parse(span.endTime ?? new Date(observedEnd).toISOString());
  const left = Math.max(0, (spanStart - start) / total * 100);
  const width = Math.max(.8, (Math.max(spanEnd, spanStart) - spanStart) / total * 100);
  const title = `${span.label}. ${span.detail}. Started ${formatDuration(spanStart - start)} into the run${span.endTime ? ` and lasted ${formatDuration(spanEnd - spanStart)}` : ''}.`;
  return (
    <div
      aria-label={title}
      className={`timeline-bar status-${span.status}`}
      role="img"
      style={{ left: `${left}%`, top: `${12 + index * 37}px`, width: `${Math.min(width, 100 - left)}%` }}
      title={title}
    >
      <strong>{span.label}</strong>
      {span.attempt && <span>A{span.attempt}</span>}
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${Math.max(0, Math.round(milliseconds))} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}
