import { createCodexRunner } from '../codex/create-runner.js';
import { requiredEnvironment } from '../runtime/environment.js';
import type { RunnerMode } from '../shared/run-snapshot.js';
import { BaselineOrchestrator, snapshotLinePrefix } from './orchestrator.js';

const runId = requiredEnvironment('DEMO_RUN_ID');
const runnerMode = requiredEnvironment('DEMO_RUNNER_MODE') as RunnerMode;
const workspace = requiredEnvironment('DEMO_WORKSPACE');

const orchestrator = new BaselineOrchestrator(createCodexRunner(runnerMode));
const result = await orchestrator.run({ runId, runnerMode, workspace }, (snapshot) => {
  process.stdout.write(`${snapshotLinePrefix}${JSON.stringify(snapshot)}\n`);
});

if (result.phase !== 'complete') process.exitCode = 1;
