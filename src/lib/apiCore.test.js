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
});
