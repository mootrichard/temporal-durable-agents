import { tsToDate } from '@temporalio/common';
import type { temporal } from '@temporalio/proto';

import type {
  TimelineLaneId,
  TimelineSpan,
  TimelineSpanStatus,
  WorkflowTimeline,
} from '../shared/workflow-timeline.js';

type HistoryEvent = temporal.api.history.v1.IHistoryEvent;
type History = temporal.api.history.v1.IHistory;
type HistorySource = {
  history: History;
  laneId: TimelineLaneId;
  label: string;
  workflowId: string;
};

export function projectWorkflowTimeline(
  runId: string,
  rootHistory: History,
  childHistories: HistorySource[] = [],
  observedAt = new Date(),
): WorkflowTimeline {
  const rootEvents = timedEvents(rootHistory);
  if (rootEvents.length === 0) throw new Error(`Workflow ${runId} has no recorded history`);

  const rootStart = timeOf(rootEvents[0]!);
  const rootEndEvent = lastMatching(rootEvents, isWorkflowTerminal);
  const rootEnd = rootEndEvent ? timeOf(rootEndEvent) : undefined;
  const rootStatus = rootEndEvent ? terminalStatus(rootEndEvent) : 'running';
  const spans: TimelineSpan[] = [
    {
      id: `${runId}-workflow`,
      laneId: 'coordinator',
      label: 'FixWorkflow',
      detail: rootEnd ? 'Workflow execution recorded' : 'Workflow execution in progress',
      startTime: rootStart,
      endTime: rootEnd,
      status: rootStatus,
    },
    ...activitySpans(rootEvents, 'coordinator', runId),
  ];

  const detailedChildren = new Set(childHistories.map(({ workflowId }) => workflowId));
  spans.push(...childWorkflowSpans(rootEvents, detailedChildren));

  for (const child of childHistories) {
    const events = timedEvents(child.history);
    if (events.length === 0) continue;
    const endEvent = lastMatching(events, isWorkflowTerminal);
    spans.push({
      id: `${child.workflowId}-workflow`,
      laneId: child.laneId,
      label: child.label,
      detail: endEvent ? 'Child Workflow recorded' : 'Child Workflow in progress',
      startTime: timeOf(events[0]!),
      endTime: endEvent ? timeOf(endEvent) : undefined,
      status: endEvent ? terminalStatus(endEvent) : 'running',
    });
    spans.push(...activitySpans(events, child.laneId, child.workflowId));
  }

  return {
    runId,
    observedAt: observedAt.toISOString(),
    startTime: rootStart,
    endTime: rootEnd,
    eventCount: rootEvents.length + childHistories.reduce(
      (total, child) => total + (child.history.events?.length ?? 0),
      0,
    ),
    spans: spans.sort((left, right) => left.startTime.localeCompare(right.startTime)),
  };
}

function activitySpans(
  events: HistoryEvent[],
  defaultLane: TimelineLaneId,
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
    const activityStarts = starts.get(scheduledId) ?? [];
    const laneId = activityLane(activityName, defaultLane);
    if (activityStarts.length === 0) {
      spans.push({
        id: `${workflowId}-activity-${scheduledId}`,
        laneId,
        label: friendlyActivityName(activityName),
        detail: 'Scheduled · waiting for a Worker',
        startTime: timeOf(scheduledEvent),
        status: 'scheduled',
      });
      continue;
    }

    activityStarts.forEach((startEvent, index) => {
      const started = startEvent.activityTaskStartedEventAttributes!;
      const terminal = terminalByStart.get(eventId(startEvent));
      const attempt = started.attempt || index + 1;
      spans.push({
        id: `${workflowId}-activity-${scheduledId}-attempt-${attempt}`,
        laneId,
        label: friendlyActivityName(activityName),
        detail: terminal ? activityTerminalDetail(terminal) : 'Activity attempt in progress',
        startTime: index === 0 ? timeOf(scheduledEvent) : timeOf(startEvent),
        endTime: terminal ? timeOf(terminal) : undefined,
        status: terminal ? terminalStatus(terminal) : 'running',
        attempt,
      });
    });
  }
  return spans;
}

function childWorkflowSpans(events: HistoryEvent[], detailedChildren: Set<string>): TimelineSpan[] {
  const initiated = new Map<string, HistoryEvent>();
  const starts = new Map<string, HistoryEvent>();
  const terminals = new Map<string, HistoryEvent>();
  for (const event of events) {
    if (event.startChildWorkflowExecutionInitiatedEventAttributes) initiated.set(eventId(event), event);
    const started = event.childWorkflowExecutionStartedEventAttributes;
    if (started?.initiatedEventId) starts.set(started.initiatedEventId.toString(), event);
    const terminal = childTerminalAttributes(event);
    if (terminal?.initiatedEventId) terminals.set(terminal.initiatedEventId.toString(), event);
  }

  const spans: TimelineSpan[] = [];
  for (const [initiatedId, event] of initiated) {
    const attributes = event.startChildWorkflowExecutionInitiatedEventAttributes!;
    const workflowId = attributes.workflowId || `child-${initiatedId}`;
    if (detailedChildren.has(workflowId)) continue;
    const terminal = terminals.get(initiatedId);
    const started = starts.get(initiatedId);
    spans.push({
      id: `${workflowId}-workflow`,
      laneId: childLane(workflowId),
      label: childLabel(workflowId),
      detail: terminal ? 'Child Workflow recorded' : started ? 'Child Workflow in progress' : 'Child Workflow scheduled',
      startTime: timeOf(event),
      endTime: terminal ? timeOf(terminal) : undefined,
      status: terminal ? terminalStatus(terminal) : started ? 'running' : 'scheduled',
    });
  }
  return spans;
}

function timedEvents(history: History): HistoryEvent[] {
  return (history.events ?? []).filter((event): event is HistoryEvent & { eventTime: NonNullable<HistoryEvent['eventTime']> } => Boolean(event.eventTime));
}

function lastMatching(
  events: HistoryEvent[],
  predicate: (event: HistoryEvent) => boolean,
): HistoryEvent | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (predicate(event)) return event;
  }
  return undefined;
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

function childTerminalAttributes(event: HistoryEvent) {
  return event.childWorkflowExecutionCompletedEventAttributes
    ?? event.childWorkflowExecutionFailedEventAttributes
    ?? event.childWorkflowExecutionTimedOutEventAttributes
    ?? event.childWorkflowExecutionCanceledEventAttributes
    ?? event.childWorkflowExecutionTerminatedEventAttributes;
}

function terminalStatus(event: HistoryEvent): Extract<TimelineSpanStatus, 'complete' | 'failed'> {
  return event.workflowExecutionCompletedEventAttributes
    || event.workflowExecutionContinuedAsNewEventAttributes
    || event.activityTaskCompletedEventAttributes
    || event.childWorkflowExecutionCompletedEventAttributes
    ? 'complete'
    : 'failed';
}

function activityTerminalDetail(event: HistoryEvent): string {
  if (event.activityTaskCompletedEventAttributes) return 'Activity result recorded';
  if (event.activityTaskTimedOutEventAttributes) return 'Activity attempt timed out';
  if (event.activityTaskCanceledEventAttributes) return 'Activity attempt canceled';
  return 'Activity attempt failed';
}

function activityLane(activityName: string, fallback: TimelineLaneId): TimelineLaneId {
  if (activityName === 'runTests') return 'test-job';
  return fallback;
}

function friendlyActivityName(activityName: string): string {
  if (activityName === 'runCodexTurn') return 'Codex turn';
  if (activityName === 'runTests') return 'Test run';
  if (activityName === 'getDiff') return 'Collect diff';
  return activityName;
}

function childLane(workflowId: string): TimelineLaneId {
  return workflowId.includes('source-investigator') ? 'source-investigator' : 'test-investigator';
}

function childLabel(workflowId: string): string {
  return workflowId.includes('source-investigator') ? 'Source investigation' : 'Test investigation';
}
