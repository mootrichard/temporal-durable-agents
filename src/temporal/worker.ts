import { fileURLToPath } from 'node:url';

import { NativeConnection, Worker } from '@temporalio/worker';

import { requiredEnvironment, temporalAddress } from '../runtime/environment.js';
import { createActivities } from './activities.js';
import { temporalTaskQueue } from './contracts.js';

const connection = await NativeConnection.connect({ address: temporalAddress() });
const worker = await Worker.create({
  connection,
  namespace: 'default',
  taskQueue: temporalTaskQueue(requiredEnvironment('DEMO_RUN_ID')),
  workflowsPath: fileURLToPath(new URL('./workflows.ts', import.meta.url)),
  activities: createActivities(),
  maxCachedWorkflows: 0,
  maxHeartbeatThrottleInterval: '500 milliseconds',
  defaultHeartbeatThrottleInterval: '500 milliseconds',
});

await worker.run();
await connection.close();
