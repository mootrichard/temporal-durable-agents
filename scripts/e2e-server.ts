import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { TestWorkflowEnvironment } from '@temporalio/testing';

const environment = await TestWorkflowEnvironment.createLocal();
const server = spawn(process.execPath, ['--import', 'tsx', 'src/server/main.ts'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    FIXTURE_DELAY_MS: '1000',
    TEST_FILE_DELAY_MS: '700',
    TEMPORAL_ADDRESS: environment.address,
  },
  stdio: 'inherit',
});

let closing = false;
async function close(exitCode: number): Promise<void> {
  if (closing) return;
  closing = true;
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  await environment.teardown();
  process.exit(exitCode);
}

server.once('exit', (code) => {
  if (!closing) void close(code ?? 1);
});
process.once('SIGINT', () => void close(0));
process.once('SIGTERM', () => void close(0));
await once(server, 'exit');
