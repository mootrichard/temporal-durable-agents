export type TestFileResult = {
  passed: boolean;
  output: string;
};

export type TestRunResult = {
  passed: boolean;
  completed: string[];
  results: Record<string, TestFileResult>;
};

export async function runCheckpointedTests(
  testFiles: string[],
  previouslyCompleted: string[],
  execute: (filename: string) => Promise<TestFileResult>,
  heartbeat: (completed: string[]) => void,
): Promise<TestRunResult> {
  const completed = [...previouslyCompleted];
  const completedSet = new Set(previouslyCompleted);
  const results: Record<string, TestFileResult> = {};

  for (const filename of testFiles) {
    if (completedSet.has(filename)) continue;

    const result = await execute(filename);
    results[filename] = result;
    if (!result.passed) {
      return { passed: false, completed, results };
    }

    completed.push(filename);
    completedSet.add(filename);
    heartbeat([...completed]);
  }

  return { passed: true, completed, results };
}
