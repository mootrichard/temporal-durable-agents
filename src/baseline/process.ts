import { createCodexRunner } from '../codex/create-runner.js';
import type { RunnerMode } from '../shared/run-snapshot.js';
import { BaselineOrchestrator } from './orchestrator.js';

const runId = requiredEnvironment('DEMO_RUN_ID');
const runnerMode = requiredEnvironment('DEMO_RUNNER_MODE') as RunnerMode;
const workspace = requiredEnvironment('DEMO_WORKSPACE');

const orchestrator = new BaselineOrchestrator({ codex: createCodexRunner(runnerMode) });
const result = await orchestrator.run({ runId, runnerMode, workspace }, (snapshot) => {
  process.stdout.write(`DEMO_SNAPSHOT ${JSON.stringify(snapshot)}\n`);
});

if (result.phase !== 'complete') process.exitCode = 1;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}
