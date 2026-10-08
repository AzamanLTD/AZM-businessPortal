import { describe, expect, it, vi, beforeEach } from 'vitest';

const requestMock = vi.fn();

vi.mock('./apiCore', () => ({
  request: (...args) => requestMock(...args),
  restoreBusinessSession: vi.fn(),
  logoutBusinessSession: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { orders } from './api';

const page = (ordersList, { hasMore = false, nextCursor = null, total } = {}) => ({
  success: true,
  orders: ordersList,
  hasMore,
  nextCursor,
  ...(total !== undefined ? { total } : {}),
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('orders.listAll — backend cursor pagination contract', () => {
  it('walks nextCursor pages until the backend reports hasMore: false', async () => {
    requestMock
      .mockResolvedValueOnce(page([{ id: 'o1' }], { hasMore: true, nextCursor: 'c1', total: 3 }))
      .mockResolvedValueOnce(page([{ id: 'o2' }, { id: 'o3' }], { hasMore: false, nextCursor: null, total: 3 }));

    const result = await orders.listAll({ status: 'PAID' });

    expect(result.orders.map((o) => o.id)).toEqual(['o1', 'o2', 'o3']);
    expect(result.truncated).toBe(false);
    expect(result.total).toBe(3);
    expect(requestMock).toHaveBeenCalledTimes(2);

    const firstUrl = requestMock.mock.calls[0][0];
    const secondUrl = requestMock.mock.calls[1][0];
    expect(firstUrl).toContain('/api/business/orders?');
    expect(firstUrl).toContain('status=PAID');
    expect(firstUrl).toContain('limit=50');
    expect(firstUrl).not.toContain('cursor=');
    expect(secondUrl).toContain('cursor=c1');
  });

  it('returns a single page when the first response has no more pages', async () => {
    requestMock.mockResolvedValueOnce(page([{ id: 'o1' }], { hasMore: false }));

    const result = await orders.listAll();

    expect(result.orders).toHaveLength(1);
    expect(result.truncated).toBe(false);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('is bounded by maxPages and reports honest truncation instead of looping forever', async () => {
    requestMock.mockImplementation(async (url) =>
      page([{ id: `o_${url}` }], { hasMore: true, nextCursor: `cursor_${requestMock.mock.calls.length}` }));

    const result = await orders.listAll({}, { maxPages: 3 });

    expect(requestMock).toHaveBeenCalledTimes(3);
    expect(result.truncated).toBe(true);
    expect(result.orders).toHaveLength(3);
  });

  it('throws on an unexpected response shape instead of silently returning empty data', async () => {
    requestMock.mockResolvedValueOnce({ success: true });

    await expect(orders.listAll()).rejects.toThrow(/response shape/);
  });
});
