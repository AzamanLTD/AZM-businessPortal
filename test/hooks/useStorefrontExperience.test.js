import { describe, expect, test } from 'vitest';
import { mergeDraftExperience } from '@/hooks/useStorefront';

describe('mergeDraftExperience', () => {
  const currentDraft = {
    layoutJson: {
      schemaVersion: 1,
      tiles: [{ id: 'tile-1', widgetType: 'hero_header' }],
      experience: {
        schemaVersion: 1,
        preset: 'DINING_JOURNEY',
        motion: { tempo: 'RELAXED' },
      },
    },
  };

  test('preserves the current experience when incoming layout is legacy/partial', () => {
    const result = mergeDraftExperience(
      { schemaVersion: 1, tiles: [{ id: 'tile-2', widgetType: 'product_grid' }] },
      currentDraft,
    );

    expect(result.experience).toEqual(currentDraft.layoutJson.experience);
    expect(result.tiles).toHaveLength(1);
    expect(result.tiles[0].id).toBe('tile-2');
  });

  test('keeps an explicit incoming experience snapshot authoritative', () => {
    const incomingExperience = {
      schemaVersion: 1,
      preset: 'SHOP_FLOOR',
      motion: { tempo: 'QUICK' },
    };

    const result = mergeDraftExperience(
      { schemaVersion: 1, tiles: [], experience: incomingExperience },
      currentDraft,
    );

    expect(result.experience).toEqual(incomingExperience);
  });

  test('does not invent an experience snapshot when none exists', () => {
    const result = mergeDraftExperience(
      { schemaVersion: 1, tiles: [] },
      { layoutJson: { schemaVersion: 1, tiles: [] } },
    );

    expect(Object.prototype.hasOwnProperty.call(result, 'experience')).toBe(false);
  });

  test('preserves an explicit null so callers can intentionally clear the snapshot', () => {
    const result = mergeDraftExperience(
      { schemaVersion: 1, tiles: [], experience: null },
      currentDraft,
    );

    expect(result.experience).toBeNull();
  });
});
