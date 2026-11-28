import { describe, expect, it, vi, beforeEach } from 'vitest';

const request = vi.fn();
vi.mock('@/lib/apiCore', () => ({ request }));

const { storefrontApi } = await import('./storefrontApi');

beforeEach(() => request.mockReset());

describe('storefrontApi.getExperience', () => {
  it('reads the business experience settings', async () => {
    request.mockResolvedValueOnce({ success: true, data: { category: 'FOOD_BEVERAGE', blueprint: { preset: 'DINING_JOURNEY' } } });
    const out = await storefrontApi.getExperience();
    expect(request).toHaveBeenCalledWith('/api/storefront/me/experience', undefined);
    expect(out).toEqual({ category: 'FOOD_BEVERAGE', blueprint: { preset: 'DINING_JOURNEY' } });
  });
});

describe('storefrontApi.saveExperience', () => {
  it('saves through the experience endpoint with the latest draft version', async () => {
    request
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'draft-1',
          themeId: 'theme-1',
          updatedAt: '2026-09-04T18:20:00.000Z',
          layoutJson: { gridColumns: 4, tiles: [{ id: 'tile-1', widgetType: 'hero_header' }], experience: { preset: 'OLD' } },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { preset: 'DINING_JOURNEY', navigation: { mode: 'CONTEXTUAL' } },
      });

    const blueprint = { preset: 'DINING_JOURNEY', navigation: { mode: 'CONTEXTUAL' } };
    const result = await storefrontApi.saveExperience(blueprint);

    // The server's normalized blueprint comes back.
    expect(result).toEqual({ preset: 'DINING_JOURNEY', navigation: { mode: 'CONTEXTUAL' } });
    expect(request).toHaveBeenNthCalledWith(1, '/api/storefront/me/draft', undefined);
    expect(request).toHaveBeenNthCalledWith(2, '/api/storefront/me/experience', {
      method: 'PUT',
      body: JSON.stringify({ ...blueprint, expectedUpdatedAt: '2026-09-04T18:20:00.000Z' }),
    });
  });

  it('never sends the layout (the server keeps the tiles)', async () => {
    request
      .mockResolvedValueOnce({ success: true, data: { themeId: 'theme-2', updatedAt: '2026-09-04T18:30:00.000Z', layoutJson: { tiles: [{ id: 'product-grid' }] } } })
      .mockResolvedValueOnce({ success: true, data: { preset: 'SHOP_FLOOR' } });

    await storefrontApi.saveExperience({ preset: 'SHOP_FLOOR' });

    const sent = JSON.parse(request.mock.calls[1][1].body);
    expect(sent).toEqual({ preset: 'SHOP_FLOOR', expectedUpdatedAt: '2026-09-04T18:30:00.000Z' });
    expect(sent).not.toHaveProperty('layoutJson');
  });
});
