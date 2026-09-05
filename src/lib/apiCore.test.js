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
});
