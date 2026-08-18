import { expect, test } from '@playwright/test';

const runIds: string[] = [];

test.afterEach(async ({ request }) => {
  for (const runId of runIds.splice(0)) {
    await request.post(`/api/runs/${runId}/kill`).catch(() => undefined);
  }
});

test('contrasts lost process state with a recovered Temporal execution tree', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('fleet-action').click();
  await expect(page.getByTestId('run-phase')).toHaveText('investigating');
  const baselineKill = page.waitForResponse((response) => response.url().endsWith('/kill'));
  await page.getByTestId('fleet-action').click();
  expect((await (await baselineKill).json()).phase).toBe('interrupted');
  await expect(page.getByTestId('frozen-snapshot')).toContainText('Memory is gone.');
  await page.screenshot({ path: 'output/playwright/baseline-killed.png' });

  const baselineRestart = page.waitForResponse((response) => response.url().endsWith('/restart'));
  await page.getByTestId('fleet-action').click();
  const reset = await (await baselineRestart).json();
  runIds.push(reset.runId);
  expect(reset.sequence).toBe(0);
  expect(reset.metrics.completedCodexTurns).toBe(0);
  expect(reset.metrics.completedTests).toBe(0);

  await page.getByRole('button', { name: 'Act II Execution tree' }).click();
  await page.getByTestId('fleet-action').click();
  await expect(page.getByTestId('run-phase')).toHaveText('testing', { timeout: 30_000 });
  await expect(page.getByTestId('test-progress')).toHaveText('3 / 4');
  const temporalKill = page.waitForResponse((response) => response.url().endsWith('/kill'));
  await page.getByTestId('fleet-action').click();
  const frozen = await (await temporalKill).json();
  expect(frozen.sequence).toBeGreaterThan(0);
  expect(frozen.metrics.completedTests).toBe(3);
  await expect(page.getByTestId('frozen-snapshot')).toContainText('History is waiting.');

  const temporalRestart = page.waitForResponse((response) => response.url().endsWith('/restart'));
  await page.getByTestId('fleet-action').click();
  const resumed = await (await temporalRestart).json();
  runIds.push(resumed.runId);
  expect(resumed.runId).toBe(frozen.runId);
  expect(resumed.sequence).toBeGreaterThan(0);

  await expect(page.getByTestId('run-phase')).toHaveText('complete', { timeout: 45_000 });
  await expect(page.getByTestId('completed-turns')).toHaveText('4');
  await expect(page.getByTestId('test-progress')).toHaveText('4 / 4');
  await expect(page.getByTestId('final-diff')).toContainText('attempt < maxAttempts');
  await page.screenshot({ path: 'output/playwright/temporal-recovered.png' });
});
