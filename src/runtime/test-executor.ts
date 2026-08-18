import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  runCheckpointedTests,
  type TestFileResult,
} from '../shared/checkpointed-tests.js';
import { fixtureTestFiles, getDemoRoot } from './workspace.js';

const execFileAsync = promisify(execFile);

export type TestPhase = 'initial' | 'final';

export type DemoTestResult = {
  passed: boolean;
  completed: number;
  total: number;
  output: string;
  completedFiles?: string[];
};

export type TestProgress = (completedFiles: string[]) => void;

export async function executeFixtureTestFile(
  workspace: string,
  filename: string,
): Promise<TestFileResult> {
  const vitestEntry = path.join(getDemoRoot(), 'node_modules/vitest/vitest.mjs');

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [vitestEntry, 'run', filename, '--root', workspace],
      {
        cwd: workspace,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: '1' },
      },
    );
    return { passed: true, output: `${stdout}${stderr}`.trim() };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    return {
      passed: false,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`.trim() || failure.message,
    };
  }
}

export async function runFixtureTests(
  workspace: string,
  _phase: TestPhase,
  previouslyCompleted: string[] = [],
  onProgress: TestProgress = () => undefined,
): Promise<DemoTestResult> {
  const result = await runCheckpointedTests(
    [...fixtureTestFiles],
    previouslyCompleted,
    (filename) => executeFixtureTestFile(workspace, filename),
    onProgress,
  );
  const outputs = Object.entries(result.results).map(
    ([filename, testResult]) => `${filename}\n${testResult.output}`,
  );

  return {
    passed: result.passed,
    completed: result.completed.length,
    total: fixtureTestFiles.length,
    output: outputs.join('\n\n'),
    completedFiles: result.completed,
  };
}
