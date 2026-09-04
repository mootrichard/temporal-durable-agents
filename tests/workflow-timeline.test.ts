import { msNumberToTs } from '@temporalio/common';
import type { temporal } from '@temporalio/proto';
import Long from 'long';
import { describe, expect, it } from 'vitest';

import { projectWorkflowTimeline } from '../src/temporal/timeline.js';

type History = temporal.api.history.v1.IHistory;
type HistoryEvent = temporal.api.history.v1.IHistoryEvent;

describe('projectWorkflowTimeline', () => {
  it('groups parent activities and detailed child histories into agent lanes', () => {
    const base = Date.parse('2026-08-29T12:00:00.000Z');
    const root: History = { events: [
      event(1, base, { workflowExecutionStartedEventAttributes: {} }),
      event(2, base + 100, {
        activityTaskScheduledEventAttributes: {
          activityId: 'plan',
          activityType: { name: 'runCodexTurn' },
        },
      }),
      event(3, base + 200, {
        activityTaskStartedEventAttributes: { scheduledEventId: Long.fromNumber(2), attempt: 1 },
      }),
      event(4, base + 800, {
        activityTaskCompletedEventAttributes: {
          scheduledEventId: Long.fromNumber(2),
          startedEventId: Long.fromNumber(3),
        },
      }),
      event(5, base + 900, {
        startChildWorkflowExecutionInitiatedEventAttributes: {
          workflowId: 'run-1-source-investigator',
          workflowType: { name: 'SubagentWorkflow' },
        },
      }),
      event(6, base + 1_000, {
        childWorkflowExecutionStartedEventAttributes: {
          initiatedEventId: Long.fromNumber(5),
        },
      }),
      event(7, base + 2_000, {
        childWorkflowExecutionCompletedEventAttributes: {
          initiatedEventId: Long.fromNumber(5),
          startedEventId: Long.fromNumber(6),
        },
      }),
      event(8, base + 2_100, { workflowExecutionCompletedEventAttributes: {} }),
    ] };
    const child: History = { events: [
      event(1, base + 1_000, { workflowExecutionStartedEventAttributes: {} }),
      event(2, base + 1_050, {
        activityTaskScheduledEventAttributes: {
          activityId: 'inspect-source',
          activityType: { name: 'runCodexTurn' },
        },
      }),
      event(3, base + 1_100, {
        activityTaskStartedEventAttributes: { scheduledEventId: Long.fromNumber(2), attempt: 1 },
      }),
      event(4, base + 1_900, {
        activityTaskCompletedEventAttributes: {
          scheduledEventId: Long.fromNumber(2),
          startedEventId: Long.fromNumber(3),
        },
      }),
      event(5, base + 2_000, { workflowExecutionCompletedEventAttributes: {} }),
    ] };

    const timeline = projectWorkflowTimeline('run-1', root, [{
      history: child,
      laneId: 'source-investigator',
      workflowId: 'run-1-source-investigator',
    }], new Date(base + 2_100));

    expect(timeline.eventCount).toBe(13);
    expect(timeline.endTime).toBe('2026-08-29T12:00:02.100Z');
    expect(timeline.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({ laneId: 'coordinator', label: 'FixWorkflow', status: 'complete' }),
      expect.objectContaining({ laneId: 'coordinator', label: 'Codex turn', status: 'complete' }),
      expect.objectContaining({ laneId: 'source-investigator', label: 'Source investigation', status: 'complete' }),
      expect.objectContaining({ laneId: 'source-investigator', label: 'Codex turn', status: 'complete' }),
    ]));
    expect(timeline.spans.filter(({ id }) => id === 'run-1-source-investigator-workflow')).toHaveLength(1);
  });

  it('keeps pending activities open at the live edge', () => {
    const base = Date.parse('2026-08-29T12:00:00.000Z');
    const history: History = { events: [
      event(1, base, { workflowExecutionStartedEventAttributes: {} }),
      event(2, base + 100, {
        activityTaskScheduledEventAttributes: {
          activityId: 'tests',
          activityType: { name: 'runTests' },
        },
      }),
      event(3, base + 200, {
        activityTaskStartedEventAttributes: { scheduledEventId: Long.fromNumber(2), attempt: 2 },
      }),
    ] };

    const timeline = projectWorkflowTimeline('run-2', history, [], new Date(base + 2_000));

    expect(timeline.endTime).toBeUndefined();
    expect(timeline.spans).toContainEqual(expect.objectContaining({
      laneId: 'test-job',
      label: 'Test run',
      status: 'running',
      attempt: 2,
      endTime: undefined,
    }));
  });
});

function event(
  id: number,
  milliseconds: number,
  attributes: Partial<HistoryEvent>,
): HistoryEvent {
  return {
    eventId: Long.fromNumber(id),
    eventTime: msNumberToTs(milliseconds),
    ...attributes,
  };
}
