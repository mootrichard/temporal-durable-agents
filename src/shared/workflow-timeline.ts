export type TimelineLaneId =
  | 'coordinator'
  | 'source-investigator'
  | 'test-investigator'
  | 'test-job';

export type TimelineSpanStatus = 'scheduled' | 'running' | 'complete' | 'failed';

export type TimelineSpan = {
  id: string;
  laneId: TimelineLaneId;
  label: string;
  detail: string;
  startTime: string;
  endTime?: string;
  status: TimelineSpanStatus;
  attempt?: number;
};

export type WorkflowTimeline = {
  runId: string;
  observedAt: string;
  startTime: string;
  endTime?: string;
  eventCount: number;
  spans: TimelineSpan[];
};
