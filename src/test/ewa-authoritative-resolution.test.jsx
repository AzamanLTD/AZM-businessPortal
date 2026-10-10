import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { createElement } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EWA authoritative-resolution contract (PR #115 reviewer finding
// issuecomment-6094416967).
//
// The durable idempotency identity may be retired ONLY by:
//   • a VALIDATED authoritative success/replay envelope (2xx whose body
//     carries success flags + finite, economically consistent gross/fee/net),
//   • a DOCUMENTED pre-commit refusal: HTTP 400 whose message matches the
//     backend ewaService.js refusal catalog (every entry throws inside the
//     rolled-back Serializable $transaction — proof nothing committed).
// EVERYTHING ELSE keeps the identity (UNRESOLVED): 408/409, the idempotency
// conflict (reconciliation state), any non-allowlisted status or message,
// missing responses, and malformed 2xx envelopes. An unresolved intent
// cannot be bypassed by changing the amount; a retry reuses the original key.
// ─────────────────────────────────────────────────────────────────────────────

const apiState = {
  withdrawImpl: null, withdrawCalls: [],
};

const serverSuccess = { success: true, result: {
  success: true, replayed: false, grossAmount: 25.5, fee: 0.255, netToEmployee: 25.245,
  remainingWithdrawable: 74.5,
}};
const serverReplay = { success: true, result: {
  success: true, replayed: true, idempotencyKey: 'same', grossAmount: 25.5, fee: 0.255, netToEmployee: 25.245,
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
    Input: ({ label, value, onChange, placeholder, type, inputMode, pattern, step }) =>
      React.createElement('div', null,
        label ? React.createElement('label', null, label) : null,
        React.createElement('input', {
          value, placeholder, type: type || 'text', inputMode, pattern, step,
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
import { loadUnresolvedWithdrawIntent } from '@/lib/ewaWithdraw';

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

afterEach(() => {
  // Pending async flows from a previous test must never leak toasts or
  // requests into the next one.
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiState.withdrawCalls.length = 0;
  apiState.withdrawImpl = async () => serverSuccess;
});

// ── UNRESOLVED outcomes: identity kept, bypass blocked, retry reuses key ────

describe('non-allowlisted responses are UNRESOLVED — identity preserved', () => {
  it.each([
    ['HTTP 408 (gateway/client timeout)', 408, 'Request Timeout'],
    ['HTTP 409 (conflict — reconciliation)', 409, 'Conflict'],
    ['HTTP 401 (non-allowlisted status)', 401, 'Unauthorized'],
    ['HTTP 403 (non-allowlisted status)', 403, 'Forbidden'],
    ['HTTP 404 (non-allowlisted status)', 404, 'Not Found'],
    ['HTTP 502 (gateway)', 502, 'Bad Gateway'],
    ['HTTP 400 with an UNDOCUMENTED message', 400, 'Upstream serialization retries exhausted'],
  ])('%s keeps the durable identity', async (_label, status, message) => {
    apiState.withdrawImpl = async () => {
      throw Object.assign(new Error(message), { statusCode: status });
    };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    // Not reported as a definitive refusal — may have committed.
    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    expect(toast.stop.mock.calls.at(-1)[0]).toMatch(/may have gone through/i);
    expect(loadUnresolvedWithdrawIntent('emp-1').key).toBe(firstKey);

    // Bypass blocked: a changed amount is refused while unresolved.
    await submitAmount('40');
    await waitFor(() => expect(toast.stop.mock.calls.at(-1)[0]).toMatch(/still unresolved/));
    expect(apiState.withdrawCalls).toHaveLength(1);

    // Reopen → retry reuses the ORIGINAL key.
    await closeAndReopen();
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByText('Retry same request')); });
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).toBe(firstKey);
    expect(loadUnresolvedWithdrawIntent('emp-1').key).toBe(firstKey);
  });

  it('EWA_IDEMPOTENCY_CONFLICT keeps the identity pending reconciliation', async () => {
    apiState.withdrawImpl = async () => {
      throw Object.assign(
        new Error('Idempotency key was already used with different parameters (differing: amount); the withdrawal was not executed.'),
        { statusCode: 400 },
      );
    };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    // The conflict itself is surfaced, but it is NOT treated as a clean
    // pre-commit refusal — the contradictory state needs reconciliation.
    expect(toast.stop.mock.calls.at(-1)[0]).toMatch(/may have gone through/i);
    expect(loadUnresolvedWithdrawIntent('emp-1').key).toBe(firstKey);

    await closeAndReopen();
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
  });
});

describe('malformed 2xx envelopes are UNRESOLVED — a 2xx alone is not proof', () => {
  it.each([
    ['missing result envelope', { success: true }],
    ['result missing success flag', { success: true, result: { grossAmount: 25.5, fee: 0.255, netToEmployee: 25.245 } }],
    ['non-numeric amounts', { success: true, result: { success: true, grossAmount: '25.5', fee: 0.255, netToEmployee: 25.245 } }],
    ['economically inconsistent amounts', { success: true, result: { success: true, grossAmount: 25.5, fee: 0.255, netToEmployee: 20 } }],
    ['zero gross', { success: true, result: { success: true, grossAmount: 0, fee: 0, netToEmployee: 0 } }],
  ])('%s retains the identity and a retry reuses the original key', async (_label, malformed) => {
    apiState.withdrawImpl = async () => malformed;
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    expect(toast.stop.mock.calls.at(-1)[0]).toMatch(/could not be confirmed.*malformed/i);
    expect(loadUnresolvedWithdrawIntent('emp-1').key).toBe(firstKey);

    // No success is claimed from the unvalidated envelope.
    expect(toast.go).not.toHaveBeenCalled();

    // Reopen → retry reuses the ORIGINAL key (the backend arbitrates).
    await closeAndReopen();
    expect(screen.getByTestId('unresolved-withdrawal-banner')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByText('Retry same request')); });
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).toBe(firstKey);
  });
});

// ── AUTHORITATIVE resolutions: only these retire the durable identity ──────

describe('only validated authoritative outcomes retire the durable identity', () => {
  it('a VALIDATED success envelope settles the intent and a new withdrawal mints a fresh key', async () => {
    apiState.withdrawImpl = async () => serverSuccess;
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');
    const firstKey = apiState.withdrawCalls[0].idempotencyKey;

    await waitFor(() => expect(toast.go).toHaveBeenCalled());
    expect(loadUnresolvedWithdrawIntent('emp-1')).toBeNull();

    // A genuinely new withdrawal after a validated commit mints a new identity.
    await submitAmount('25.50');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).not.toBe(firstKey);
  });

  it('a VALIDATED replay envelope settles the intent (no new funds moved)', async () => {
    apiState.withdrawImpl = async () => serverReplay;
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount('25.50');

    await waitFor(() => expect(toast.go).toHaveBeenCalled());
    expect(toast.go.mock.calls[0][0]).toMatch(/replayed|no new funds moved/i);
    expect(loadUnresolvedWithdrawIntent('emp-1')).toBeNull();
  });

  it.each([
    ['amount below the documented minimum', 'Minimum withdrawal is 1 AZM.', '0.5'],
    ['employee lookup refusal', 'Employee not found.', '25.50'],
    ['eligibility refusal', 'EWA is not available for this employee.', '25.50'],
    ['treasury refusal', 'Business treasury has insufficient spendable balance for this EWA withdrawal; it was not executed.', '25.50'],
  ])('a DOCUMENTED pre-commit refusal (%s) retires the identity and surfaces the server message', async (_label, message, amount) => {
    apiState.withdrawImpl = async () => {
      throw Object.assign(new Error(message), { statusCode: 400 });
    };
    render(createElement(Payroll));
    await openWithdrawForm();
    await submitAmount(amount);

    await waitFor(() => expect(toast.stop).toHaveBeenCalled());
    // The server's own refusal message is surfaced verbatim.
    expect(toast.stop.mock.calls.some(c => String(c[0]) === message)).toBe(true);
    // Proven pre-commit: the durable record is retired.
    expect(loadUnresolvedWithdrawIntent('emp-1')).toBeNull();
    // The bypass guard is gone with the record: a changed amount is allowed
    // again, and a materially different intent mints a fresh key. (An
    // identical retry may reuse the in-session key — safe either way, the
    // backend arbitrates; the durable record is already retired.)
    await submitAmount('30');
    await waitFor(() => expect(apiState.withdrawCalls).toHaveLength(2));
    expect(apiState.withdrawCalls[1].idempotencyKey).not.toBe(apiState.withdrawCalls[0].idempotencyKey);
  });
});
