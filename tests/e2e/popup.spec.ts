import { test, expect } from '@playwright/test';

test.describe('Unsubscribe Shield Popup Interface', () => {
  test('renders popup shell, status indicator, and inspect button', async ({ page }) => {
    await page.goto('/src/popup/index.html');

    await expect(page.locator('h1')).toHaveText('Unsubscribe Shield');
    await expect(page.locator('#inspect-btn')).toBeVisible();
    await expect(page.locator('#service-status')).toBeVisible();
  });

  test('confirms reconnaissance warning dialog appears before execution', async ({ page }) => {
    await page.goto('/src/popup/index.html');

    // Mock incoming report by showing the report section
    await page.evaluate(() => {
      const idleView = document.getElementById('idle-view');
      const reportView = document.getElementById('report-view');
      const actionSection = document.getElementById('action-section');
      const verdictBadge = document.getElementById('verdict-badge');
      const summaryVerdict = document.getElementById('summary-verdict');

      idleView?.classList.add('hidden');
      reportView?.classList.remove('hidden');
      actionSection?.classList.remove('hidden');
      if (verdictBadge) verdictBadge.textContent = 'OneClickPostCandidate';
      if (summaryVerdict) summaryVerdict.textContent = 'RFC 8058 One-Click Candidate';
    });

    await page.click('#execute-btn');
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await expect(page.locator('#confirm-modal h3')).toHaveText('Confirm Remote Contact');

    await page.click('#modal-cancel-btn');
    await expect(page.locator('#confirm-modal')).toBeHidden();
  });
});
