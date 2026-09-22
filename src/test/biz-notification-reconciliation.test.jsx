import { describe, expect, it, vi } from 'vitest';

const handlers = new Map();
const invalidations = [];

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
      invalidateQueries: vi.fn((args) => invalidations.push(args)),
    }),
  };
});

describe('business notification event contract', () => {
  it('refreshes invoice projections for an invoice-paid event', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const React = await import('react');
    const { useBizNotifications } = await import('@/hooks/useBizNotifications');

    const client = new QueryClient();
    const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client }, children);
    const { unmount } = renderHook(() => useBizNotifications(), { wrapper });

    handlers.get('biz_notification')({ type: 'INVOICE_PAID' });

    expect(invalidations.some((x) => x.queryKey?.[0] === 'biz-invoices')).toBe(true);
    expect(invalidations.some((x) => x.queryKey?.[0] === 'invoice-stats')).toBe(true);
    unmount();
    expect(handlers.size).toBe(0);
  });
});
