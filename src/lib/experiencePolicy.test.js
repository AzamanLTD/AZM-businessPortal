import { describe, expect, it } from 'vitest';
import { experiencePolicyForCategory } from './experiencePolicy';

describe('experiencePolicyForCategory', () => {
  it('allows a persistent tray for dining and retail journeys', () => {
    expect(experiencePolicyForCategory('FOOD_BEVERAGE').persistentTray).toBe(true);
    expect(experiencePolicyForCategory('RETAIL').persistentTray).toBe(true);
  });

  it('forbids a persistent tray for spatial and travel journeys', () => {
    expect(experiencePolicyForCategory('HOSPITALITY').persistentTray).toBe(false);
    expect(experiencePolicyForCategory('LOGISTICS').persistentTray).toBe(false);
    expect(experiencePolicyForCategory('TRANSIT').persistentTray).toBe(false);
  });

  it('trims and normalizes category keys', () => {
    expect(experiencePolicyForCategory(' hotel ').presets).toEqual(['BUILDING_WALK']);
    expect(experiencePolicyForCategory('retail').presets).toEqual(['SHOP_FLOOR']);
  });

  it('maps portal business categories to the matching experience policy', () => {
    expect(experiencePolicyForCategory('REAL_ESTATE').presets).toEqual(['BUILDING_WALK']);
    expect(experiencePolicyForCategory('FREELANCE_SERVICES').presets).toEqual(['SERVICE_JOURNEY']);
    expect(experiencePolicyForCategory('OTHER').presets).toEqual(['SERVICE_JOURNEY']);
  });
});
