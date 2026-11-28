import { beforeEach, describe, expect, it, vi } from 'vitest';

const disconnectSocket = vi.fn();
const updateSocketToken = vi.fn();

vi.mock('./socket', () => ({
  disconnectSocket,
  updateSocketToken,
}));

describe('apiCore session token lifecycle', () => {
  beforeEach(() => {
    disconnectSocket.mockClear();
    updateSocketToken.mockClear();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('disconnects realtime authorization when the access token is cleared', async () => {
    const { setAccessToken, clearAccessToken, getAccessToken } = await import('./apiCore');

    setAccessToken('token-1');
    expect(getAccessToken()).toBe('token-1');
    expect(updateSocketToken).toHaveBeenCalledWith('token-1');

    clearAccessToken();

    expect(getAccessToken()).toBeNull();
    expect(disconnectSocket).toHaveBeenCalledTimes(1);
  });

  it('a step-up challenge is a typed error, not a sign-out', async () => {
    const { setAccessToken, request, getAccessToken } = await import('./apiCore');
    setAccessToken('live-token');
    localStorage.setItem('biz_user', '{"id":1}');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        code: 'STEP_UP_REQUIRED',
        message: 'This action needs a fresh verification bound to it.',
        actionType: 'PAYROLL_DISBURSE',
        actionDigest: 'abc123',
        action: { actionType: 'PAYROLL_DISBURSE', amount: '1200.00' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/api/business-os/payroll/run-1/disburse', { method: 'POST' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'STEP_UP_REQUIRED',
      secondFactor: true,
      stepUp: { actionType: 'PAYROLL_DISBURSE', actionDigest: 'abc123', action: { amount: '1200.00' } },
    });
    // No refresh attempt, no sign-out: one call, the session is untouched.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('live-token');
    expect(localStorage.getItem('biz_user')).toBe('{"id":1}');
  });

  it('a wrong code at the step-up grant is not a sign-out either', async () => {
    const { setAccessToken, request, getAccessToken } = await import('./apiCore');
    setAccessToken('live-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, statusText: 'Unauthorized',
      json: async () => ({ success: false, message: 'Invalid 2FA token.' }),
    }));
    await expect(request('/api/step-up/grant', { method: 'POST' })).rejects.toMatchObject({ statusCode: 401, secondFactor: true });
    expect(getAccessToken()).toBe('live-token');
  });

  it('preserves HTTP status and backend error code on typed failures', async () => {
    const { clearAccessToken, request } = await import('./apiCore');
    clearAccessToken();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({
        message: 'Draft was modified by another editor.',
        code: 'STOREFRONT_DRAFT_CONFLICT',
      }),
    }));

    await expect(request('/api/storefront/me/revert', { method: 'POST' })).rejects.toMatchObject({
      message: 'Draft was modified by another editor.',
      statusCode: 409,
      code: 'STOREFRONT_DRAFT_CONFLICT',
    });
  });

  it('preserves status metadata alongside Nitro entitlement details', async () => {
    const { clearAccessToken, request } = await import('./apiCore');
    clearAccessToken();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      json: async () => ({
        message: 'Nitro tier required.',
        code: 'NITRO_REQUIRED',
        violations: [{ type: 'theme', key: 'premium' }],
        tier: 'FREE',
        stakedBalance: 0,
      }),
    }));

    await expect(request('/api/storefront/me/publish-safe', { method: 'POST' })).rejects.toMatchObject({
      statusCode: 402,
      code: 'NITRO_REQUIRED',
      tier: 'FREE',
      stakedBalance: 0,
    });
  });

  it('leaves multipart Content-Type unset so the browser can add its boundary', async () => {
    const { clearAccessToken, request } = await import('./apiCore');
    clearAccessToken();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.append('file', new Blob(['image-bytes'], { type: 'image/png' }), 'tile.png');

    await request('/api/storefront/me/media', {
      method: 'POST',
      headers: {},
      body: formData,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(formData);
    expect(init.headers.get('Content-Type')).toBeNull();
  });
});
