import { defineConfig } from '@playwright/test';

const port = process.env.E2E_PORT ?? '8787';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `PORT=${port} npm run build && PORT=${port} npm run e2e:server`,
    url: `http://127.0.0.1:${port}/api/preflight`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
