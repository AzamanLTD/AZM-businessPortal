import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { createElement } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EWA withdrawal integrity (Financial-Action Integrity milestone).
//
// Backend contract (AZM-backend main, read-only):
//  POST /api/business-os/ewa/withdraw accepts `idempotencyKey` and dedupes on
//  it — a retry of a committed request replays the committed outcome (no new
//  funds moved); the same key reused with different parameters fails closed
//  with EWA_IDEMPOTENCY_CONFLICT. WITHOUT a key the request has no identity
//  and a retry mints a second payout. The 200 body is
//  { success, result: { replayed, grossAmount, fee, netToEmployee } }.
//  The route requires `ewa.manage` (permission authority, server-side).
// ─────────────────────────────────────────────────────────────────────────────

const apiState = {
  withdrawImpl: null,
  eligibilityMax: 100,
  withdrawCalls: [],
};

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

vi.mock('@/lib/marketplaceApi', () => ({
  payrollApi: {
    summary: vi.fn(async () => ({ data: {} })),
    list: vi.fn(async () => ({ data: { records: [] } })),
  },
  ewaApi: {
    summary: vi.fn(async () => ({ data: {} })),
    eligibility: vi.fn(async (id) => ({
      data: { eligible: true, maxWithdrawal: apiState.eligibilityMax },
      eligible: true,
      maxWithdrawal: apiState.eligibilityMax,
      employeeId: id,
    })),
    history: vi.fn(async () => ({ data: { withdrawals: [] }, withdrawals: [] })),
    withdraw: vi.fn((payload) => {
      apiState.withdrawCalls.push(payload);
      return apiState.withdrawImpl(payload, apiState.withdrawCalls.length);
    }),
  },
  employeeApi: {
    list: vi.fn(async () => ({ data: { employees: [
      { id: 'emp-1', title: 'Cook', user: { fullName: 'Ama Mensah' } },
    ] } })),
  },
}));

vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn() } }));

// Honest passthrough instrument mocks: the contract under test is the
// withdrawal handler's wire behavior, not the component library.
vi.mock('@/components/instrument', async () => {
  const React = await import('react');
  const passthrough = (tag, extra) => ({ children, ...props }) =>
    React.createElement(tag, { ...extra, ...props }, children);
  return {
    Card: passthrough('div'),
    Button: ({ children, onClick, disabled, loading, type }) =>
      React.createElement('button', {
        onClick, disabled: !!disabled || !!loading, type: type || 'button',
        'data-loading': loading ? '1' : undefined,
      }, children),
    Tag: passthrough('span'),
    Input: ({ label, value, onChange, placeholder, type }) =>
      React.createElement('div', null,
        label ? React.createElement('label', null, label) : null,
        React.createElement('input', {
          value, placeholder, type: type || 'text',
          onChange: (e) => onChange && onChange(e),
          'data-testid': 'withdraw-amount-input',
        })),
    Select: passthrough('select'),
    Dialog: ({ open, onClose, title, children }) =>
      open ? React.createElement('div', { 'data-testid': 'dialog' },
        React.createElement('h3', null, title),
        React.createElement('button', { onClick: onClose }, 'dialog-close'),
        children) : null,
    Empty: passthrough('div'),
    Skel: passthrough('div'),
    Avatar: passthrough('div'),
    StatCard: passthrough('div'),
    Tooltip: passthrough('div'),
    Progress: passthrough('div'),
  };
});

import { toast } from '@/lib/toast';
import Payroll from '@/pages/employees/Payroll';

const serverSuccess = { success: true, result: {
  replayed: false, grossAmount: 25.5, fee: 0.255, netToEmployee: 25.245,
  remainingWithdrawable: 74.5,
}};

async function openWithdrawForm() {
  // Switch to the EWA tab
  fireEvent.click(screen.getByText('EWA Management'));
  // Open the single employee's EWA panel
  await waitFor(() => screen.getByText('Manage EWA'));
  await act(async () => { fireEvent.click(screen.getByText('Manage EWA')); });
  // The withdrawal form renders only for an eligible employee with capacity
  await waitFor(() => screen.getByTestId('withdraw-amount-input'));
}

async function submitAmount(value) {
  await act(async () => {
    fireEvent.change(screen.getByTestId('withdraw-amount-input'), { target: { value } });
  });
  await act(async () => {
    fireEvent.click(screen.getByText('Disburse Early Wage Advance'));
  });
}

function lastPayload() { return apiState.withdrawCalls[apiState.withdrawCalls.length - 1]; }

beforeEach(() => {
  vi.clearAllMocks();
  apiState.withdrawCalls = [];
  apiState.withdrawImpl = null;
  apiState.eligibilityMax = 100;
  render(createElement(Payroll));
});

describe('Payroll EWA withdrawal — idempotency identity on the wire', () => {
  it('sends an idempotencyKey and the amount as the EXACT decimal string — never a float', async () => {
    apiState.withdrawImpl = async () => serverSuccess;
    await openWithdrawForm();
    await submitAmount('25.5050');

    const payload = lastPayload();
    expect(apiState.withdrawCalls).toHaveLength(1);
    expect(payload.employeeId).toBe('emp-1');
    // Exact decimal on the wire: byte-exact string, no float normalization
    expect(payload.amount).toBe('25.5050');
    expect(typeof payload.idempotencyKey).toBe('string');
    expect(payload.idempotencyKey.length).toBeGreaterThan(0);
  });

  it('a retry after a definitive server failure REUSES the same key — a retry never mints a second withdrawal', async () => {
    apiState.withdrawImpl = async () => {
      const err = new Error('Amount exceeds the remaining withdrawable cap.');
      err.statusCode = 400;
      throw err;
    };
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(1));
    // Retry of the SAME intent (same employee, same exact amount)
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));

    expect(lastPayload().idempotencyKey).toBe(apiState.withdrawCalls[0].idempotencyKey);
    expect(lastPayload().amount).toBe('25.50');
  });

  it('an economic change (different amount) mints a NEW key — the old identity is never reused for different parameters', async () => {
    apiState.withdrawImpl = async () => {
      throw Object.assign(new Error('Server refused'), { statusCode: 400 });
    };
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(1));
    await submitAmount('40');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));

    expect(lastPayload().idempotencyKey).not.toBe(apiState.withdrawCalls[0].idempotencyKey);
  });

  it('success SETTLES the intent — a genuinely new withdrawal mints a fresh key', async () => {
    apiState.withdrawImpl = async () => serverSuccess;
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(1));
    // After a committed withdrawal, a new submit of the same amount is a
    // genuinely new economic action and must NOT replay the first.
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(lastPayload().idempotencyKey).not.toBe(apiState.withdrawCalls[0].idempotencyKey);
  });
});

describe('Payroll EWA withdrawal — honest reporting from the server response', () => {
  it('reports the SERVER-computed truth (gross, fee, net), not the typed amount', async () => {
    apiState.withdrawImpl = async () => serverSuccess;
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(toast.go).toHaveBeenCalled());
    const text = toast.go.mock.calls[0][0];
    expect(text).toContain('25.5');        // server gross
    expect(text).toContain('0.255');      // server fee
    expect(text).toContain('25.245');     // server net
    expect(text).not.toContain('Successfully processed withdrawal of $25.5');
  });

  it('a replayed result is labeled as a replay — no new funds moved', async () => {
    apiState.withdrawImpl = async () => ({ ...serverSuccess, result: { ...serverSuccess.result, replayed: true } });
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(toast.go).toHaveBeenCalled());
    expect(toast.go.mock.calls[0][0]).toMatch(/replayed|no new funds moved/i);
  });

  it('a definitive server refusal surfaces the SERVER message, not a blanket failure', async () => {
    apiState.withdrawImpl = async () => {
      throw Object.assign(new Error('Minimum withdrawal is 1 AZM.'), { statusCode: 400 });
    };
    await openWithdrawForm();
    await submitAmount('0.5');
    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    expect(toast.stop.mock.calls.some(c => String(c[0]).includes('Minimum withdrawal'))).toBe(true);
    expect(toast.stop.mock.calls.some(c => String(c[0]) === 'Failed to complete EWA withdrawal')).toBe(false);
  });

  it('an UNKNOWN outcome (no HTTP answer) is never called a failure — and states that a retry cannot double-pay', async () => {
    apiState.withdrawImpl = async () => { throw new TypeError('fetch aborted'); }; // no statusCode
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    const text = toast.stop.mock.calls[0][0];
    expect(text).toMatch(/may have gone through/i);
    expect(text).not.toMatch(/^Withdrawal (failed|refused)/i);
  });

  it('refuses float-mangled or non-plain-decimal input honestly instead of normalizing it', async () => {
    apiState.withdrawImpl = async () => serverSuccess;
    await openWithdrawForm();
    await submitAmount('25.505'); // 3dp is fine
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(1));
    await submitAmount('12.3456789'); // 7dp is fine
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    await submitAmount('12.345678901'); // 9dp exceeds the backend's 8dp contract
    expect(apiState.withdrawCalls).toHaveLength(2);
    await submitAmount('1e2');
    expect(apiState.withdrawCalls).toHaveLength(2);
    await submitAmount('abc');
    expect(apiState.withdrawCalls).toHaveLength(2);
  });
});
