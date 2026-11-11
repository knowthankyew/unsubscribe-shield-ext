import type { UnsubscribeForensicReport, SterileExecutionResult } from '../types/unsubscribe.js';

let currentReport: UnsubscribeForensicReport | null = null;

document.addEventListener('DOMContentLoaded', () => {
  const serviceStatus = document.getElementById('service-status');
  const inspectBtn = document.getElementById('inspect-btn');
  const idleView = document.getElementById('idle-view');
  const reportView = document.getElementById('report-view');
  const verdictBadge = document.getElementById('verdict-badge');
  const provenanceBadge = document.getElementById('provenance-badge');
  const summaryVerdict = document.getElementById('summary-verdict');
  const reconWarningCard = document.getElementById('recon-warning-card');
  const reconWarningText = document.getElementById('recon-warning-text');
  const actionSection = document.getElementById('action-section');
  const executeBtn = document.getElementById('execute-btn');
  const copyCurlBtn = document.getElementById('copy-curl-btn');
  const executionResult = document.getElementById('execution-result');

  const confirmModal = document.getElementById('confirm-modal');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');

  // Check mailStripper health on popup open
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ action: 'CHECK_MAILSTRIPPER_HEALTH' }, (res) => {
      if (chrome.runtime.lastError || !res?.online) {
        if (serviceStatus) {
          serviceStatus.textContent = 'mailStripper Offline (:5001)';
          serviceStatus.className = 'status-badge offline';
        }
      } else {
        if (serviceStatus) {
          serviceStatus.textContent = 'mailStripper Online (:5001)';
          serviceStatus.className = 'status-badge online';
        }
      }
    });
  } else {
    if (serviceStatus) {
      serviceStatus.textContent = 'mailStripper Offline (Standalone Preview)';
      serviceStatus.className = 'status-badge offline';
    }
  }

  inspectBtn?.addEventListener('click', () => {
    // In demo/test mode or browser context, fetch demo newsletter from mailStripper
    fetch('http://localhost:5001/api/strip/sample/newsletter')
      .then((r) => r.json())
      .then((data) => {
        if (data.unsubscribe) {
          renderReport(data.unsubscribe);
        }
      })
      .catch((err) => {
        alert(`Failed to connect to mailStripper: ${err.message}`);
      });
  });

  function renderReport(report: UnsubscribeForensicReport) {
    currentReport = report;
    idleView?.classList.add('hidden');
    reportView?.classList.remove('hidden');

    if (verdictBadge) {
      verdictBadge.textContent = report.classification;
      verdictBadge.className = `badge ${
        report.classification === 'OneClickPostCandidate'
          ? 'pass'
          : report.classification === 'PoisonOrReconTrap'
          ? 'fail'
          : 'warn'
      }`;
    }

    if (provenanceBadge) {
      provenanceBadge.textContent = `Provenance: ${report.provenance}`;
      provenanceBadge.className = `badge ${
        report.provenance === 'TrustedReceivingMx' ? 'warn' : 'fail'
      }`;
    }

    if (summaryVerdict) {
      summaryVerdict.textContent = report.summaryVerdict;
    }

    if (report.reconWarning && reconWarningCard && reconWarningText) {
      reconWarningText.textContent = report.reconWarning;
      reconWarningCard.classList.remove('hidden');
    }

    if (report.classification === 'OneClickPostCandidate' && actionSection) {
      actionSection.classList.remove('hidden');
    }
  }

  copyCurlBtn?.addEventListener('click', () => {
    if (currentReport?.sterileCurlCommand) {
      navigator.clipboard.writeText(currentReport.sterileCurlCommand);
      copyCurlBtn.textContent = 'Copied to Clipboard! ✓';
      setTimeout(() => {
        copyCurlBtn.textContent = 'Copy Sterile curl';
      }, 2000);
    }
  });

  executeBtn?.addEventListener('click', () => {
    confirmModal?.classList.remove('hidden');
  });

  modalCancelBtn?.addEventListener('click', () => {
    confirmModal?.classList.add('hidden');
  });

  modalConfirmBtn?.addEventListener('click', () => {
    confirmModal?.classList.add('hidden');
    if (!currentReport?.primaryTargetHost) return;

    const candidate = currentReport.candidates.find(
      (c) => c.scheme === 'https' && c.source === 'HeaderListUnsubscribe'
    );
    if (!candidate) return;

    executeBtn?.setAttribute('disabled', 'true');
    if (executeBtn) executeBtn.textContent = 'Executing Sterile POST...';

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        {
          action: 'EXECUTE_STERILE_UNSUBSCRIBE',
          payload: {
            targetUri: candidate.sanitizedUri,
            userConfirmed: true,
          },
        },
        (result: SterileExecutionResult) => {
          executeBtn?.removeAttribute('disabled');
          if (executeBtn) executeBtn.textContent = 'Execute Sterile One-Click Unsubscribe';

          if (executionResult) {
            executionResult.classList.remove('hidden');
            executionResult.textContent = result.success
              ? `✓ Sterile Opt-Out Succeeded (HTTP ${result.status}) at ${result.executedAt}. No cookies or tokens transmitted.`
              : `✕ Opt-Out Failed: ${result.error || `HTTP ${result.status}`}`;
          }
        }
      );
    } else {
      executeBtn?.removeAttribute('disabled');
      if (executeBtn) executeBtn.textContent = 'Execute Sterile One-Click Unsubscribe';

      if (executionResult) {
        executionResult.classList.remove('hidden');
        executionResult.textContent =
          '✕ Opt-Out Not Executed: extension runtime unavailable (preview mode).';
      }
    }
  });
});
