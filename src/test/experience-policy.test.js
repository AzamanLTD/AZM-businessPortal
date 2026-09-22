import { describe, expect, it } from 'vitest';

import { experiencePolicyForCategory } from '@/lib/experiencePolicy';

describe('category experience policy', () => {
  it('gives restaurants dining-safe controls only', () => {
    const policy = experiencePolicyForCategory('FOOD_BEVERAGE');

    expect(policy.presets).toEqual(['DINING_JOURNEY']);
    expect(policy.navigationModes).toEqual(['CONTEXTUAL']);
    expect(policy.detailPresentations).toEqual(['MORPH', 'DISH_DOSSIER']);
    expect(policy.commitStyles).toEqual(['MATERIAL', 'PAPER_RIP']);
    expect(policy.persistentTray).toBe(true);
    expect(policy.context).toEqual({ tableNumber: true, serviceMode: true, passenger: false });
  });

  it('gives hotels spatial controls without a cart commit metaphor', () => {
    const policy = experiencePolicyForCategory('HOSPITALITY');

    expect(policy.presets).toEqual(['BUILDING_WALK']);
    expect(policy.navigationModes).toEqual(['CONTEXTUAL', 'FLOOR_TRAVERSE']);
    expect(policy.detailPresentations).toEqual(['MORPH', 'ROOM_DOSSIER']);
    expect(policy.commitStyles).toEqual(['MATERIAL']);
    expect(policy.persistentTray).toBe(false);
    expect(policy.context.tableNumber).toBe(false);
  });

  it('gives transit journey context while suppressing restaurant context', () => {
    const policy = experiencePolicyForCategory('LOGISTICS');

    expect(policy.presets).toEqual(['TRAVEL_JOURNEY']);
    expect(policy.navigationModes).toEqual(['CONTEXTUAL', 'JOURNEY_TIMELINE']);
    expect(policy.detailPresentations).toEqual(['MORPH', 'SEAT_DOSSIER']);
    expect(policy.persistentTray).toBe(false);
    expect(policy.context).toEqual({ tableNumber: false, serviceMode: false, passenger: true });
  });

  it('gives retail collection and bag controls only', () => {
    const policy = experiencePolicyForCategory('RETAIL');

    expect(policy.presets).toEqual(['SHOP_FLOOR']);
    expect(policy.navigationModes).toEqual(['CONTEXTUAL', 'AISLE_TRAVERSE']);
    expect(policy.detailPresentations).toEqual(['MORPH', 'PRODUCT_DOSSIER']);
    expect(policy.commitStyles).toEqual(['MATERIAL', 'LIFT_INTO_TRAY']);
    expect(policy.persistentTray).toBe(true);
    expect(policy.context.passenger).toBe(false);
  });

  it('falls back to a restrained service journey for other categories', () => {
    expect(experiencePolicyForCategory('HEALTH_WELLNESS')).toEqual({
      presets: ['SERVICE_JOURNEY'],
      navigationModes: ['CONTEXTUAL'],
      detailPresentations: ['MORPH', 'SERVICE_DOSSIER'],
      commitStyles: ['MATERIAL'],
      persistentTray: false,
      context: { tableNumber: false, serviceMode: false, passenger: false },
    });
  });
});