import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { createElement } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EWA unresolved-outcome idempotency lifecycle (PR #115 reviewer finding
// issuecomment-6086381101).
//
// An UNKNOWN withdrawal outcome (no HTTP answer) may already have committed.
// Its idempotency key is the ONLY thing that makes a later retry safe: the
// backend replays the committed withdrawal for the same key and never pays
// twice. Therefore the identity must survive
//   - modal close / reopen,
//   - component unmount (and, via localStorage, a full page reload),
//   - switching to another employee (per-employee scoping),
// and it must be impossible to silently bypass it by changing the amount.
// It is retired ONLY by an authoritative resolution: server 2xx
// commit/replay, a definitive refusal (proves nothing committed), or an
// explicit operator discard. A post-success eligibility/history refresh
// failure must never misreport a confirmed payout.
// ─────────────────────────────────────────────────────────────────────────────

const apiState = {
  withdrawImpl: null, withdrawCalls: [], historyFailAfter: Infinity, historyCalls: 0,
};

const serverSuccess = { success: true, result: {
  replayed: false, grossAmount: 25.5, fee: 0.255, netToEmployee: 25.245,
  remainingWithdrawable: 74.5,
}};

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
      data: { eligible: true, maxWithdrawal: 100 }, eligible: true, maxWithdrawal: 100, employeeId: id,
    })),
    history: vi.fn(async () => {
      apiState.historyCalls += 1;
      if (apiState.historyCalls > apiState.historyFailAfter) {
        throw Object.assign(new Error('history refresh failed'), { statusCode: 500 });
      }
      return { data: { withdrawals: [] }, withdrawals: [] };
    }),
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

vi.mock('@/lib/toast', () => ({
  toast: { go: vi.fn(), stop: vi.fn(), neutral: vi.fn() },
}));

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
import {
  saveUnresolvedWithdrawIntent,
  loadUnresolvedWithdrawIntent,
} from '@/lib/ewaWithdraw';

async function openWithdrawForm() {
  fireEvent.click(screen.getByText('EWA Management'));
  await waitFor(() => screen.getByText('Manage EWA'));
  await act(async () => { fireEvent.click(screen.getByText('Manage EWA')); });
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

async function closeAndReopen() {
  await act(async () => { fireEvent.click(screen.getByText('dialog-close')); });
  await act(async () => { fireEvent.click(screen.getByText('Manage EWA')); });
  await waitFor(() => screen.getByTestId('withdraw-amount-input'));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiState.withdrawCalls = [];
  apiState.withdrawImpl = null;
  apiState.historyCalls = 0;
  apiState.historyFailAfter = Infinity;
});

describe('unknown withdrawal outcome — identity survives close/reopen', () => {
  it('close → reopen the same employee → retry sends the IDENTICAL idempotency key', async () => {
    apiState.withdrawImpl = async () => { throw new TypeError('fetch aborted'); };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(1));
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await closeAndReopen();

    // The recovery is EXPLICIT: banner + prefilled amount
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
    expect(screen.getByTestId('withdraw-amount-input').value).toBe('25.50');

    // Retry (via the banner's explicit retry action) — same identity
    await act(async () => { fireEvent.click(screen.getByText('Retry same request')); });
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).toBe(firstKey);
    expect(apiState.withdrawCalls[1].amount).toBe('25.50');
  });

  it('the unresolved identity is NOT erased by closing without any action', async () => {
    apiState.withdrawImpl = async () => { throw new TypeError('fetch aborted'); };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await closeAndReopen();
    // close AGAIN without retrying or discarding — still recoverable
    await closeAndReopen();
    expect(loadUnresolvedWithdrawIntent('emp-1').key).toBe(firstKey);
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
  });
});

describe('unknown withdrawal outcome — identity survives a reload boundary', () => {
  it('recovers the identity persisted by a previous session (fresh component, seeded store)', async () => {
    // Simulate a page reload: nothing in memory, only the durable record.
    saveUnresolvedWithdrawIntent({
      employeeId: 'emp-1', key: 'key-from-previous-session',
      amount: '25.50', fingerprint: 'emp:emp-1::amt:25.50',
    });
    render(createElement(Payroll));
    await openWithdrawForm();
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
    expect(screen.getByTestId('withdraw-amount-input').value).toBe('25.50');

    apiState.withdrawImpl = async () => serverSuccess;
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(1));
    expect(apiState.withdrawCalls[0].idempotencyKey).toBe('key-from-previous-session');
  });

  it('survives a full component unmount + remount with the identical key', async () => {
    apiState.withdrawImpl = async () => { throw new TypeError('fetch aborted'); };
    const first = render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;
    first.unmount();

    // Remount = fresh component tree; the durable store is the only survivor.
    render(createElement(Payroll));
    await openWithdrawForm();
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
    expect(screen.getByTestId('withdraw-amount-input').value).toBe('25.50');

    apiState.withdrawImpl = async () => serverSuccess;
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).toBe(firstKey);
  });
});

describe('unresolved intent cannot be silently bypassed', () => {
  it('a DIFFERENT amount is refused — no request sent, no second key minted, identity intact', async () => {
    apiState.withdrawImpl = async () => { throw new TypeError('fetch aborted'); };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await closeAndReopen();
    await submitAmount('40'); // a changed amount must not bypass the unknown request

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    expect(toast.stop.mock.calls.at(-1)[0]).toMatch(/still unresolved/);
    // No new request was sent and no fresh key was minted
    expect(apiState.withdrawCalls).toHaveLength(1);
    expect(loadUnresolvedWithdrawIntent('emp-1').key).toBe(firstKey);
  });

  it('an explicit discard retires the identity — and the warning states the double-pay risk', async () => {
    apiState.withdrawImpl = async () => { throw new TypeError('fetch aborted'); };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await closeAndReopen();
    await act(async () => { fireEvent.click(screen.getByText('Discard unresolved request')); });

    expect(loadUnresolvedWithdrawIntent('emp-1')).toBeNull();
    expect(screen.queryByTestId('unresolved-withdrawal-banner')).toBeNull();
    const discardToast = toast.neutral.mock.calls.map(c => String(c[0])).join(' ');
    expect(discardToast).toMatch(/discarded/);
    expect((toast.neutral.mock.calls[0][1] || {}).description).toMatch(/pay twice/);

    // After the explicit resolution-by-choice, a new withdrawal mints a fresh identity
    apiState.withdrawImpl = async () => serverSuccess;
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).not.toBe(firstKey);
  });
});

describe('fresh key only after authoritative resolution', () => {
  it('unknown → preserved retry → server replay/success resolves it; only THEN a fresh key', async () => {
    let attempt = 0;
    apiState.withdrawImpl = async () => {
      attempt += 1;
      if (attempt === 1) throw new TypeError('fetch aborted');
      return serverSuccess;
    };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await closeAndReopen();
    await act(async () => { fireEvent.click(screen.getByText('Retry same request')); });
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).toBe(firstKey);

    // Authoritative resolution: durable record gone, no banner
    expect(loadUnresolvedWithdrawIntent('emp-1')).toBeNull();
    await waitFor(() => expect(screen.queryByTestId('unresolved-withdrawal-banner')).toBeNull());

    // A genuinely new withdrawal of the same amount now mints a FRESH key
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(3));
    expect(apiState.withdrawCalls[2].idempotencyKey).not.toBe(firstKey);
  });
});

describe('post-success refresh failures never misreport the confirmed withdrawal', () => {
  it('withdrawal succeeds, history refresh fails → neutral honest message, no unknown/refusal claim', async () => {
    // history call 1 = modal open (ok); call 2 = post-success refresh (fails)
    apiState.historyFailAfter = 1;
    apiState.withdrawImpl = async () => serverSuccess;
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');

    await waitFor(() => expect(toast.neutral).toHaveBeenCalled());
    const neutralTitle = toast.neutral.mock.calls[0][0];
    expect(neutralTitle).toMatch(/confirmed by the server/i);
    // The payout was NEVER re-reported as unknown or refused
    const allStop = toast.stop.mock.calls.map(c => String(c[0])).join(' ');
    expect(allStop).not.toMatch(/may have gone through/i);
    expect(allStop).not.toMatch(/refused/i);
    // The intent is fully settled despite the refresh failure
    expect(loadUnresolvedWithdrawIntent('emp-1')).toBeNull();
  });
});
