import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { createElement } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Payroll disbursement honesty (Financial-Action Integrity milestone, follow-up
// to PR #115's flagged remaining risks).
//
// Backend contract (AZM-backend main, read-only):
//  POST /api/business-os/payroll/disburse (requirePermission('payroll.disburse'))
//  - { payrollId } → { success: true, result: <settled record> } — settles
//    synchronously inside a transaction guarded by an atomic claim
//    ("Payroll already disbursed or not pending."), so a duplicate settle is
//    refused by the server, never double-paid.
//  - { period } → { success: true, results: [{ payrollId, status, error? }] }
//    — per-item outcomes; HTTP 200 even when every item fails.
//  The businessOS wrap maps thrown errors to err.statusCode||400 with the
//  server's own message in err.message.
//
// Old portal behavior under test (the defects):
//  - Promise.all fan-out aborted at first rejection → committed disbursements
//    reported as failures ("Failed to disburse some or all payments"), typed
//    server refusals erased.
//  - Single disburse: blanket 'Disbursement failed' hid the server's typed
//    refusal messages; unknown outcomes (no HTTP answer) were called failures.
//  - toast.warning(...) never existed on the toast API (latent TypeError).
//  - financeApi.payOut was dead code (defined, never called) — removed.
// ─────────────────────────────────────────────────────────────────────────────

const apiState = { disburseImpl: null, disburseCalls: [] };

const readyRecord = (id, name) => ({
  id,
  status: 'READY',
  payrollType: 'SALARY',
  grossAmount: 120,
  deductionAmount: 10,
  ewaDeduction: 0,
  netAmount: 110,
  period: '2026-10',
  employee: { title: 'Cook', user: { fullName: name } },
});

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

vi.mock('@/lib/marketplaceApi', () => ({
  payrollApi: {
    summary: vi.fn(async () => ({ data: { count: 2 } })),
    list: vi.fn(async () => ({ data: { records: [readyRecord('pr-1', 'Ama Mensah'), readyRecord('pr-2', 'Kofi Boateng')] } })),
    process: vi.fn(async () => ({})),
    disburse: vi.fn((payload) => {
      apiState.disburseCalls.push(payload);
      return apiState.disburseImpl(payload, apiState.disburseCalls.length);
    }),
  },
  ewaApi: {
    summary: vi.fn(async () => ({ data: {} })),
    eligibility: vi.fn(async () => ({ data: {} })),
    history: vi.fn(async () => ({ data: { withdrawals: [] } })),
    withdraw: vi.fn(),
  },
  employeeApi: { list: vi.fn(async () => ({ data: { employees: [] } })) },
  financeApi: { payoutDestinations: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn(), neutral: vi.fn() } }));

vi.mock('@/components/instrument', async () => {
  const React = await import('react');
  const passthrough = (tag) => ({ children, ...props }) =>
    React.createElement(tag, { ...props }, children);
  return {
    Card: passthrough('div'),
    Button: ({ children, onClick, disabled, loading, type }) =>
      React.createElement('button', {
        onClick, disabled: !!disabled || !!loading, type: type || 'button',
      }, children),
    Tag: passthrough('span'),
    Input: passthrough('input'),
    Select: passthrough('select'),
    Dialog: ({ open, children }) => (open ? React.createElement('div', null, children) : null),
    Empty: passthrough('div'),
    Skel: passthrough('div'),
    Avatar: passthrough('div'),
    StatCard: passthrough('div'),
    Tooltip: passthrough('div'),
    Progress: passthrough('div'),
  };
});

import { toast } from '@/lib/toast';
import { financeApi } from '@/lib/marketplaceApi';
import Payroll from '@/pages/employees/Payroll';

function stopTexts() { return toast.stop.mock.calls.map(c => String(c[0])); }

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiState.disburseCalls = [];
  apiState.disburseImpl = null;
  render(createElement(Payroll));
});

describe('Payroll disburse-all — honest fan-out reporting', () => {
  it('reports ALL from the server when every ready payment settles, one call per record', async () => {
    apiState.disburseImpl = async () => ({ success: true, result: { id: 'x' } });
    await waitFor(() => screen.getByText('Disburse All Ready Payments'));
    await act(async () => { fireEvent.click(screen.getByText('Disburse All Ready Payments')); });

    await waitFor(() => expect(toast.go).toHaveBeenCalled());
    expect(toast.go.mock.calls[0][0]).toBe('All 2 ready payroll payments disbursed per the server');
    expect(apiState.disburseCalls.map(c => c.payrollId).sort()).toEqual(['pr-1', 'pr-2']);
  });

  it('a partial refusal reports the exact settled/refused split and the SERVER message — committed payments are not called failures', async () => {
    apiState.disburseImpl = async (payload) => {
      if (payload.payrollId === 'pr-2') {
        throw Object.assign(new Error('Payroll already disbursed or not pending.'), { statusCode: 400 });
      }
      return { success: true, result: { id: payload.payrollId } };
    };
    await waitFor(() => screen.getByText('Disburse All Ready Payments'));
    await act(async () => { fireEvent.click(screen.getByText('Disburse All Ready Payments')); });

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    const title = stopTexts()[0];
    expect(title).toBe('1 of 2 payroll payments disbursed — 1 refused');
    const desc = toast.stop.mock.calls[0][1]?.description || '';
    expect(desc).toContain('Payroll already disbursed or not pending.');
    // the old blanket lie is gone
    expect(stopTexts()).not.toContain('Failed to disburse some or all payments');
  });

  it('an UNKNOWN outcome (no HTTP answer) is never called a failure — and states the server blocks double settlement', async () => {
    apiState.disburseImpl = async (payload) => {
      if (payload.payrollId === 'pr-2') throw new TypeError('fetch aborted'); // no statusCode
      return { success: true, result: { id: payload.payrollId } };
    };
    await waitFor(() => screen.getByText('Disburse All Ready Payments'));
    await act(async () => { fireEvent.click(screen.getByText('Disburse All Ready Payments')); });

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    const title = stopTexts()[0];
    expect(title).toBe('1 of 2 payroll payments confirmed — 1 with unknown outcome');
    const desc = toast.stop.mock.calls[0][1]?.description || '';
    expect(desc).toMatch(/may have gone through/i);
    expect(desc).toMatch(/refuses to settle an already-disbursed payroll twice/i);
  });
});

describe('Payroll single disburse — honest single-payout reporting', () => {
  it('surfaces the SERVER refusal message instead of a blanket failure', async () => {
    apiState.disburseImpl = async () => {
      throw Object.assign(
        new Error('Payroll payment preference MOMO has no authoritative settlement path; it was not settled.'),
        { statusCode: 400 },
      );
    };
    await waitFor(() => screen.getAllByText('Disburse').length > 0);
    await act(async () => { fireEvent.click(screen.getAllByText('Disburse')[0]); });

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    expect(stopTexts()[0]).toContain('no authoritative settlement path');
    expect(stopTexts()).not.toContain('Disbursement failed');
  });

  it('an unknown outcome is never called a failure for a single disbursement either', async () => {
    apiState.disburseImpl = async () => { throw new TypeError('fetch aborted'); };
    await waitFor(() => screen.getAllByText('Disburse').length > 0);
    await act(async () => { fireEvent.click(screen.getAllByText('Disburse')[0]); });

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    expect(stopTexts()[0]).toMatch(/may have been disbursed/i);
  });
});

describe('dead payout helper removal', () => {
  it('financeApi no longer exposes the never-called payOut money endpoint', () => {
    expect(financeApi.payOut).toBeUndefined();
  });
});
