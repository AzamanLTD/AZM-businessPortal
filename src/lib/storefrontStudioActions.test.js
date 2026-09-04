import { describe, expect, it } from 'vitest';
import {
  STOREFRONT_ACTION_TYPES,
  listStorefrontActions,
  normalizeStorefrontActions,
  validateStorefrontAction,
} from './storefrontStudioActions';

describe('storefrontStudioActions', () => {
  it('exposes a finite declarative action registry', () => {
    const actions = listStorefrontActions();
    expect(actions.length).toBeGreaterThan(5);
    expect(actions.map((action) => action.type)).toContain(STOREFRONT_ACTION_TYPES.ADD_TO_CART);
    expect(actions.map((action) => action.type)).not.toContain('runJavascript');
  });

  it('validates required action targets', () => {
    expect(validateStorefrontAction({ type: STOREFRONT_ACTION_TYPES.ADD_TO_CART })).toMatchObject({
      valid: false,
      code: 'INVALID_ACTION',
    });
    expect(validateStorefrontAction({ type: STOREFRONT_ACTION_TYPES.ADD_TO_CART, productId: 'p1' }).valid).toBe(true);
  });

  it('validates internal page and node references', () => {
    expect(validateStorefrontAction(
      { type: STOREFRONT_ACTION_TYPES.NAVIGATE_PAGE, pageId: 'missing' },
      { pageIds: ['home'] },
    ).valid).toBe(false);

    expect(validateStorefrontAction(
      { type: STOREFRONT_ACTION_TYPES.SCROLL_TO, nodeId: 'hero' },
      { nodeIds: ['hero'] },
    ).valid).toBe(true);
  });

  it('rejects unsafe external URL forms', () => {
    expect(validateStorefrontAction({
      type: STOREFRONT_ACTION_TYPES.OPEN_EXTERNAL_URL,
      url: 'javascript:alert(1)',
    }).valid).toBe(false);
    expect(validateStorefrontAction({
      type: STOREFRONT_ACTION_TYPES.OPEN_EXTERNAL_URL,
      url: 'https://example.com/store',
    }).valid).toBe(true);
    expect(validateStorefrontAction({
      type: STOREFRONT_ACTION_TYPES.OPEN_EXTERNAL_URL,
      url: 'https://user:pass@example.com',
    }).valid).toBe(false);
  });

  it('normalizes only valid actions and strips unknown action shapes', () => {
    const normalized = normalizeStorefrontActions({
      tap: { type: STOREFRONT_ACTION_TYPES.OPEN_CART },
      bad: { type: 'runJavascript', code: 'alert(1)' },
      page: { type: STOREFRONT_ACTION_TYPES.NAVIGATE_PAGE, pageId: 'home' },
    }, { pageIds: ['home'] });

    expect(normalized).toEqual({
      tap: { type: STOREFRONT_ACTION_TYPES.OPEN_CART },
      page: { type: STOREFRONT_ACTION_TYPES.NAVIGATE_PAGE, pageId: 'home' },
    });
    expect(normalized.bad).toBeUndefined();
  });
});
