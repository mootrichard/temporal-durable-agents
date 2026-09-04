import { execFile } from 'node:child_process';
import { Socket } from 'node:net';

export type Preflight = {
  /** Raw `codex login status` output. */
  codexLogin: string;
  codexReady: boolean;
  temporalAddress: string;
  temporalReachable: boolean;
};

export async function ensureTemporalReachable(address: string, timeoutMs = 350): Promise<void> {
  const separator = address.lastIndexOf(':');
  const host = separator > 0 ? address.slice(0, separator).replace(/^\[|\]$/g, '') : address;
  const port = separator > 0 ? Number.parseInt(address.slice(separator + 1), 10) : 7233;
  const { promise, resolve } = Promise.withResolvers<boolean>();
  const socket = new Socket();
  const finish = (result: boolean) => {
    socket.destroy();
    resolve(result);
  };
  socket.setTimeout(timeoutMs);
  socket.once('connect', () => finish(true));
  socket.once('timeout', () => finish(false));
  socket.once('error', () => finish(false));
  socket.connect(port, host);
  if (!(await promise)) {
    throw new Error(`Temporal is offline at ${address}. Start it with npm run temporal:up.`);
  }
}

export async function runPreflight(temporalAddress: string): Promise<Preflight> {
  const { promise: codexLogin, resolve } = Promise.withResolvers<string>();
  execFile('codex', ['login', 'status'], (error, stdout, stderr) => {
    const output = `${stdout}${stderr}`.trim();
    resolve(error ? output || error.message : output);
  });
  const [login, temporalReachable] = await Promise.all([
    codexLogin,
    ensureTemporalReachable(temporalAddress).then(() => true, () => false),
  ]);
  return {
    codexLogin: login,
    codexReady: login.startsWith('Logged in using '),
    temporalAddress,
    temporalReachable,
  };
}
