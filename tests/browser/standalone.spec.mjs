import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const demoUrl = pathToFileURL(resolve('examples/browser.html')).href;

test('standalone browser bundle identifies from the script-tag demo', async ({ page }) => {
  await page.goto(demoUrl);
  await page.getByRole('button', { name: 'Identify' }).click();

  const compactOutput = page.locator('#compact-output');
  const fullOutput = page.locator('#full-output');
  await expect(compactOutput).toContainText('"visitorId"');
  await expect(fullOutput).toContainText('"components"');

  const compact = JSON.parse(await compactOutput.textContent());
  const full = JSON.parse(await fullOutput.textContent());

  expect(compact.product).toBe('FingerprintJS by BotBlocker');
  expect(compact.identity.visitorId).toMatch(/^[a-f0-9]{16,64}$/);
  expect(compact.identity.profile).toBe('extended');
  expect(compact.capabilities.length).toBeGreaterThan(0);
  expect(compact.calculations.componentTotals.total).toBe(compact.capabilities.length);
  expect(full.result.meta.profile).toBe('extended');
  expect(full.result.meta.blocked).toBe(false);
  expect(full.components.length).toBe(compact.capabilities.length);
  expect(full.calculations.hash.matches).toBe(true);
  expect(compact.identity.matchesBaseline).toBe(true);
  expect(compact.identity.identityComponents.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Identify' }).click();
  await expect(compactOutput).toContainText('"runCount": 2');
  const secondCompact = JSON.parse(await compactOutput.textContent());
  expect(secondCompact.identity.visitorId).toBe(compact.identity.visitorId);
  expect(secondCompact.stability.runCount).toBe(2);
  expect(secondCompact.stability.history[0].matchesBaseline).toBe(true);
});
