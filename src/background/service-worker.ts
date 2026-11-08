import { executeSterileOneClick } from '../core/sterile-executor.js';
import { sendEmailToMailStripper } from '../core/mail-stripper-client.js';

interface ExtensionMessage {
  action: 'ANALYZE_EMAIL' | 'EXECUTE_STERILE_UNSUBSCRIBE' | 'CHECK_MAILSTRIPPER_HEALTH';
  payload?: any;
}

// Background dispatcher for Thunderbird & WebExtension environments
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        sendResponse({ success: false, error });
      });
    return true; // Keep message channel open for async response
  }
);

async function handleMessage(message: ExtensionMessage): Promise<any> {
  switch (message.action) {
    case 'CHECK_MAILSTRIPPER_HEALTH': {
      try {
        const res = await fetch('http://localhost:5001/api/strip/privacy-audit', {
          method: 'GET',
        });
        return { online: res.ok, status: res.status };
      } catch {
        return { online: false, status: 0 };
      }
    }

    case 'ANALYZE_EMAIL': {
      const { rawBytes, fileName, expectedAuthservId } = message.payload || {};
      if (!rawBytes || !(rawBytes instanceof Uint8Array || Array.isArray(rawBytes))) {
        throw new Error('Missing rawBytes payload for email analysis.');
      }
      const u8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
      const blob = new Blob([u8 as unknown as BlobPart], { type: 'message/rfc822' });
      return await sendEmailToMailStripper(blob, fileName, { expectedAuthservId });
    }

    case 'EXECUTE_STERILE_UNSUBSCRIBE': {
      const { targetUri, userConfirmed } = message.payload || {};
      if (!userConfirmed) {
        throw new Error(
          'Active-inbox reconnaissance warning must be acknowledged before sterile execution.'
        );
      }
      return await executeSterileOneClick(targetUri);
    }

    default:
      throw new Error(`Unknown action: ${(message as any).action}`);
  }
}
