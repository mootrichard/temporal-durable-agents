import { fileURLToPath } from 'node:url';

import { NativeConnection, Worker } from '@temporalio/worker';

import { createActivities } from './activities.js';
import { temporalTaskQueue } from './contracts.js';

const runId = requiredEnvironment('DEMO_RUN_ID');
const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const connection = await NativeConnection.connect({ address });
const worker = await Worker.create({
  connection,
  namespace: 'default',
  taskQueue: temporalTaskQueue(runId),
  workflowsPath: fileURLToPath(new URL('./workflows.ts', import.meta.url)),
  activities: createActivities(),
  maxCachedWorkflows: 0,
  maxHeartbeatThrottleInterval: '500 milliseconds',
  defaultHeartbeatThrottleInterval: '500 milliseconds',
});

await worker.run();
await connection.close();

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}
