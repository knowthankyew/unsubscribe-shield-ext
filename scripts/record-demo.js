import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function record() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 600 },
    recordVideo: {
      dir: rootDir,
      size: { width: 420, height: 600 },
    },
  });

  const page = await context.newPage();
  const popupPath = path.join(rootDir, 'src/popup/index.html');
  await page.goto(`file://${popupPath}`);
  await page.waitForTimeout(1000);

  // Simulate report load
  await page.evaluate(() => {
    const idleView = document.getElementById('idle-view');
    const reportView = document.getElementById('report-view');
    const actionSection = document.getElementById('action-section');
    const verdictBadge = document.getElementById('verdict-badge');
    const provBadge = document.getElementById('provenance-badge');
    const summaryVerdict = document.getElementById('summary-verdict');
    const reconWarningCard = document.getElementById('recon-warning-card');
    const reconWarningText = document.getElementById('recon-warning-text');

    idleView?.classList.add('hidden');
    reportView?.classList.remove('hidden');
    actionSection?.classList.remove('hidden');

    if (verdictBadge) {
      verdictBadge.textContent = 'OneClickPostCandidate';
      verdictBadge.className = 'badge pass';
    }
    if (provBadge) {
      provBadge.textContent = 'Provenance: Headers Name Expected MX';
      provBadge.className = 'badge warn';
    }
    if (summaryVerdict) {
      summaryVerdict.textContent = 'RFC 8058 One-Click POST candidate (systems-digest.io) — headers name expected receiving MX.';
    }
    if (reconWarningCard && reconWarningText) {
      reconWarningText.textContent = 'Executing an unsubscribe request contacts the remote host and can confirm to the sender that your mailbox is active.';
      reconWarningCard.classList.remove('hidden');
    }
  });

  await page.waitForTimeout(2000);
  await page.click('#execute-btn');
  await page.waitForTimeout(1500);
  await page.click('#modal-cancel-btn');
  await page.waitForTimeout(1500);

  await context.close();
  await browser.close();
}

record().catch((err) => {
  console.error(err);
  process.exit(1);
});
