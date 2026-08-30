import { describe, expect, it, vi } from 'vitest';

const handlers = new Map();

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    on: (event, handler) => handlers.set(event, handler),
    off: (event, handler) => {
      if (handlers.get(event) === handler) handlers.delete(event);
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  notifications: { unreadCount: vi.fn().mockResolvedValue(0) },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: 0 }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

describe('business notification event contract', () => {
  it('registers both notification event channels', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const React = await import('react');
    const { useBizNotifications } = await import('@/hooks/useBizNotifications');

    const client = new QueryClient();
    const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client }, children);
    const { unmount } = renderHook(() => useBizNotifications(), { wrapper });

    expect(handlers.has('biz_notification')).toBe(true);
    expect(handlers.has('biz_notifications_updated')).toBe(true);
    unmount();
    expect(handlers.size).toBe(0);
  });
});
