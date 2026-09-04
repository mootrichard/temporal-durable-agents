import { tsToDate } from '@temporalio/common';
import type { temporal } from '@temporalio/proto';

import type { InvestigatorId } from '../shared/delegation-plan.js';
import type { NodeId } from '../shared/run-snapshot.js';
import type { TimelineSpan, TimelineSpanStatus, WorkflowTimeline } from '../shared/workflow-timeline.js';

type HistoryEvent = temporal.api.history.v1.IHistoryEvent;
type History = temporal.api.history.v1.IHistory;

export type ChildHistory = {
  workflowId: string;
  laneId: InvestigatorId;
  history: History;
};

const childLabels: Record<InvestigatorId, string> = {
  'source-investigator': 'Source investigation',
  'test-investigator': 'Test investigation',
};

const activityLabels: Record<string, string> = {
  runCodexTurn: 'Codex turn',
  runTests: 'Test run',
  getDiff: 'Collect diff',
};

export function projectWorkflowTimeline(
  runId: string,
  rootHistory: History,
  children: ChildHistory[] = [],
  observedAt = new Date(),
): WorkflowTimeline {
  const rootEvents = timedEvents(rootHistory);
  if (rootEvents.length === 0) throw new Error(`Workflow ${runId} has no recorded history`);

  const root = workflowSpan(rootEvents, `${runId}-workflow`, 'coordinator', 'FixWorkflow', 'Workflow execution');
  const spans = [root, ...activitySpans(rootEvents, 'coordinator', runId)];
  for (const child of children) {
    const events = timedEvents(child.history);
    if (events.length === 0) continue;
    spans.push(
      workflowSpan(events, `${child.workflowId}-workflow`, child.laneId, childLabels[child.laneId], 'Child Workflow'),
      ...activitySpans(events, child.laneId, child.workflowId),
    );
  }

  return {
    runId,
    observedAt: observedAt.toISOString(),
    startTime: root.startTime,
    endTime: root.endTime,
    eventCount: rootEvents.length + children.reduce(
      (total, child) => total + (child.history.events?.length ?? 0),
      0,
    ),
    spans: spans.sort((left, right) => left.startTime.localeCompare(right.startTime)),
  };
}

function workflowSpan(
  events: HistoryEvent[],
  id: string,
  laneId: NodeId,
  label: string,
  noun: string,
): TimelineSpan {
  const endEvent = events.findLast(isWorkflowTerminal);
  return {
    id,
    laneId,
    label,
    detail: endEvent ? `${noun} recorded` : `${noun} in progress`,
    startTime: timeOf(events[0]!),
    endTime: endEvent && timeOf(endEvent),
    status: endEvent ? terminalStatus(endEvent) : 'running',
  };
}

function activitySpans(
  events: HistoryEvent[],
  defaultLane: NodeId,
  workflowId: string,
): TimelineSpan[] {
  const scheduled = new Map<string, HistoryEvent>();
  const starts = new Map<string, HistoryEvent[]>();
  const terminalByStart = new Map<string, HistoryEvent>();

  for (const event of events) {
    if (event.activityTaskScheduledEventAttributes) {
      scheduled.set(eventId(event), event);
    }
    const started = event.activityTaskStartedEventAttributes;
    if (started?.scheduledEventId) {
      const key = started.scheduledEventId.toString();
      starts.set(key, [...(starts.get(key) ?? []), event]);
    }
    const terminal = activityTerminalAttributes(event);
    if (terminal?.startedEventId) terminalByStart.set(terminal.startedEventId.toString(), event);
  }

  const spans: TimelineSpan[] = [];
  for (const [scheduledId, scheduledEvent] of scheduled) {
    const attributes = scheduledEvent.activityTaskScheduledEventAttributes!;
    const activityName = attributes.activityType?.name || attributes.activityId || 'Activity';
    const label = activityLabels[activityName] ?? activityName;
    const laneId = activityName === 'runTests' ? 'test-job' : defaultLane;
    const activityStarts = starts.get(scheduledId) ?? [];
    if (activityStarts.length === 0) {
      spans.push({
        id: `${workflowId}-activity-${scheduledId}`,
        laneId,
        label,
        detail: 'Scheduled · waiting for a Worker',
        startTime: timeOf(scheduledEvent),
        status: 'scheduled',
      });
      continue;
    }

    activityStarts.forEach((startEvent, index) => {
      const terminal = terminalByStart.get(eventId(startEvent));
      const attempt = startEvent.activityTaskStartedEventAttributes!.attempt || index + 1;
      spans.push({
        id: `${workflowId}-activity-${scheduledId}-attempt-${attempt}`,
        laneId,
        label,
        detail: terminal ? activityTerminalDetail(terminal) : 'Activity attempt in progress',
        startTime: index === 0 ? timeOf(scheduledEvent) : timeOf(startEvent),
        endTime: terminal && timeOf(terminal),
        status: terminal ? terminalStatus(terminal) : 'running',
        attempt,
      });
    });
  }
  return spans;
}

function timedEvents(history: History): HistoryEvent[] {
  return (history.events ?? []).filter((event) => event.eventTime);
}

function timeOf(event: HistoryEvent): string {
  if (!event.eventTime) throw new Error('Temporal history event is missing its event time');
  return tsToDate(event.eventTime).toISOString();
}

function eventId(event: HistoryEvent): string {
  return event.eventId?.toString() ?? '0';
}

function isWorkflowTerminal(event: HistoryEvent): boolean {
  return Boolean(
    event.workflowExecutionCompletedEventAttributes
    || event.workflowExecutionFailedEventAttributes
    || event.workflowExecutionTimedOutEventAttributes
    || event.workflowExecutionCanceledEventAttributes
    || event.workflowExecutionTerminatedEventAttributes
    || event.workflowExecutionContinuedAsNewEventAttributes,
  );
}

function activityTerminalAttributes(event: HistoryEvent) {
  return event.activityTaskCompletedEventAttributes
    ?? event.activityTaskFailedEventAttributes
    ?? event.activityTaskTimedOutEventAttributes
    ?? event.activityTaskCanceledEventAttributes;
}

function terminalStatus(event: HistoryEvent): Extract<TimelineSpanStatus, 'complete' | 'failed'> {
  return event.workflowExecutionCompletedEventAttributes
    || event.workflowExecutionContinuedAsNewEventAttributes
    || event.activityTaskCompletedEventAttributes
    ? 'complete'
    : 'failed';
}

function activityTerminalDetail(event: HistoryEvent): string {
  if (event.activityTaskCompletedEventAttributes) return 'Activity result recorded';
  if (event.activityTaskTimedOutEventAttributes) return 'Activity attempt timed out';
  if (event.activityTaskCanceledEventAttributes) return 'Activity attempt canceled';
  return 'Activity attempt failed';
}
