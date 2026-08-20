import type { RunSnapshot } from '../shared/run-snapshot.js';

export type RunControlState = {
  action: 'start' | 'start-new' | 'kill' | 'restart';
  actionLabel: 'Start run' | 'Start new run' | 'Kill workers' | 'Restart workers';
  runActive: boolean;
  runFinished: boolean;
  showRunnerChoice: boolean;
};

export function isCodexLoginReady(status: string): boolean {
  return status.trim().startsWith('Logged in using ');
}

export function deriveRunControlState(snapshot: RunSnapshot): RunControlState {
  const runFinished = snapshot.phase === 'complete' || snapshot.phase === 'failed';
  const failedTemporalFleetStillOnline = snapshot.phase === 'failed'
    && snapshot.mode === 'temporal'
    && snapshot.workersOnline
    && !snapshot.frozen;
  const runActive = snapshot.runId !== 'preview'
    && ((!runFinished && !snapshot.frozen) || failedTemporalFleetStillOnline);
  const showRunnerChoice = snapshot.runId === 'preview' || (runFinished && !runActive);

  let action: RunControlState['action'];
  let actionLabel: RunControlState['actionLabel'];
  if (snapshot.runId === 'preview') {
    action = 'start';
    actionLabel = 'Start run';
  } else if (runActive) {
    action = 'kill';
    actionLabel = 'Kill workers';
  } else if (runFinished) {
    action = 'start-new';
    actionLabel = 'Start new run';
  } else {
    action = 'restart';
    actionLabel = 'Restart workers';
  }

  return {
    action,
    actionLabel,
    runActive,
    runFinished,
    showRunnerChoice,
  };
}
