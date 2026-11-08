import type { UnsubscribeForensicReport } from '../types/unsubscribe.js';

export const MAX_EMAIL_BYTE_SIZE = 10 * 1024 * 1024; // 10 MB limit

export interface MailStripperClientOptions {
  baseUrl?: string;
  expectedAuthservId?: string;
  fetchFn?: typeof fetch;
}

export interface StripFileResponse {
  id: string;
  oneSentenceTitle: string;
  shortSummary: string;
  unsubscribe?: UnsubscribeForensicReport;
  attachments?: Array<{ name: string; size: number; contentType: string }>;
}

/**
 * Ingestion client that streams raw email bytes to local mailStripper (:5001).
 *
 * Guarantees (ROADMAP Section 5):
 * 1. Checks byte size cap (<= 10MB) before transmission.
 * 2. Transmits raw byte Blob/stream without text decoding, preserving 8-bit non-UTF-8 MIME bodies.
 * 3. Never writes temporary files to disk.
 */
export async function sendEmailToMailStripper(
  rawBlob: Blob,
  fileName = 'message.eml',
  options: MailStripperClientOptions = {}
): Promise<StripFileResponse> {
  const {
    baseUrl = 'http://localhost:5001',
    expectedAuthservId,
    fetchFn = fetch,
  } = options;

  if (rawBlob.size > MAX_EMAIL_BYTE_SIZE) {
    throw new Error(
      `Email size (${(rawBlob.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum 10 MB budget.`
    );
  }

  const formData = new FormData();
  formData.append('file', rawBlob, fileName);
  if (expectedAuthservId) {
    formData.append('authservId', expectedAuthservId);
  }

  const res = await fetchFn(`${baseUrl}/api/strip/file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.error) {
        errText = errJson.error;
      }
    } catch {
      // Fall back to status
    }
    throw new Error(`mailStripper parsing failed: ${errText}`);
  }

  return (await res.json()) as StripFileResponse;
}
