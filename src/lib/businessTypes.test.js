import { describe, expect, it } from 'vitest';
import { getTypeConfig } from './businessTypes';

describe('getTypeConfig', () => {
  it('resolves a full business profile by category', () => {
    expect(getTypeConfig({ category: 'FOOD_BEVERAGE' }).type).toBe('RESTAURANT');
  });

  it('resolves a backend business_type string used by the dashboard', () => {
    expect(getTypeConfig('TRANSIT').type).toBe('TRANSIT');
    expect(getTypeConfig('HOTEL').type).toBe('HOTEL');
  });

  it('falls back safely for unknown input', () => {
    expect(getTypeConfig(undefined).type).toBe('GENERAL');
  });
});
