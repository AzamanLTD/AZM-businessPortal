// src/test/teamaccess-permission-editing.test.jsx
// =============================================================================
// TeamAccess permission-editing contract (Agent B Findings 3 & 4).
//
// Finding 3 — employees.permissions now has a real editing flow against the
// existing backend contract (POST /api/business-os/employees/:id/permissions):
//   • the edit control appears only for actors holding employees.permissions
//   • saves submit the full permissions array and await the server verdict
//   • no optimistic success: the editor closes only after confirmation
//   • a server refusal keeps the editor open, retains the draft, shows the
//     server's message, and never fires a success toast
//   • duplicate submits are impossible while a save is in flight
//
// Finding 4 — the team/permission-template queries no longer depend on a
// BusinessProfile; the backend resolves the actor's business (ownership, then
// active employment), so an employee without a profile still loads the team
// surface (the server still refuses anything employees.view does not cover).
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const { requestMock, toastGo, toastStop } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  toastGo: vi.fn(),
  toastStop: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  request: (...a) => requestMock(...a),
  businessOSEmployees: {
    me: () => requestMock('/api/business-os/employees/me'),
    list: () => requestMock('/api/business-os/employees'),
    create: (d) => requestMock('/api/business-os/employees', { method: 'POST', body: d }),
    update: (id, d) => requestMock(`/api/business-os/employees/${id}`, { method: 'PATCH', body: d }),
    remove: (id) => requestMock(`/api/business-os/employees/${id}`, { method: 'DELETE' }),
    setPermissions: (id, permissions) =>
      requestMock(`/api/business-os/employees/${id}/permissions`, { method: 'POST', body: { permissions } }),
  },
  businessOS: {
    getPermissionTemplates: () => requestMock('/api/business-os/permission-templates'),
  },
}));
vi.mock('@/lib/toast', () => ({ toast: { go: toastGo, stop: toastStop } }));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/lib/AuthContext';
import { invalidatePermissionCache } from '@/lib/permissionCache';
import TeamAccess from '@/pages/settings/TeamAccess';

const queryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const TEMPLATES = {
  templates: { EMPLOYEE: { label: 'Employee', permissions: [] }, MANAGER: { label: 'Manager', permissions: ['orders.manage'] } },
  employeeTemplates: { EMPLOYEE: [], KITCHEN: ['restaurant.kitchen.view'] },
  permissionKeys: {
    orders: [
      { key: 'orders.view', label: 'View orders', module: 'Orders' },
      { key: 'orders.manage', label: 'Manage orders', module: 'Orders' },
      { key: 'orders.refund', label: 'Issue refunds', module: 'Orders' },
    ],
    employees: [
      { key: 'employees.view', label: 'View employees', module: 'Workforce' },
    ],
  },
  allKeys: ['orders.view', 'orders.manage', 'orders.refund', 'employees.view'],
};

const EMPLOYEES = {
  employees: [
    { id: 'emp-1', fullName: 'Ama Mensah', email: 'ama@biz.gh', role: 'EMPLOYEE', permissions: ['orders.view'] },
    { id: 'emp-2', fullName: 'Kofi Boateng', email: 'kofi@biz.gh', role: 'MANAGER', permissions: ['orders.manage', 'orders.view'] },
  ],
};

const page = (perms) => async (url) => {
    if (String(url).includes('/employees/me')) return { employee: { role: 'MANAGER', effectivePermissions: perms } };
    if (String(url).includes('/permission-templates')) return TEMPLATES;
    if (String(url).includes('/employees/emp-1/permissions')) return { success: true, employee: {} };
    return EMPLOYEES;
};

async function renderTeamAccess({ perms = ['employees.view', 'employees.permissions'], bizProfile = null, impl = null, waitName = 'Ama Mensah' } = {}) {
  requestMock.mockImplementation(impl || page(perms));
  const out = render(
    <QueryClientProvider client={queryClient()}>
      <AuthContext.Provider value={{ user: { id: 'user-1' }, bizProfile, isAdmin: false }}>
        <TeamAccess />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText(waitName)).toBeTruthy());
  return out;
}

beforeEach(() => {
  requestMock.mockReset().mockImplementation(page([]));
  toastGo.mockReset();
  toastStop.mockReset();
  invalidatePermissionCache();
});

describe('TeamAccess — permission editing flow (Finding 3)', () => {
  it('shows the edit control for an actor holding employees.permissions', async () => {
    await renderTeamAccess({ perms: ['employees.view', 'employees.permissions'] });
    expect(screen.getByLabelText(/Edit permissions for Ama Mensah/i)).toBeTruthy();
  });

  it('hides the edit control without employees.permissions', async () => {
    await renderTeamAccess({ perms: ['employees.view', 'employees.update'] });
    expect(screen.queryByLabelText(/Edit permissions for/i)).toBeNull();
  });

  it('submits the full permissions array to the existing backend contract on save', async () => {
    await renderTeamAccess({ perms: ['employees.view', 'employees.permissions'] });
    fireEvent.click(screen.getByLabelText(/Edit permissions for Ama Mensah/i));
    // Toggle "Manage orders" on (draft starts from the employee's current set).
    fireEvent.click(screen.getByLabelText(/Manage orders/i));
    fireEvent.click(screen.getByText('Save permissions'));
    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/business-os/employees/emp-1/permissions',
        { method: 'POST', body: { permissions: ['orders.view', 'orders.manage'] } },
      );
    });
  });

  it('closes the editor only after the server confirms, with a success toast', async () => {
    await renderTeamAccess({ perms: ['employees.view', 'employees.permissions'] });
    fireEvent.click(screen.getByLabelText(/Edit permissions for Ama Mensah/i));
    fireEvent.click(screen.getByText('Save permissions'));
    await waitFor(() => expect(toastGo).toHaveBeenCalledWith('Permissions updated'));
    await waitFor(() => expect(screen.queryByTestId('perms-editor-emp-1')).toBeNull());
  });

  it('keeps the editor open and honest on server refusal — no optimistic success', async () => {
    await renderTeamAccess({
      perms: ['employees.view', 'employees.permissions'],
      impl: async (url) => {
        if (String(url).includes('/employees/me')) return { employee: { role: 'MANAGER', effectivePermissions: ['employees.view', 'employees.permissions'] } };
        if (String(url).includes('/permission-templates')) return TEMPLATES;
        if (String(url).includes('/employees/emp-1/permissions')) throw new Error('You cannot grant permissions above your own');
        return EMPLOYEES;
      },
    });
    fireEvent.click(screen.getByLabelText(/Edit permissions for Ama Mensah/i));
    fireEvent.click(screen.getByText('Save permissions'));
    await waitFor(() => expect(toastStop).toHaveBeenCalled());
    // Editor stays open with the server's message; no success toast fired.
    expect(screen.getByTestId('perms-editor-emp-1')).toBeTruthy();
    expect(screen.getByTestId('perms-error-emp-1').textContent).toMatch(/cannot grant permissions above your own/i);
    expect(toastGo).not.toHaveBeenCalledWith('Permissions updated');
  });

  it('prevents duplicate submissions while a save is in flight', async () => {
    let resolveSave;
    await renderTeamAccess({
      perms: ['employees.view', 'employees.permissions'],
      impl: async (url) => {
        if (String(url).includes('/employees/me')) return { employee: { role: 'MANAGER', effectivePermissions: ['employees.view', 'employees.permissions'] } };
        if (String(url).includes('/permission-templates')) return TEMPLATES;
        if (String(url).includes('/employees/emp-1/permissions')) return new Promise(r => { resolveSave = r; });
        return EMPLOYEES;
      },
    });
    fireEvent.click(screen.getByLabelText(/Edit permissions for Ama Mensah/i));
    fireEvent.click(screen.getByText('Save permissions'));
    await waitFor(() => expect(screen.getByText('Saving…')).toBeTruthy());
    const saveBtn = screen.getByText('Saving…').closest('button');
    expect(saveBtn.disabled).toBe(true);
    // Resolve the in-flight save; exactly one POST happened.
    resolveSave({ success: true, employee: {} });
    await waitFor(() => expect(screen.queryByText('Saving…')).toBeNull());
    const saves = requestMock.mock.calls.filter(c => String(c[0]).includes('/permissions'));
    expect(saves.length).toBe(1);
  });

  it('never shows an edit affordance for the OWNER row', async () => {
    await renderTeamAccess({
      perms: ['employees.view', 'employees.permissions'],
      impl: async (url) => {
        if (String(url).includes('/employees/me')) return { employee: { role: 'MANAGER', effectivePermissions: ['employees.view', 'employees.permissions'] } };
        if (String(url).includes('/permission-templates')) return TEMPLATES;
        return { employees: [{ id: 'emp-0', fullName: 'Owner Person', email: 'own@biz.gh', role: 'OWNER', permissions: ['*'] }] };
      },
      waitName: 'Owner Person',
    });
    expect(screen.queryByLabelText(/Edit permissions for Owner Person/i)).toBeNull();
  });
});

describe('TeamAccess — employee without a BusinessProfile (Finding 4)', () => {
  it('loads the team surface for an employee with no profile of their own', async () => {
    await renderTeamAccess({ perms: ['employees.view', 'employees.permissions'], bizProfile: null });
    // Both queries fired — no profile-only gate blocking them.
    const urls = requestMock.mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('/api/business-os/employees'))).toBe(true);
    expect(urls.some(u => u.includes('/api/business-os/permission-templates'))).toBe(true);
    expect(screen.getByText('Ama Mensah')).toBeTruthy();
    expect(screen.getByText('Kofi Boateng')).toBeTruthy();
  });
});
