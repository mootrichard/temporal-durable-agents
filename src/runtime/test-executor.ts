import { execFile } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import {
  runCheckpointedTests,
  type TestFileResult,
} from '../shared/checkpointed-tests.js';
import { fixtureTestFiles, getDemoRoot } from './workspace.js';

const execFileAsync = promisify(execFile);

export type DemoTestResult = {
  passed: boolean;
  completed: number;
  total: number;
  output: string;
  completedFiles: string[];
};

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
  previouslyCompleted: string[] = [],
  onProgress: (completedFiles: string[]) => void = () => undefined,
): Promise<DemoTestResult> {
  const delayMs = Number.parseInt(process.env.TEST_FILE_DELAY_MS ?? '0', 10);
  const result = await runCheckpointedTests(
    [...fixtureTestFiles],
    previouslyCompleted,
    async (filename) => {
      if (delayMs > 0) await delay(delayMs);
      return executeFixtureTestFile(workspace, filename);
    },
    onProgress,
  );

  return {
    passed: result.passed,
    completed: result.completed.length,
    total: fixtureTestFiles.length,
    output: Object.entries(result.results)
      .map(([filename, testResult]) => `${filename}\n${testResult.output}`)
      .join('\n\n'),
    completedFiles: result.completed,
  };
}
