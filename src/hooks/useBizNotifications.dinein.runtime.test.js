import { describe, expect, it, vi } from 'vitest';
import { handleBusinessNotificationProjection } from './useBizNotifications';

describe('business dine-in realtime runtime projection', () => {
  it.each([
    'DINE_IN_TAB_OPENED',
    'DINE_IN_TAB_ITEM_ADDED',
    'DINE_IN_TAB_ITEM_REMOVED',
    'DINE_IN_TAB_FINALIZED',
    'DINE_IN_TAB_PAID',
    'DINE_IN_TAB_CANCELLED',
  ])('invalidates every dine-in read root for %s', (type) => {
    const refreshNotifs = vi.fn();
    const invalidateRoots = vi.fn();

    handleBusinessNotificationProjection({ type }, { refreshNotifs, invalidateRoots });

    expect(refreshNotifs).toHaveBeenCalledTimes(1);
    expect(invalidateRoots).toHaveBeenCalledWith(
      'dine-in',
      'dine-in-tabs',
      'openTabs',
      'dineInTab',
    );
  });

  it('does not broaden an unrelated notification into dine-in invalidation', () => {
    const refreshNotifs = vi.fn();
    const invalidateRoots = vi.fn();

    handleBusinessNotificationProjection(
      { type: 'INVOICE_PAID' },
      { refreshNotifs, invalidateRoots },
    );

    expect(refreshNotifs).toHaveBeenCalledTimes(1);
    expect(invalidateRoots).not.toHaveBeenCalledWith(
      'dine-in',
      'dine-in-tabs',
      'openTabs',
      'dineInTab',
    );
    expect(invalidateRoots).toHaveBeenCalledWith(
      'invoices',
      'biz-invoices',
      'biz-invoice',
      'invoice-stats',
    );
  });
});
