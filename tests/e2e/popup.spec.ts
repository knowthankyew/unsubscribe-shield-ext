import { test, expect } from '@playwright/test';

test.describe('Unsubscribe Shield Popup Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock chrome.runtime API into page environment
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {
          lastError: null,
          sendMessage: (msg: any, callback: (res: any) => void) => {
            if (msg.action === 'CHECK_MAILSTRIPPER_HEALTH') {
              callback({ online: true, status: 200 });
            } else if (msg.action === 'EXECUTE_STERILE_UNSUBSCRIBE') {
              if (!msg.payload?.userConfirmed) {
                callback({ success: false, error: 'User confirmation required.' });
              } else {
                callback({
                  success: true,
                  status: 200,
                  targetUri: msg.payload.targetUri,
                  executedAt: '2026-11-10T20:20:00.000Z',
                  warningDisclosed: true,
                });
              }
            }
          },
        },
      };
    });
  });

  test('renders popup shell, status indicator, and inspect button', async ({ page }) => {
    await page.goto('/src/popup/index.html');

    await expect(page.locator('h1')).toHaveText('Unsubscribe Shield');
    await expect(page.locator('#inspect-btn')).toBeVisible();
    await expect(page.locator('#service-status')).toHaveText('mailStripper Online (:5001)');
    await expect(page.locator('#service-status')).toHaveClass(/online/);
  });

  test('confirms reconnaissance warning dialog appears before execution', async ({ page }) => {
    await page.goto('/src/popup/index.html');

    // Simulate forensic report arrival
    await page.evaluate(() => {
      const idleView = document.getElementById('idle-view');
      const reportView = document.getElementById('report-view');
      const actionSection = document.getElementById('action-section');
      const verdictBadge = document.getElementById('verdict-badge');
      const summaryVerdict = document.getElementById('summary-verdict');
      const reconCard = document.getElementById('recon-warning-card');
      const reconText = document.getElementById('recon-warning-text');

      idleView?.classList.add('hidden');
      reportView?.classList.remove('hidden');
      actionSection?.classList.remove('hidden');
      if (verdictBadge) verdictBadge.textContent = 'OneClickPostCandidate';
      if (summaryVerdict) summaryVerdict.textContent = 'RFC 8058 One-Click Candidate';
      if (reconCard) reconCard.classList.remove('hidden');
      if (reconText) reconText.textContent = 'Executing this contacts remote host.';
    });

    // Execution must be blocked until user confirmation modal is accepted
    await page.click('#execute-btn');
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await expect(page.locator('#confirm-modal h3')).toHaveText('Confirm Remote Contact');

    // Test cancellation dismisses modal
    await page.click('#modal-cancel-btn');
    await expect(page.locator('#confirm-modal')).toBeHidden();
  });
});