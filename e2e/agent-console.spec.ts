import { expect, test } from '@playwright/test';

const runIds: string[] = [];

test.afterEach(async ({ request }) => {
  for (const runId of runIds.splice(0)) {
    await request.post(`/api/runs/${runId}/kill`).catch(() => undefined);
  }
});

test('opens live agent consoles and returns focus when they close', async ({ page }) => {
  await page.goto('/');
  const startControlBox = await page.getByTestId('fleet-action').boundingBox();
  expect(startControlBox).toBeTruthy();

  const runResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/runs') && response.request().method() === 'POST',
  );
  await page.getByTestId('fleet-action').click();
  runIds.push((await (await runResponse).json()).runId);

  const openConsole = page.getByRole('button', { name: 'Open agent consoles' });
  await expect(openConsole).toBeVisible();
  await page.mouse.click(
    startControlBox!.x + startControlBox!.width / 2,
    startControlBox!.y + startControlBox!.height / 2,
  );

  const consoleDialog = page.getByRole('dialog', { name: 'Agent consoles' });
  await expect(consoleDialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Stop every worker?' })).toBeHidden();
  await expect(page.getByTestId('run-phase')).toHaveText('investigating');
  await expect(consoleDialog.getByRole('region', { name: 'Coordinator console' })).toBeVisible();
  await expect(consoleDialog.getByTestId('agent-console-transcript-source-investigator')).toContainText(/source-investigator (started|completed)/);
  await expect(consoleDialog.getByTestId('agent-console-transcript-test-investigator')).toContainText(/test-investigator (started|completed)/);
  await expect(consoleDialog.getByTestId('agent-console-transcript-test-job')).toContainText(/Reproducing the bug|Bug reproduced|Final verification|4 of 4 passed/);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'output/playwright/agent-consoles-live.png' });

  await page.setViewportSize({ width: 700, height: 900 });
  const coordinatorBox = await consoleDialog.getByRole('region', { name: 'Coordinator console' }).boundingBox();
  const sourceBox = await consoleDialog.getByRole('region', { name: 'Source investigator console' }).boundingBox();
  expect(coordinatorBox).toBeTruthy();
  expect(sourceBox).toBeTruthy();
  expect(sourceBox!.y).toBeGreaterThan(coordinatorBox!.y);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.keyboard.press('Escape');
  await expect(consoleDialog).toBeHidden();
  await expect(openConsole).toBeFocused();

  await openConsole.click();
  await expect(consoleDialog.getByTestId('agent-console-attachment')).toContainText(
    /Attached at snapshot #\d+ · replaying \d+ recorded events, then following live progress\./,
  );
  await expect(consoleDialog.getByTestId('agent-console-transcript-source-investigator')).toContainText(
    /events were recorded before this console opened\. Following live events now\./,
  );
  await page.keyboard.press('Escape');

  await page.getByTestId('fleet-action').click();
  await page.getByTestId('confirm-fleet-stop').click();
  await expect(page.getByTestId('frozen-snapshot')).toBeVisible();
  await openConsole.click();

  await expect(consoleDialog).toContainText('Fleet offline');
  await expect(consoleDialog.getByTestId('agent-console-transcript-source-investigator')).toContainText('Process memory lost');
});
