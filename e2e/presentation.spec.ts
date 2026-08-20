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
  await expect(page.locator('.status-copy p')).toContainText(
    'two investigations and one test job',
  );
  await page.getByRole('button', { name: 'View full event history' }).click();
  await expect(page.getByTestId('execution-trace')).toContainText('planner completed');
  await page.getByTestId('fleet-action').click();
  await expect(page.getByRole('dialog', { name: 'Stop every worker?' })).toBeVisible();
  const baselineKill = page.waitForResponse((response) => response.url().endsWith('/kill'));
  await page.getByTestId('confirm-fleet-stop').click();
  expect((await (await baselineKill).json()).phase).toBe('interrupted');
  await expect(page.getByTestId('frozen-snapshot')).toContainText('Memory is gone.');
  const baselineLegacyStyle = await page.addStyleTag({ content: '.console-launch { display: none !important; }' });
  await page.screenshot({ path: 'output/playwright/baseline-killed.png' });
  await baselineLegacyStyle.evaluate((element) => element.remove());

  const baselineRestart = page.waitForResponse((response) => response.url().endsWith('/restart'));
  await page.getByTestId('fleet-action').click();
  const reset = await (await baselineRestart).json();
  runIds.push(reset.runId);
  expect(reset.sequence).toBe(0);
  expect(reset.metrics.completedCodexTurns).toBe(0);
  expect(reset.metrics.completedTests).toBe(0);
  await expect(page.getByTestId('completed-turns')).toHaveText('0');
  await expect(page.getByTestId('retried-turns')).toHaveText('0');

  await page.getByTestId('mode-temporal').click();
  await page.getByTestId('fleet-action').click();
  await expect(page.getByTestId('run-phase')).toHaveText('investigating');
  await expect(page.getByTestId('node-coordinator')).toContainText('Waiting');
  await page.getByTestId('node-source-investigator').getByRole('button').click();
  await expect(page.getByTestId('node-inspector')).toContainText('fixture-source');
  await page.getByTestId('node-test-investigator').getByRole('button').click();
  await expect(page.getByTestId('node-inspector')).toContainText('fixture-test');
  await page.getByRole('button', { name: 'View full event history' }).click();
  await expect(page.getByTestId('execution-trace')).toContainText('source-investigator started');
  await expect(page.getByTestId('run-phase')).toHaveText('testing', { timeout: 30_000 });
  await expect(page.getByTestId('test-progress')).toHaveText('3 / 4');
  await expect(page.getByTestId('execution-trace')).toContainText('investigator completed');
  await page.getByTestId('fleet-action').click();
  await expect(page.getByRole('dialog', { name: 'Stop every worker?' })).toBeVisible();
  const temporalKill = page.waitForResponse((response) => response.url().endsWith('/kill'));
  await page.getByTestId('confirm-fleet-stop').click();
  const frozen = await (await temporalKill).json();
  expect(frozen.sequence).toBeGreaterThan(0);
  expect(frozen.metrics.completedTests).toBe(3);
  await expect(page.getByTestId('frozen-snapshot')).toContainText('History is waiting.');
  await page.getByRole('button', { name: 'Open agent consoles' }).click();
  const frozenConsoles = page.getByRole('dialog', { name: 'Agent consoles' });
  await expect(frozenConsoles).toContainText('Fleet offline');
  await expect(frozenConsoles.getByTestId('agent-console-transcript-source-investigator')).toContainText('Event History retained');
  await page.keyboard.press('Escape');

  const temporalRestart = page.waitForResponse((response) => response.url().endsWith('/restart'));
  await page.getByTestId('fleet-action').click();
  const resumed = await (await temporalRestart).json();
  runIds.push(resumed.runId);
  expect(resumed.runId).toBe(frozen.runId);
  expect(resumed.sequence).toBeGreaterThan(0);

  await expect(page.getByTestId('run-phase')).toHaveText('complete', { timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Kill workers' })).toBeHidden();
  await expect(page.getByTestId('fleet-action')).toHaveText('Start new run');
  await expect(page.getByRole('button', { name: 'Open agent consoles' })).toBeVisible();
  await expect(page.getByTestId('completed-turns')).toHaveText('4');
  await expect(page.getByTestId('test-progress')).toHaveText('4 / 4');
  await expect(page.getByTestId('final-diff')).toContainText('attempt < maxAttempts');
  await expect(page.locator('.phase-track li.complete')).toHaveCount(4);
  await expect(page.getByTestId('node-coordinator').locator('.coordinator-label')).toHaveCSS('color', 'rgb(36, 138, 61)');
  await expect(page.getByTestId('node-coordinator').locator('.node-status-text')).toHaveCSS('color', 'rgb(36, 138, 61)');
  await expect(page.getByTestId('node-test-investigator').locator('.worker-identity strong')).toHaveCSS('color', 'rgb(36, 138, 61)');
  await expect(page.getByTestId('node-test-investigator').locator('.worker-state strong')).toHaveCSS('color', 'rgb(36, 138, 61)');
  const temporalLegacyStyle = await page.addStyleTag({ content: '.console-launch { display: none !important; }' });
  await page.screenshot({ path: 'output/playwright/temporal-recovered.png' });
  await temporalLegacyStyle.evaluate((element) => element.remove());
});
