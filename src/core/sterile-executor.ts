import type { SterileExecutionResult } from '../types/unsubscribe.js';

/**
 * Executes a sterile RFC 8058 One-Click HTTP POST with zero-cookie isolation.
 *
 * Strict Security Guardrails (ROADMAP Section 5):
 * 1. HTTPS only - refuses plain HTTP or other schemes.
 * 2. credentials: 'omit' - zero ambient cookies, authorization tokens, or session state.
 * 3. redirect: 'manual' - refuses automatic redirects to prevent stealth tracking hop chains.
 * 4. referrerPolicy: 'no-referrer' - leaks zero origin or client state.
 * 5. Immediate response body discard - calls await res.body?.cancel() after status check.
 * 6. Hard bounded timeout (default 5000ms).
 */
export async function executeSterileOneClick(
  targetUri: string,
  timeoutMs = 5000,
  fetchFn: typeof fetch = fetch
): Promise<SterileExecutionResult> {
  const executedAt = new Date().toISOString();

  let parsed: URL;
  try {
    parsed = new URL(targetUri);
  } catch {
    return {
      success: false,
      status: 0,
      targetUri,
      executedAt,
      warningDisclosed: true,
      error: 'Invalid target URI syntax.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      success: false,
      status: 0,
      targetUri,
      executedAt,
      warningDisclosed: true,
      error: 'Refused: RFC 8058 sterile execution requires https:// scheme.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(targetUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'List-Unsubscribe=One-Click',
      credentials: 'omit',
      redirect: 'manual',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });

    // Immediately cancel and discard any response payload
    if (res.body && typeof res.body.cancel === 'function') {
      try {
        await res.body.cancel();
      } catch {
        // Safe to ignore cancel errors
      }
    }

    // RFC 8058 § 3.2: Successful response is 200 OK (or other 2xx)
    const success = res.status >= 200 && res.status < 300;
    return {
      success,
      status: res.status,
      targetUri,
      executedAt,
      warningDisclosed: true,
      error: success ? undefined : `Target returned non-2xx status code: ${res.status}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: 0,
      targetUri,
      executedAt,
      warningDisclosed: true,
      error: `Sterile request failed: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
