import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type WorkspaceOptions = {
  baseDirectory?: string;
  fixtureDirectory?: string;
};

export function getDemoRoot(): string {
  return process.env.DEMO_ROOT ?? process.cwd();
}

export async function createRunWorkspace(
  runId: string,
  options: WorkspaceOptions = {},
): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(runId)) {
    throw new Error('Run IDs may contain only letters, numbers, and hyphens');
  }

  const root = getDemoRoot();
  const baseDirectory = options.baseDirectory ?? path.join(root, '.demo-runs');
  const fixtureDirectory = options.fixtureDirectory ?? path.join(root, 'fixture');
  const workspace = path.join(baseDirectory, runId, 'workspace');
  await mkdir(baseDirectory, { recursive: true });
  await rm(path.dirname(workspace), { recursive: true, force: true });
  await mkdir(workspace, { recursive: true });
  await cp(fixtureDirectory, workspace, {
    recursive: true,
    filter: (source) => !source.endsWith('node_modules'),
  });

  await execFileAsync('git', ['init', '-q'], { cwd: workspace });
  await execFileAsync('git', ['config', 'user.email', 'demo@example.invalid'], {
    cwd: workspace,
  });
  await execFileAsync('git', ['config', 'user.name', 'Durable Agent Demo'], {
    cwd: workspace,
  });
  await execFileAsync('git', ['add', '.'], { cwd: workspace });
  await execFileAsync('git', ['commit', '-qm', 'frozen fixture'], { cwd: workspace });
  return workspace;
}

export async function getWorkspaceDiff(workspace: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['diff', '--no-ext-diff', '--'], {
    cwd: workspace,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

export async function readWorkspaceFile(workspace: string, filename: string): Promise<string> {
  return readFile(path.join(workspace, filename), 'utf8');
}

export const fixtureTestFiles = [
  'tests/retry-success.test.ts',
  'tests/retry-eventual-success.test.ts',
  'tests/retry-limit.test.ts',
  'tests/retry-error.test.ts',
] as const;
