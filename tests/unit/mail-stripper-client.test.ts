import { describe, it, expect, vi } from 'vitest';
import { sendEmailToMailStripper } from '../../src/core/mail-stripper-client.js';

describe('sendEmailToMailStripper', () => {
  it('rejects email blobs larger than 10 MB budget before making request', async () => {
    const fetchMock = vi.fn();
    const oversizedBlob = {
      size: 11 * 1024 * 1024,
    } as Blob;

    await expect(
      sendEmailToMailStripper(oversizedBlob, 'large.eml', { fetchFn: fetchMock as any })
    ).rejects.toThrow('exceeds maximum 10 MB budget');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts raw blob multipart with authservId parameter when provided', async () => {
    const fakeResponse = {
      id: 'msg-123',
      oneSentenceTitle: 'Clean summary.',
      shortSummary: 'Summary bullets.',
      unsubscribe: {
        classification: 'OneClickPostCandidate',
        provenance: 'TrustedReceivingMx',
        riskScore: 10,
      },
    };

    let capturedBody: any;
    const fetchMock = vi.fn().mockImplementation((_url, init) => {
      capturedBody = init.body;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fakeResponse),
      });
    });

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'message/rfc822' });
    const res = await sendEmailToMailStripper(blob, 'newsletter.eml', {
      expectedAuthservId: 'mx.corp.example',
      fetchFn: fetchMock as any,
    });

    expect(res.id).toBe('msg-123');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5001/api/strip/file',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody.get('authservId')).toBe('mx.corp.example');
  });
});
