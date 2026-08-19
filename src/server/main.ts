import path from 'node:path';

import express from 'express';

import type { DemoMode, RunnerMode } from '../shared/run-snapshot.js';
import {
  ensureTemporalReachable,
  FleetSupervisor,
} from '../supervisor/fleet-supervisor.js';

const app = express();
const supervisor = new FleetSupervisor();
const port = Number.parseInt(process.env.PORT ?? '8787', 10);

app.use(express.json());

app.get('/api/preflight', async (_request, response) => {
  const temporalAddress = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  response.json({
    codexLogin: await codexLoginStatus(),
    temporalAddress,
    temporalReachable: await temporalReachable(temporalAddress),
  });
});

app.post('/api/runs', async (request, response, next) => {
  try {
    const mode = parseMode(request.body?.mode);
    const runnerMode = parseRunnerMode(request.body?.runnerMode);
    response.status(201).json(await supervisor.start(mode, runnerMode));
  } catch (error) {
    next(error);
  }
});

app.get('/api/runs/:runId', async (request, response, next) => {
  try {
    response.json(await supervisor.snapshot(request.params.runId));
  } catch (error) {
    next(error);
  }
});

app.post('/api/runs/:runId/kill', async (request, response, next) => {
  try {
    response.json(await supervisor.kill(request.params.runId));
  } catch (error) {
    next(error);
  }
});

app.post('/api/runs/:runId/restart', async (request, response, next) => {
  try {
    response.json(await supervisor.restart(request.params.runId));
  } catch (error) {
    next(error);
  }
});

const uiDirectory = path.join(process.cwd(), 'dist/ui');
app.use(express.static(uiDirectory));
app.get('/{*path}', (_request, response) => response.sendFile(path.join(uiDirectory, 'index.html')));

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const message = error instanceof Error ? error.message : String(error);
    response.status(400).json({ error: message });
  },
);

const server = app.listen(port, () => {
  process.stdout.write(`Durable agent tree demo listening on http://localhost:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    server.close();
    await supervisor.close();
    process.exit(0);
  });
}

async function codexLoginStatus(): Promise<string> {
  const { execFile } = await import('node:child_process');
  return new Promise((resolve) => {
    execFile('codex', ['login', 'status'], (error, stdout, stderr) => {
      const output = `${stdout}${stderr}`.trim();
      resolve(error ? output || error.message : output);
    });
  });
}

async function temporalReachable(address: string): Promise<boolean> {
  try {
    await ensureTemporalReachable(address);
    return true;
  } catch {
    return false;
  }
}

function parseMode(value: unknown): DemoMode {
  if (value === 'baseline' || value === 'temporal') return value;
  throw new Error('mode must be baseline or temporal');
}

function parseRunnerMode(value: unknown): RunnerMode {
  if (value === 'fixture' || value === 'live') return value;
  throw new Error('runnerMode must be fixture or live');
}
