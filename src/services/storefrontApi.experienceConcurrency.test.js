import { describe, expect, it, vi } from 'vitest';

const request = vi.fn();
vi.mock('@/lib/apiCore', () => ({ request }));

const { storefrontApi } = await import('./storefrontApi');

describe('storefrontApi.saveExperience', () => {
  it('merges the blueprint into the latest draft and sends its optimistic version', async () => {
    request
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'draft-1',
          themeId: 'theme-1',
          updatedAt: '2026-09-04T18:20:00.000Z',
          layoutJson: {
            gridColumns: 4,
            tiles: [{ id: 'tile-1', widgetType: 'hero_header' }],
            experience: { preset: 'OLD' },
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'draft-1',
          themeId: 'theme-1',
          updatedAt: '2026-09-04T18:21:00.000Z',
          layoutJson: {
            gridColumns: 4,
            tiles: [{ id: 'tile-1', widgetType: 'hero_header' }],
            experience: { preset: 'DINING_JOURNEY' },
          },
        },
      });

    const blueprint = { preset: 'DINING_JOURNEY', navigation: { mode: 'CONTEXTUAL' } };
    const result = await storefrontApi.saveExperience(blueprint);

    expect(result).toEqual({
      preset: 'DINING_JOURNEY',
      navigation: { mode: 'CONTEXTUAL' },
    });
    expect(request).toHaveBeenNthCalledWith(1, '/api/storefront/me/draft', undefined);
    expect(request).toHaveBeenNthCalledWith(2, '/api/storefront/me/draft', {
      method: 'PUT',
      body: JSON.stringify({
        layoutJson: {
          gridColumns: 4,
          tiles: [{ id: 'tile-1', widgetType: 'hero_header' }],
          experience: blueprint,
        },
        themeId: 'theme-1',
        expectedUpdatedAt: '2026-09-04T18:20:00.000Z',
      }),
    });
  });

  it('does not discard non-experience draft content', async () => {
    request.mockReset();
    request
      .mockResolvedValueOnce({
        success: true,
        data: {
          themeId: 'theme-2',
          updatedAt: '2026-09-04T18:30:00.000Z',
          layoutJson: { tiles: [{ id: 'product-grid' }], metadata: { source: 'existing' } },
        },
      })
      .mockResolvedValueOnce({ success: true, data: { layoutJson: { experience: { preset: 'SHOP_FLOOR' } } } });

    await storefrontApi.saveExperience({ preset: 'SHOP_FLOOR' });

    const sent = JSON.parse(request.mock.calls[1][1].body);
    expect(sent.layoutJson.tiles).toEqual([{ id: 'product-grid' }]);
    expect(sent.layoutJson.metadata).toEqual({ source: 'existing' });
    expect(sent.expectedUpdatedAt).toBe('2026-09-04T18:30:00.000Z');
  });
});
