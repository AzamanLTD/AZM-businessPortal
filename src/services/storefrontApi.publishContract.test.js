import { describe, expect, it, vi } from 'vitest';

const request = vi.fn();
vi.mock('@/lib/apiCore', () => ({ request }));

const { storefrontApi } = await import('./storefrontApi');

describe('storefrontApi.publish', () => {
  it('uses the transactional CAS publish endpoint and forwards the observed version', async () => {
    request.mockResolvedValueOnce({
      success: true,
      data: { id: 'published-1', status: 'PUBLISHED', layoutJson: {} },
    });

    const result = await storefrontApi.publish('2026-09-04T18:00:00.000Z');

    expect(result).toEqual({ id: 'published-1', status: 'PUBLISHED', layoutJson: {} });
    expect(request).toHaveBeenCalledWith('/api/storefront/me/publish-safe', {
      method: 'POST',
      body: JSON.stringify({ expectedUpdatedAt: '2026-09-04T18:00:00.000Z' }),
    });
  });

  it('keeps the backward-compatible no-version call shape', async () => {
    request.mockReset();
    request.mockResolvedValueOnce({ success: true, data: { status: 'PUBLISHED' } });

    await storefrontApi.publish();

    expect(request).toHaveBeenCalledWith('/api/storefront/me/publish-safe', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  });
});
