import { describe, expect, it, vi } from 'vitest';

const request = vi.fn();
vi.mock('@/lib/apiCore', () => ({ request }));

const { storefrontApi } = await import('./storefrontApi');

describe('storefrontApi.publish', () => {
  it('uses the transactional CAS endpoint and forwards the observed version', async () => {
    request.mockResolvedValueOnce({ success: true, data: { status: 'PUBLISHED', id: 'published-1' } });

    await expect(storefrontApi.publish('2026-09-04T18:20:00.000Z')).resolves.toEqual({
      status: 'PUBLISHED',
      id: 'published-1',
    });

    expect(request).toHaveBeenCalledWith('/api/storefront/me/publish-safe', {
      method: 'POST',
      body: JSON.stringify({ expectedUpdatedAt: '2026-09-04T18:20:00.000Z' }),
    });
  });

  it('uses an empty body for an unversioned compatibility call', async () => {
    request.mockReset();
    request.mockResolvedValueOnce({ success: true, data: { status: 'PUBLISHED' } });

    await storefrontApi.publish();

    expect(request).toHaveBeenCalledWith('/api/storefront/me/publish-safe', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  });
});
