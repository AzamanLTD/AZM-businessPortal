import { describe, expect, it, vi, beforeEach } from 'vitest';

const handlers = new Map();

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    on: (event, handler) => handlers.set(event, handler),
    off: (event, handler) => {
      if (handlers.get(event) === handler) handlers.delete(event);
    },
  }),
}));

describe('business realtime escrow refund convergence', () => {
  beforeEach(() => handlers.clear());

  it('invalidates order projections without treating escrowId as an orderId', async () => {
    const { installRealtimeQueryBridge, uninstallRealtimeQueryBridge } =
      await import('@/lib/realtimeQueryBridge');
    const invalidations = [];
    const queryClient = {
      invalidateQueries: vi.fn((args) => invalidations.push(args)),
    };

    expect(installRealtimeQueryBridge(queryClient)).toBe(true);
    handlers.get('escrow_refunded')({
      escrowId: 'escrow-123',
      ticketId: 'ticket-456',
      status: 'EXPIRED',
      reason: 'EXPIRY',
    });

    expect(invalidations.some((x) => x.queryKey?.[0] === 'orders')).toBe(true);
    expect(invalidations.some((x) => x.queryKey?.[0] === 'orders-stats')).toBe(true);
    expect(invalidations.some((x) => x.queryKey?.[0] === 'order' && x.queryKey?.[1] === 'escrow-123')).toBe(false);

    uninstallRealtimeQueryBridge();
    expect(handlers.size).toBe(0);
  });
});
