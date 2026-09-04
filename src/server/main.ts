import path from 'node:path';

import express from 'express';

import { temporalAddress } from '../runtime/environment.js';
import { runPreflight } from '../runtime/preflight.js';
import type { DemoMode, RunnerMode } from '../shared/run-snapshot.js';
import { FleetSupervisor } from '../supervisor/fleet-supervisor.js';

const app = express();
const supervisor = new FleetSupervisor();
const port = Number.parseInt(process.env.PORT ?? '8787', 10);

app.use(express.json());

// Express 5 forwards rejected handler promises to the error middleware below.
app.get('/api/preflight', async (_request, response) => {
  response.json(await runPreflight(temporalAddress()));
});
app.post('/api/runs', async (request, response) => {
  const mode = parseMode(request.body?.mode);
  const runnerMode = parseRunnerMode(request.body?.runnerMode);
  response.status(201).json(await supervisor.start(mode, runnerMode));
});
app.get('/api/runs/:runId', async (request, response) => {
  response.json(await supervisor.snapshot(request.params.runId));
});
app.get('/api/runs/:runId/timeline', async (request, response) => {
  response.json(await supervisor.timeline(request.params.runId));
});
app.post('/api/runs/:runId/kill', async (request, response) => {
  response.json(await supervisor.kill(request.params.runId));
});
app.post('/api/runs/:runId/restart', async (request, response) => {
  response.json(await supervisor.restart(request.params.runId));
});

const uiDirectory = path.join(process.cwd(), 'dist/ui');
app.use(express.static(uiDirectory));
app.get('/{*path}', (_request, response) => response.sendFile(path.join(uiDirectory, 'index.html')));

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  response.status(400).json({ error: error instanceof Error ? error.message : String(error) });
});

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

function parseMode(value: unknown): DemoMode {
  if (value === 'baseline' || value === 'temporal') return value;
  throw new Error('mode must be baseline or temporal');
}

function parseRunnerMode(value: unknown): RunnerMode {
  if (value === 'fixture' || value === 'live') return value;
  throw new Error('runnerMode must be fixture or live');
}
