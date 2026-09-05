import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invalidateQueries = vi.fn();
const handlers = new Map();
const socket = {
  on: vi.fn((event, handler) => handlers.set(event, handler)),
  off: vi.fn((event, handler) => {
    if (handlers.get(event) === handler) handlers.delete(event);
  }),
};

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
  useQuery: () => ({ data: { count: 0 } }),
}));

vi.mock('@/lib/socket', () => ({
  getSocket: () => socket,
}));

vi.mock('@/lib/api', () => ({
  notifications: {
    unreadCount: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));

import { useBizNotifications } from './useBizNotifications';

describe('useBizNotifications dine-in projection contract', () => {
  beforeEach(() => {
    invalidateQueries.mockClear();
    handlers.clear();
    socket.on.mockClear();
    socket.off.mockClear();
  });

  it.each([
    'DINE_IN_TAB_OPENED',
    'DINE_IN_TAB_ITEM_ADDED',
    'DINE_IN_TAB_ITEM_REMOVED',
    'DINE_IN_TAB_FINALIZED',
    'DINE_IN_TAB_PAID',
    'DINE_IN_TAB_CANCELLED',
  ])('invalidates canonical dine-in query roots for %s', (type) => {
    const { unmount } = renderHook(() => useBizNotifications());
    const handler = handlers.get('biz_notification');

    expect(handler).toBeTypeOf('function');
    handler({ type });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dine-in'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dine-in-tabs'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['openTabs'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dineInTab'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['biz-notifications-count'] });
    unmount();
  });

  it('does not turn unrelated business events into dine-in refreshes', () => {
    const { unmount } = renderHook(() => useBizNotifications());
    const handler = handlers.get('biz_notification');

    handler({ type: 'ORDER_FUNDED' });

    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['dine-in'] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['dine-in-tabs'] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['openTabs'] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['dineInTab'] });
    unmount();
  });
});
