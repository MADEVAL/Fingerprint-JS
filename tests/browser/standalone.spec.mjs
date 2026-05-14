import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const demoUrl = pathToFileURL(resolve('examples/browser.html')).href;

test('standalone browser bundle identifies from the script-tag demo', async ({ page }) => {
  await page.goto(demoUrl);
  await page.getByRole('button', { name: 'Identify' }).click();

  const output = page.locator('#output');
  await expect(output).toContainText('"visitorId"');

  const result = JSON.parse(await output.textContent());
  expect(result.visitorId).toMatch(/^[a-f0-9]{16,64}$/);
  expect(result.meta.profile).toBe('balanced');
  expect(result.meta.blocked).toBe(false);
  expect(result.components.length).toBeGreaterThan(0);
});
