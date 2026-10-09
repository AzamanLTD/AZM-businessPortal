// src/test/analytics-orders-pagination.test.jsx
// =============================================================================
// Analytics orders-feed pagination contract (PR #110 defect class, tracked
// follow-up for Analytics.jsx).
//
// The backend clamps GET /api/business/orders `limit` to 50 and pages by
// `nextCursor`. The old `list({ limit: 200 })` call was silently truncated to
// 50 orders, so every metric on the page (30-day revenue, DOW profile, weekly
// comparisons, top products) was computed from a partial order surface
// presented as complete.
//
// Contracts locked here:
//   • the feed walks the backend cursor (all pages fetched, not just page 1)
//   • metrics count every fetched order, not a silently clamped subset
//   • when the bounded walk stops early, an honest truncation notice is shown
//   • no notice when the surface is complete
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

// jsdom lacks ResizeObserver; recharts' ResponsiveContainer needs it.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
}

vi.mock('@/lib/api', () => ({
  request: (...a) => requestMock(...a),
  // Auth bootstrap: a logged-in owner with a live business profile.
  auth: { restore: async () => ({ accessToken: 'test-token', user: { id: 'u1', username: 'test' } }) },
  business: { me: async () => ({ business: { id: 'b1', userId: 'u1' } }) },
  orders: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return requestMock(`/api/business/orders${qs ? `?${qs}` : ''}`);
    },
    listAll: async (params = {}, { maxPages = 10, limit = 50 } = {}) => {
      // Mirrors src/lib/api.js orders.listAll (the production helper).
      const out = [];
      let cursor = null;
      let total = null;
      for (let page = 0; page < maxPages; page++) {
        const qs = new URLSearchParams({ ...params, limit: String(limit), ...(cursor ? { cursor } : {}) }).toString();
        const result = await requestMock(`/api/business/orders?${qs}`);
        if (!result || !Array.isArray(result.orders)) throw new Error('Unexpected response shape');
        out.push(...result.orders);
        if (typeof result.total === 'number') total = result.total;
        if (!result.hasMore || !result.nextCursor) return { orders: out, total, truncated: false };
        cursor = result.nextCursor;
      }
      return { orders: out, total, truncated: true };
    },
  },
  analytics: { predictive: () => requestMock('/api/business/analytics/predictive') },
}));

import { AuthProvider } from '@/lib/AuthContext';
import Analytics from '@/pages/Analytics';

const makeOrder = (i, status = 'COMPLETED') => ({
  id: `o-${i}`,
  azamanId: `AZ-${1000 + i}`,
  createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
  status,
  amountUsdc: 10,
  productName: 'Widget',
});

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

async function renderAnalytics({ pages }) {
  render(
    <QueryClientProvider client={qc()}>
      <AuthProvider>
        <Analytics />
      </AuthProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('30-day Orders')).toBeTruthy());
  // Let the async cursor walk settle.
  await waitFor(() => expect(requestMock.mock.calls.filter(c => String(c[0]).includes('/api/business/orders')).length).toBeGreaterThanOrEqual(1));
}

function orderPageCalls() {
  return requestMock.mock.calls.filter(c => String(c[0]).includes('/api/business/orders?'));
}

beforeEach(() => { requestMock.mockReset(); });

describe('Analytics orders feed — backend cursor pagination', () => {
  it('walks the cursor and counts every order, not a silently clamped 50', async () => {
    // 3 pages: 50 + 50 + 10 = 110 orders, all COMPLETED within the window.
    requestMock.mockImplementation(async (url) => {
      if (String(url).includes('/analytics/predictive')) return { forecast: [], churnRisk: [], inventoryAlerts: [] };
      const u = new URL(String(url), 'http://x');
      const cursor = u.searchParams.get('cursor');
      if (!cursor) return { orders: Array.from({ length: 50 }, (_, i) => makeOrder(i)), total: 110, hasMore: true, nextCursor: 'p2' };
      if (cursor === 'p2') return { orders: Array.from({ length: 50 }, (_, i) => makeOrder(50 + i)), total: 110, hasMore: true, nextCursor: 'p3' };
      return { orders: Array.from({ length: 10 }, (_, i) => makeOrder(100 + i)), total: 110, hasMore: false, nextCursor: null };
    });
    await renderAnalytics({ pages: 3 });
    // The cursor was actually followed: page 2 and 3 were requested.
    expect(orderPageCalls().some(c => String(c[0]).includes('cursor=p2'))).toBe(true);
    expect(orderPageCalls().some(c => String(c[0]).includes('cursor=p3'))).toBe(true);
    // 30-day Orders KPI reflects ALL 110 fetched orders, not a clamped 50:
    // the count value itself (fmt(110, 0) → "110") must be on the page.
    expect(screen.getAllByText('110').length).toBeGreaterThan(0);
    // Complete surface → no truncation notice.
    expect(screen.queryByTestId('orders-truncated-notice')).toBeNull();
  });

  it('shows an honest truncation notice when the bounded walk stops early', async () => {
    // Backend always reports more pages: listAll stops at its bound and must
    // surface partial coverage instead of presenting it as complete.
    requestMock.mockImplementation(async (url) => {
      if (String(url).includes('/analytics/predictive')) return { forecast: [], churnRisk: [], inventoryAlerts: [] };
      return { orders: Array.from({ length: 50 }, (_, i) => makeOrder(i)), total: 9999, hasMore: true, nextCursor: 'loop' };
    });
    render(
      <QueryClientProvider client={qc()}>
        <AuthProvider>
          <Analytics />
        </AuthProvider>
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByTestId('orders-truncated-notice')).toBeTruthy());
    // The notice states how many orders the metrics actually cover and that
    // older orders sit outside the window — never a silent partial surface.
    expect(screen.getByTestId('orders-truncated-notice').textContent).toMatch(/most recent 500 orders/i);
    expect(screen.getByTestId('orders-truncated-notice').textContent).toMatch(/of about 9,?999/i);
    expect(screen.getByTestId('orders-truncated-notice').textContent).toMatch(/older\s+orders are outside this analytics window/i);
  });
});
