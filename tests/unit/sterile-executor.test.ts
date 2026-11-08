import { describe, it, expect, vi } from 'vitest';
import { executeSterileOneClick } from '../../src/core/sterile-executor.js';

describe('executeSterileOneClick', () => {
  it('rejects non-https URLs fail-closed without network execution', async () => {
    const fetchMock = vi.fn();
    const result = await executeSterileOneClick('http://insecure.example/unsub', 1000, fetchMock as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('https://');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid URI strings fail-closed', async () => {
    const fetchMock = vi.fn();
    const result = await executeSterileOneClick('not a valid uri', 1000, fetchMock as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid target URI');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sets credentials: omit, redirect: manual, and cancels response stream immediately', async () => {
    const cancelMock = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      body: { cancel: cancelMock },
    });

    const result = await executeSterileOneClick(
      'https://optout.systems-digest.io/one-click?token=abc',
      2000,
      fetchMock as any
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://optout.systems-digest.io/one-click?token=abc',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'List-Unsubscribe=One-Click',
        credentials: 'omit',
        redirect: 'manual',
        referrerPolicy: 'no-referrer',
      })
    );
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });

  it('handles remote server error without throwing unhandled exceptions', async () => {
    const cancelMock = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      status: 500,
      body: { cancel: cancelMock },
    });

    const result = await executeSterileOneClick('https://optout.example/fail', 1000, fetchMock as any);

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toContain('500');
    expect(cancelMock).toHaveBeenCalled();
  });
});
