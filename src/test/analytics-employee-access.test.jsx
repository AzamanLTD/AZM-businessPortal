// src/test/analytics-employee-access.test.jsx
// =============================================================================
// Analytics employee access / data-contract regression (PR #112 correction).
//
// The /analytics route gate admits any account with analytics.view — but the
// backend serves two DIFFERENT data surfaces:
//   • businessOS analytics endpoints (/analytics/predictive, /analytics/
//     customer) — requirePermission('analytics.view') with employment-aware
//     resolveBusinessContext: authorized for owners AND employees;
//   • the legacy /api/business/orders feed — businessOrderController requires
//     OWNERSHIP; an employee is refused with 403.
//
// Contracts locked here:
//   • an employee (user, no owned BusinessProfile) NEVER calls the
//     owner-only orders feed;
//   • employee KPIs come from the server-computed 30-day customer aggregate;
//   • order-history panels state honest unavailability — no empty charts;
//   • a server refusal (403) surfaces as an explicit error state, never as
//     an empty successful dataset (no fake zeros, no "no risks detected");
//   • an owner keeps the walked order feed and never calls the employee
//     aggregate.
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

vi.mock('@/lib/api', () => ({
  request: (...a) => requestMock(...a),
  auth: { restore: async () => ({ accessToken: 'test-token', user: { id: 'u1', username: 'test' } }) },
  business: { me: async (...a) => requestMock('/api/business/me', ...a) },
  orders: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return requestMock(`/api/business/orders${qs ? `?${qs}` : ''}`);
    },
    // Mirrors src/lib/api.js orders.listAll (the production helper).
    listAll: async (params = {}, { maxPages = 10, limit = 50 } = {}) => {
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
  analytics: {
    predictive: () => requestMock('/api/business-os/analytics/predictive'),
    customer30d: () => requestMock('/api/business-os/analytics/customer?startDate=x&endDate=y'),
  },
}));

import { AuthProvider } from '@/lib/AuthContext';
import Analytics from '@/pages/Analytics';

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

async function renderAnalytics({ waitFor: condition }) {
  render(
    <QueryClientProvider client={qc()}>
      <AuthProvider>
        <Analytics />
      </AuthProvider>
    </QueryClientProvider>
  );
  // Do NOT key the wait on the static '30-day Orders' label: during the
  // pre-auth flash (user not yet restored) the KPI row already renders with
  // empty values, so the label is present before any employee query fires.
  // Wait for the condition that proves the relevant data path resolved.
  await waitFor(condition);
}

const orderFeedCalls = () => requestMock.mock.calls.filter(c => String(c[0]).includes('/api/business/orders?') || String(c[0]).startsWith('/api/business/orders'));
const customerAggCalls = () => requestMock.mock.calls.filter(c => String(c[0]).includes('/api/business-os/analytics/customer'));

beforeEach(() => { requestMock.mockReset(); });

describe('Analytics — employee with analytics.view and no BusinessProfile', () => {
  it('never calls the owner-only orders feed; KPIs read the server aggregate; order-history panels are honestly unavailable', async () => {
    requestMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u === '/api/business/me') return { business: null }; // employee: no owned profile
      if (u.includes('/api/business-os/analytics/predictive')) {
        return { success: true, forecast: [{ date: 'Mon Oct 12', forecast: 4, dow: 'Mon' }], churnRisk: [], inventoryAlerts: [] };
      }
      if (u.includes('/api/business-os/analytics/customer')) {
        // The backend-authorized 30-day aggregate for analytics.view.
        return { success: true, data: { totalOrders: 37, uniqueCustomers: 12, repeatRate: 30, avgOrderValue: 25, avgRating: 4.5, reviewCount: 10 } };
      }
      throw new Error(`Unexpected request in employee mode: ${u}`);
    });
    await renderAnalytics({ waitFor: () => expect(screen.getByTestId('employee-analytics-notice')).toBeTruthy() });

    // The owner-only legacy feed was NEVER requested.
    expect(orderFeedCalls()).toHaveLength(0);

    // The backend-authorized aggregate WAS requested.
    expect(customerAggCalls()).toHaveLength(1);

    // Employee data-contract notice is shown.
    expect(screen.getByTestId('employee-analytics-notice').textContent)
      .toMatch(/server-computed insights/i);

    // KPIs come from the server aggregate — 37 orders in the trailing window.
    await waitFor(() => expect(screen.getAllByText('37').length).toBeGreaterThan(0));

    // Order-history panels state honest unavailability — every one of them.
    for (const id of ['employee-unavailable-revenue', 'employee-unavailable-dow', 'employee-unavailable-comparisons', 'employee-unavailable-products']) {
      const el = screen.getByTestId(id);
      expect(el.textContent).toMatch(/Owner order feed required/i);
    }

    // The server-computed forecast renders for the employee.
    expect(screen.getByText('Mon Oct 12')).toBeTruthy();

    // No refusal, no truncation notice — this account was served honestly.
    expect(screen.queryByTestId('analytics-refusal-notice')).toBeNull();
    expect(screen.queryByTestId('orders-truncated-notice')).toBeNull();
  });

  it('surfaces a 403 refusal explicitly — never as empty data or fake zeros', async () => {
    requestMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u === '/api/business/me') return { business: null };
      // Server refuses every analytics endpoint for this account (e.g.
      // analytics.view revoked): 403, the same way apiCore throws.
      if (u.includes('/api/business-os/analytics/')) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }
      throw new Error(`Unexpected request in refusal mode: ${u}`);
    });
    await renderAnalytics({ waitFor: () => expect(screen.getByTestId('analytics-refusal-notice')).toBeTruthy() });

    // The owner-only feed still was never called.
    expect(orderFeedCalls()).toHaveLength(0);

    // Explicit refusal state, not a silent empty success.
    expect(screen.getByTestId('analytics-refusal-notice').textContent)
      .toMatch(/server refused the analytics request/i);

    // Forecast + churn panels show the refusal — churn must NOT claim
    // "no churn risks detected" off a 403.
    expect(screen.getByTestId('forecast-refused').textContent).toMatch(/refused/i);
    expect(screen.getByTestId('churn-refused').textContent).toMatch(/refused/i);
    expect(screen.queryByText(/No churn risks detected/i)).toBeNull();

    // KPI values that depend on refused data render an explicit
    // unavailable marker, never a zero presented as data.
    const kpiRow = screen.getByText('30-day Revenue').closest('div').parentElement;
    expect(kpiRow.textContent).toContain('—');

    // No employee-aggregate numbers are fabricated from the refusal.
    expect(customerAggCalls()).toHaveLength(1);
  });
});

describe('Analytics — owner (unchanged contract)', () => {
  it('keeps the walked order feed, never calls the employee aggregate, and shows no employee notice', async () => {
    const makeOrder = i => ({
      id: `o-${i}`, azamanId: `AZ-${1000 + i}`,
      createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
      status: 'COMPLETED', amountUsdc: 10, productName: 'Widget',
    });
    requestMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u === '/api/business/me') return { business: { id: 'b1', userId: 'u1' } }; // owner
      if (u.includes('/api/business-os/analytics/predictive')) {
        return { success: true, forecast: [{ date: 'Mon Oct 12', forecast: 4, dow: 'Mon' }], churnRisk: [], inventoryAlerts: [] };
      }
      if (u.includes('/api/business/orders')) {
        return { orders: [makeOrder(0), makeOrder(1), makeOrder(2)], total: 3, hasMore: false, nextCursor: null };
      }
      throw new Error(`Unexpected request in owner mode: ${u}`);
    });
    await renderAnalytics({ waitFor: () => expect(orderFeedCalls().length).toBeGreaterThan(0) });

    // The walked order feed WAS used.
    expect(orderFeedCalls().length).toBeGreaterThan(0);
    // The employee aggregate was NOT requested — it is the employee surface.
    expect(customerAggCalls()).toHaveLength(0);
    // No employee notice or refusal on a served owner.
    expect(screen.queryByTestId('employee-analytics-notice')).toBeNull();
    expect(screen.queryByTestId('analytics-refusal-notice')).toBeNull();
    // Order-history panels render (no honest-unavailable placeholders).
    for (const id of ['employee-unavailable-revenue', 'employee-unavailable-dow', 'employee-unavailable-comparisons', 'employee-unavailable-products']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });
});
