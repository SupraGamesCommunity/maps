import { test, expect } from '@playwright/test';

test.describe('Page Load Quality', () => {
  test('should load without uncaught exceptions', async ({ page }) => {
    const exceptions = [];

    page.on('pageerror', (error) => {
      exceptions.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(exceptions, `Found uncaught exceptions:\n${exceptions.join('\n')}`).toHaveLength(0);
  });

  test('should load without 404 errors', async ({ page }) => {
    const failed404s = [];

    page.on('response', (response) => {
      if (response.status() === 404) {
        failed404s.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failed404s, `Found 404 errors:\n${failed404s.map((f) => `  ${f.url}`).join('\n')}`).toHaveLength(0);
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors, `Found console errors:\n${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('should load without network failures', async ({ page }) => {
    const failedRequests = [];

    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText || 'Unknown error',
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(
      failedRequests,
      `Found failed requests:\n${failedRequests.map((f) => `  ${f.url}: ${f.failure}`).join('\n')}`
    ).toHaveLength(0);
  });
});
