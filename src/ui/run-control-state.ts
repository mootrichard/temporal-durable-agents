import { isRunFinished, type RunSnapshot } from '../shared/run-snapshot.js';

export type RunControlState = {
  action: 'start' | 'start-new' | 'kill' | 'restart';
  runActive: boolean;
  showRunnerChoice: boolean;
};

export const actionLabels: Record<RunControlState['action'], string> = {
  start: 'Start run',
  'start-new': 'Start new run',
  kill: 'Kill workers',
  restart: 'Restart workers',
};

export function deriveRunControlState(snapshot: RunSnapshot): RunControlState {
  const preview = snapshot.runId === 'preview';
  const runFinished = isRunFinished(snapshot);
  // A finished Temporal run keeps its per-run Worker online until the demo stops it.
  const fleetLingering = runFinished && snapshot.mode === 'temporal' && snapshot.workersOnline && !snapshot.frozen;
  const runActive = !preview && ((!runFinished && !snapshot.frozen) || fleetLingering);

  return {
    action: preview ? 'start' : runActive ? 'kill' : runFinished ? 'start-new' : 'restart',
    runActive,
    showRunnerChoice: preview || (runFinished && !runActive),
  };
}
