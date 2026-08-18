import { execFile } from 'node:child_process';
import { Socket } from 'node:net';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
let failed = false;

try {
  const { stdout, stderr } = await execFileAsync('codex', ['login', 'status']);
  const status = `${stdout}${stderr}`.trim();
  report('Codex authentication', status, /Logged in/.test(status));
} catch (error) {
  report('Codex authentication', errorMessage(error), false);
}

const temporalReachable = await probePort('127.0.0.1', 7233);
report(
  'Temporal server',
  temporalReachable ? 'localhost:7233 reachable' : 'start with npm run temporal:up',
  temporalReachable,
);
report('Codex runner', process.env.CODEX_MODEL ? `model override: ${process.env.CODEX_MODEL}` : 'inherits configured model', true);

process.exitCode = failed ? 1 : 0;

function report(label: string, detail: string, okay: boolean): void {
  failed ||= !okay;
  process.stdout.write(`${okay ? '✓' : '✗'} ${label}: ${detail}\n`);
}

function probePort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(800);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
    socket.connect(port, host);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
