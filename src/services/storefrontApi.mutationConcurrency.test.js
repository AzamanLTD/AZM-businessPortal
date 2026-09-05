import { describe, expect, it, vi, beforeEach } from 'vitest';

const request = vi.fn();
vi.mock('@/lib/apiCore', () => ({ request }));

const { storefrontApi } = await import('./storefrontApi');

describe('storefrontApi draft mutation CAS contracts', () => {
  beforeEach(() => request.mockReset());

  it('forwards expectedUpdatedAt when reverting a version', async () => {
    request.mockResolvedValueOnce({ success: true, data: { id: 'draft-1', status: 'DRAFT' } });

    await expect(
      storefrontApi.revertToVersion('version-1', '2026-09-05T00:00:00.000Z'),
    ).resolves.toEqual({ id: 'draft-1', status: 'DRAFT' });

    expect(request).toHaveBeenCalledWith('/api/storefront/me/revert', {
      method: 'POST',
      body: JSON.stringify({
        versionId: 'version-1',
        expectedUpdatedAt: '2026-09-05T00:00:00.000Z',
      }),
    });
  });

  it('forwards expectedUpdatedAt when applying a template', async () => {
    request.mockResolvedValueOnce({ success: true, data: { id: 'draft-2', status: 'DRAFT' } });

    await expect(
      storefrontApi.applyTemplate('template-1', '2026-09-05T00:00:00.000Z'),
    ).resolves.toEqual({ id: 'draft-2', status: 'DRAFT' });

    expect(request).toHaveBeenCalledWith('/api/storefront/me/apply-template', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'template-1',
        expectedUpdatedAt: '2026-09-05T00:00:00.000Z',
      }),
    });
  });

  it('keeps unversioned compatibility bodies explicit', async () => {
    request.mockResolvedValue({ success: true, data: {} });

    await storefrontApi.revertToVersion('version-1');
    await storefrontApi.applyTemplate('template-1');

    expect(request).toHaveBeenNthCalledWith(1, '/api/storefront/me/revert', {
      method: 'POST',
      body: JSON.stringify({ versionId: 'version-1' }),
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/storefront/me/apply-template', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'template-1' }),
    });
  });
});
