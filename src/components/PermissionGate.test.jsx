// src/components/PermissionGate.test.jsx
// =============================================================================
// Permissions & Role Integrity — the honest-refusal gate and usePermission
// status contract.
//
// The gate's honesty rules (this is UX mirroring, never enforcement):
//   • resolved + denied + backend key        → clear refusal screen
//   • resolved + denied + owner-only surface → clear refusal screen
//   • UNRESOLVED / UNAVAILABLE permissions   → render the page (a failed
//     fetch must never masquerade as a server refusal)
//   • unknown status never locks an operator out
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const requestMock = vi.fn();

vi.mock('@/lib/api', () => ({
  request: (...args) => requestMock(...args),
}));

import { AuthContext } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { PermissionGate, AccessRefused } from '@/components/PermissionGate';
import { invalidatePermissionCache } from '@/lib/permissionCache';

const bizProfile = { id: 'biz-1', userId: 'user-owner' };
const employeeProfile = { id: 'biz-1', userId: 'user-owner' }; // owned by someone else

function renderWithAuth(user, { children, profile } = {}) {
  const value = {
    user,
    bizProfile: profile || bizProfile,
    isAdmin: false,
  };
  return render(<AuthContext.Provider value={value}>{children}</AuthContext.Provider>);
}

// ── usePermission status contract ────────────────────────────────────────────

describe('usePermission — honest status contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
    localStorage.clear();
    invalidatePermissionCache(); // module cache must not leak across cases
  });

  it('resolves ["*"] for the business owner without an employee fetch', async () => {
    const Probe = () => {
      const { hasPermission, status, isOwner } = usePermission();
      return (
        <div>
          <div data-testid="status">{status}</div>
          <div data-testid="isOwner">{String(isOwner)}</div>
          <div data-testid="canFinance">{String(hasPermission('finance.view'))}</div>
        </div>
      );
    };
    renderWithAuth({ id: 'user-owner' }, { children: <Probe /> });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('resolved'));
    expect(screen.getByTestId('isOwner').textContent).toBe('true');
    expect(screen.getByTestId('canFinance').textContent).toBe('true');
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('resolves the backend effectivePermissions set for employees', async () => {
    requestMock.mockResolvedValue({
      employee: { role: 'MANAGER', effectivePermissions: ['orders.manage', 'restaurant.dinein.manage'] },
    });
    const Probe = () => {
      const { hasPermission, status } = usePermission();
      return (
        <div>
          <div data-testid="status">{status}</div>
          <div data-testid="canRing">{String(hasPermission('orders.manage'))}</div>
          <div data-testid="canDineIn">{String(hasPermission('dinein.manage'))}</div>
          <div data-testid="canFinance">{String(hasPermission('finance.view'))}</div>
        </div>
      );
    };
    renderWithAuth({ id: 'user-emp' }, { children: <Probe /> });
    await waitFor(() => expect(screen.getByTestId('canRing').textContent).toBe('true'));
    expect(screen.getByTestId('status').textContent).toBe('resolved');
    // Legacy alias resolves to the canonical backend key.
    expect(screen.getByTestId('canDineIn').textContent).toBe('true');
    expect(screen.getByTestId('canFinance').textContent).toBe('false');
  });

  it('resolves an empty set — not "unavailable" — when the server says no employee', async () => {
    requestMock.mockResolvedValue({ employee: null });
    const Probe = () => {
      const { hasPermission, status, permissions } = usePermission();
      return (
        <div>
          <div data-testid="status">{status}</div>
          <div data-testid="perms">{permissions.length}</div>
          <div data-testid="canAny">{String(hasPermission('orders.manage'))}</div>
        </div>
      );
    };
    renderWithAuth({ id: 'user-emp' }, { children: <Probe /> });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('resolved'));
    expect(screen.getByTestId('perms').textContent).toBe('0');
    expect(screen.getByTestId('canAny').textContent).toBe('false');
  });

  it('resolves employee permissions WITHOUT a business profile (employee path)', async () => {
    // Employees never own a BusinessProfile: GET /api/business/me 404s for
    // them, so bizProfile is null. The hook must still resolve their set via
    // /api/business-os/employees/me, which needs no business profile.
    requestMock.mockResolvedValue({
      employee: { role: 'KDS', effectivePermissions: ['restaurant.kitchen.view'] },
    });
    const Probe = () => {
      const { hasPermission, status } = usePermission();
      return (
        <div>
          <div data-testid="status">{status}</div>
          <div data-testid="canKds">{String(hasPermission('restaurant.kitchen.view'))}</div>
          <div data-testid="canFinance">{String(hasPermission('finance.view'))}</div>
        </div>
      );
    };
    renderWithAuth({ id: 'user-emp' }, { children: <Probe />, profile: null });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('resolved'));
    expect(screen.getByTestId('canKds').textContent).toBe('true');
    expect(screen.getByTestId('canFinance').textContent).toBe('false');
  });

  it('reports UNAVAILABLE (not an empty refusal) when the fetch fails', async () => {
    requestMock.mockRejectedValue(new Error('network down'));
    const Probe = () => {
      const { status } = usePermission();
      return <div data-testid="status">{status}</div>;
    };
    renderWithAuth({ id: 'user-emp' }, { children: <Probe /> });
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unavailable'));
  });
});

// ── PermissionGate honest refusal ────────────────────────────────────────────

describe('PermissionGate — route-level honest refusal', () => {
  beforeEach(() => {
    requestMock.mockReset();
    localStorage.clear();
    invalidatePermissionCache(); // module cache must not leak across cases
  });

  it('renders the page for the owner of an owner-only surface', async () => {
    renderWithAuth({ id: 'user-owner' }, {
      children: (
        <PermissionGate ownerOnly area="Orders">
          <div data-testid="page">ORDERS PAGE</div>
        </PermissionGate>
      ),
    });
    expect(await screen.findByTestId('page')).toBeTruthy();
  });

  it('refuses an owner-only surface for a non-owner employee', async () => {
    requestMock.mockResolvedValue({
      employee: { role: 'STAFF', effectivePermissions: [] },
    });
    renderWithAuth({ id: 'user-emp' }, {
      children: (
        <PermissionGate ownerOnly area="Orders">
          <div data-testid="page">ORDERS PAGE</div>
        </PermissionGate>
      ),
    });
    expect(await screen.findByText(/No access to Orders/i)).toBeTruthy();
    expect(screen.queryByTestId('page')).toBeNull();
    expect(screen.getByText(/business ownership/i)).toBeTruthy();
  });

  it('refuses a gated surface the employee\'s resolved set does not contain', async () => {
    requestMock.mockResolvedValue({
      employee: { role: 'STAFF', effectivePermissions: ['orders.manage'] },
    });
    renderWithAuth({ id: 'user-emp' }, {
      children: (
        <PermissionGate permission="finance.view" area="Finance">
          <div data-testid="page">FINANCE PAGE</div>
        </PermissionGate>
      ),
    });
    expect(await screen.findByText(/No access to Finance/i)).toBeTruthy();
    expect(screen.getByText('finance.view')).toBeTruthy();
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('renders the page when the required key IS in the resolved set', async () => {
    requestMock.mockResolvedValue({
      employee: { role: 'MANAGER', effectivePermissions: ['finance.view'] },
    });
    renderWithAuth({ id: 'user-emp' }, {
      children: (
        <PermissionGate permission="finance.view" area="Finance">
          <div data-testid="page">FINANCE PAGE</div>
        </PermissionGate>
      ),
    });
    expect(await screen.findByTestId('page')).toBeTruthy();
  });

  it('renders the page when permissions are UNAVAILABLE — a failed fetch is never a refusal', async () => {
    requestMock.mockRejectedValue(new Error('network down'));
    renderWithAuth({ id: 'user-emp' }, {
      children: (
        <PermissionGate permission="finance.view" area="Finance">
          <div data-testid="page">FINANCE PAGE</div>
        </PermissionGate>
      ),
    });
    // Give the fetch a chance to settle.
    await waitFor(() => expect(requestMock).toHaveBeenCalled());
    expect(screen.getByTestId('page')).toBeTruthy();
    expect(screen.queryByText(/No access/i)).toBeNull();
  });
});
