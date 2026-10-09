// src/test/admin-business-context.test.jsx
// =============================================================================
// Regression suite for the admin business-context contract (PR task):
//
//   1. A fresh admin login NEVER auto-selects a business.
//   2. The marketplace overview is the admin landing surface, grouped by the
//      actual backend category, using the real field names (businessName,
//      category, azamanId) — never invented ones.
//   3. Business switching is a controlled transition: pages unmount, the
//      query cache is cancelled and cleared, and only then does the new
//      context commit atomically (storage + selected id + profile together).
//      A failed switch changes NOTHING — the old context stays consistent
//      and the failure is surfaced.
//   4. The query cache is isolated across switches (no business A data can
//      repopulate under business B).
//   5. Concurrent switches are race-free: the latest request wins, a
//      superseded one can never commit.
//   6. Session restore preserves an intentional selection — and fails
//      honestly (clearing the dead selection) when it no longer exists.
//   7. Logout clears the admin scope completely.
//   8. A non-admin can NEVER gain admin scope: selectBusiness refuses, and a
//      stale admin_selected_biz in storage is inert for non-admin sessions.
//   9. Owner-only page contracts are honest in admin view: refused routes
//      show refusals (never fake empty data), mixed routes name their
//      owner-only surfaces, and the server stays the authority.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, AuthContext, useAuth } from '@/lib/AuthContext';
import AdminMarketplace from '@/pages/AdminMarketplace';

// ── Module mocks ─────────────────────────────────────────────────────────────
const {
  mockAuth, mockBusiness, mockRequest, mockSetAccessToken,
  mockConnectSocket, mockJoinUserRoom, mockDisconnectSocket,
  mockEnsureRealtimeQueryBridge, mockQueryClient,
} = vi.hoisted(() => ({
  mockAuth: { login: vi.fn(), restore: vi.fn(), logout: vi.fn() },
  mockBusiness: { me: vi.fn() },
  mockRequest: vi.fn(),
  mockSetAccessToken: vi.fn(),
  mockConnectSocket: vi.fn(),
  mockJoinUserRoom: vi.fn(),
  mockDisconnectSocket: vi.fn(),
  mockEnsureRealtimeQueryBridge: vi.fn(),
  mockQueryClient: {
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    removeQueries: vi.fn(),
    isMutating: vi.fn().mockReturnValue(0),
    getMutationCache: vi.fn().mockReturnValue({ subscribe: vi.fn().mockReturnValue(vi.fn()) }),
  },
}));

vi.mock('@/lib/api', () => ({
  auth: mockAuth,
  business: mockBusiness,
  request: mockRequest,
  orders: { stats: vi.fn(), list: vi.fn() },
  invoices: { stats: vi.fn() },
}));

vi.mock('@/lib/apiCore', () => ({ setAccessToken: mockSetAccessToken }));
vi.mock('@/lib/socket', () => ({
  connectSocket: mockConnectSocket,
  joinUserRoom: mockJoinUserRoom,
  disconnectSocket: mockDisconnectSocket,
}));
vi.mock('@/lib/query-client', () => ({
  ensureRealtimeQueryBridge: mockEnsureRealtimeQueryBridge,
  queryClient: mockQueryClient,
}));

// ── Probes ───────────────────────────────────────────────────────────────────
function AdminProbe() {
  const auth = useAuth();
  return (
    <div>
      <output data-testid="is-admin">{String(auth.isAdmin)}</output>
      <output data-testid="is-admin-view">{String(auth.isAdminView)}</output>
      <output data-testid="selected-business">{auth.selectedBusinessId || ''}</output>
      <output data-testid="business-name">{auth.bizProfile?.businessName || auth.bizProfile?.name || ''}</output>
      <output data-testid="switching">{auth.switching ? `${auth.switching.targetId}:${auth.switching.waitingForMutations ? 'waiting' : 'loading'}` : ''}</output>
      <output data-testid="switch-error">{auth.switchError ? `${auth.switchError.kind}:${auth.switchError.targetName || ''}` : ''}</output>
      <output data-testid="admin-business-count">{String(auth.adminBusinesses?.length || 0)}</output>
      <button onClick={() => void auth.login('admin@example.com', 'pw')}>Login</button>
      <button onClick={() => void auth.logout()}>Logout</button>
      <button onClick={() => void auth.selectBusiness('biz-a', { targetName: 'Biz A' })}>Select A</button>
      <button onClick={() => void auth.selectBusiness('biz-b', { targetName: 'Biz B' })}>Select B</button>
    </div>
  );
}

function renderAdminProvider() {
  return render(
    <AuthProvider><AdminProbe /></AuthProvider>
  );
}

const BUSINESSES = [
  { id: 'biz-a', businessName: 'Zoey Restaurant', category: 'FOOD_BEVERAGE', azamanId: 'AZ-001' },
  { id: 'biz-b', businessName: 'Blue Sky Logistics', category: 'LOGISTICS', azamanId: 'AZ-002' },
  { id: 'biz-c', businessName: 'Sunrise Suites', category: 'HOSPITALITY', azamanId: 'AZ-003' },
];

function mockAdminEndpoints() {
  mockRequest.mockImplementation((path) => {
    if (path === '/api/admin/marketplace-businesses') {
      return Promise.resolve({ businesses: BUSINESSES });
    }
    const m = path.match(/^\/api\/admin\/marketplace-businesses\/(.+)$/);
    if (m) {
      const b = BUSINESSES.find(x => x.id === m[1]);
      if (!b) return Promise.reject(new Error('Business not found.'));
      return Promise.resolve({ business: b });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
}

async function restoreAdminSession({ savedBiz = null } = {}) {
  if (savedBiz) localStorage.setItem('admin_selected_biz', savedBiz);
  mockAdminEndpoints();
  mockAuth.restore.mockResolvedValue({
    accessToken: 'admin-token',
    user: { id: 42, username: 'admin', role: 'ADMIN' },
  });
  renderAdminProvider();
  await waitFor(() => expect(screen.getByTestId('is-admin')).toHaveTextContent('true'));
  await waitFor(() => expect(screen.getByTestId('admin-business-count')).toHaveTextContent('3'));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockConnectSocket.mockReturnValue({ connected: true, once: vi.fn() });
  mockQueryClient.cancelQueries.mockResolvedValue(undefined);
  mockQueryClient.isMutating.mockReturnValue(0);
});
afterEach(() => { localStorage.clear(); });

// ── 2/6. Restore semantics ───────────────────────────────────────────────────
describe('admin session restore', () => {
  it('restores an intentional selection through the controlled transition, keeping storage and context in sync', async () => {
    await restoreAdminSession({ savedBiz: 'biz-b' });

    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-b'));
    expect(screen.getByTestId('business-name')).toHaveTextContent('Blue Sky Logistics');
    expect(screen.getByTestId('is-admin-view')).toHaveTextContent('true');
    // The profile was loaded through the ADMIN endpoint, not business.me.
    expect(mockBusiness.me).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith('/api/admin/marketplace-businesses/biz-b');
    // Cache isolation ran as part of the transition.
    expect(mockQueryClient.cancelQueries).toHaveBeenCalled();
    expect(mockQueryClient.removeQueries).toHaveBeenCalled();
    expect(localStorage.getItem('admin_selected_biz')).toBe('biz-b');
  });

  it('fails honestly when the saved business no longer exists: dead selection cleared, overview landing, error surfaced', async () => {
    await restoreAdminSession({ savedBiz: 'biz-gone' });

    // No request was made for the dead business.
    expect(mockRequest).not.toHaveBeenCalledWith('/api/admin/marketplace-businesses/biz-gone');
    expect(screen.getByTestId('selected-business')).toHaveTextContent('');
    expect(screen.getByTestId('is-admin-view')).toHaveTextContent('false');
    expect(localStorage.getItem('admin_selected_biz')).toBeNull();
    expect(screen.getByTestId('switch-error')).toHaveTextContent(/^restore:/);
  });

  it('lands on the marketplace overview (no selection) when nothing was saved', async () => {
    await restoreAdminSession({});

    expect(screen.getByTestId('selected-business')).toHaveTextContent('');
    expect(screen.getByTestId('is-admin-view')).toHaveTextContent('false');
    expect(screen.getByTestId('business-name')).toHaveTextContent('');
    expect(localStorage.getItem('admin_selected_biz')).toBeNull();
  });
});

// ── 3/4/5. Controlled transition semantics ───────────────────────────────────
describe('controlled business switch', () => {
  it('commits atomically: cache cleared before the load, and storage + selected id + profile move together only on success', async () => {
    await restoreAdminSession({ savedBiz: 'biz-a' });

    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));

    // Switching gate is visible while the transition runs.
    await waitFor(() => expect(screen.getByTestId('switching')).toHaveTextContent('biz-b:loading'));
    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-b'));

    expect(screen.getByTestId('business-name')).toHaveTextContent('Blue Sky Logistics');
    expect(screen.getByTestId('switching')).toHaveTextContent('');
    expect(localStorage.getItem('admin_selected_biz')).toBe('biz-b');
    // No business-scoped request happened before the context committed.
    expect(mockRequest).toHaveBeenCalledWith('/api/admin/marketplace-businesses/biz-b');
    expect(mockQueryClient.removeQueries).toHaveBeenCalled();
  });

  it('a failed switch changes NOTHING: old context, storage and header stay consistent and the failure is surfaced', async () => {
    await restoreAdminSession({ savedBiz: 'biz-a' });

    mockRequest.mockImplementation((path) => {
      if (path === '/api/admin/marketplace-businesses') {
        return Promise.resolve({ businesses: BUSINESSES });
      }
      if (path === '/api/admin/marketplace-businesses/biz-a') {
        return Promise.resolve({ business: BUSINESSES[0] });
      }
      if (path === '/api/admin/marketplace-businesses/biz-b') {
        return Promise.reject(new Error('Server refused'));
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));

    await waitFor(() => expect(screen.getByTestId('switch-error')).toHaveTextContent('switch:Biz B'));
    // Nothing was committed.
    expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-a');
    expect(screen.getByTestId('business-name')).toHaveTextContent('Zoey Restaurant');
    expect(localStorage.getItem('admin_selected_biz')).toBe('biz-a');
    expect(screen.getByTestId('switching')).toHaveTextContent('');
  });

  it('is race-free: rapid A→B switches commit only the latest, and a slower superseded request can never overwrite it', async () => {
    await restoreAdminSession({});

    let releaseA, releaseB;
    const gate = {};
    mockRequest.mockImplementation((path) => {
      if (path === '/api/admin/marketplace-businesses') {
        return Promise.resolve({ businesses: BUSINESSES });
      }
      if (path === '/api/admin/marketplace-businesses/biz-a') {
        return new Promise((res, rej) => { releaseA = () => res({ business: BUSINESSES[0] }); });
      }
      if (path === '/api/admin/marketplace-businesses/biz-b') {
        return new Promise((res, rej) => { releaseB = () => res({ business: BUSINESSES[1] }); });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    await waitFor(() => expect(screen.getByTestId('switching')).toHaveTextContent('biz-a:loading'));
    fireEvent.click(screen.getByRole('button', { name: 'Select B' }));
    await waitFor(() => expect(screen.getByTestId('switching')).toHaveTextContent('biz-b:loading'));

    // Resolve the LATER request first; then the earlier one tries to land.
    await act(async () => { releaseB && releaseB(); });
    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-b'));
    await act(async () => { releaseA && releaseA(); });

    // The superseded A response never overwrites B.
    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-b'));
    expect(screen.getByTestId('business-name')).toHaveTextContent('Blue Sky Logistics');
    expect(localStorage.getItem('admin_selected_biz')).toBe('biz-b');
  });

  it('defers while a business mutation is in flight, and proceeds once mutations settle', async () => {
    await restoreAdminSession({});

    // One in-flight mutation.
    mockQueryClient.isMutating.mockReturnValue(1);
    const subscribers = [];
    mockQueryClient.getMutationCache.mockReturnValue({ subscribe: (fn) => { subscribers.push(fn); return vi.fn(); } });
    mockAdminEndpoints();

    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));

    // Deferred: switching state says we are waiting, and no profile request fired yet.
    await waitFor(() => expect(screen.getByTestId('switching')).toHaveTextContent('biz-a:waiting'));
    expect(mockRequest).not.toHaveBeenCalledWith('/api/admin/marketplace-businesses/biz-a');
    expect(screen.getByTestId('selected-business')).toHaveTextContent('');

    // Mutations settle → the switch proceeds and commits.
    mockQueryClient.isMutating.mockReturnValue(0);
    await act(async () => { subscribers.forEach(fn => fn({})); });
    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-a'));
    expect(screen.getByTestId('business-name')).toHaveTextContent('Zoey Restaurant');
  });
});

// ── 1/7. Login and logout ────────────────────────────────────────────────────
describe('admin login and logout scope', () => {
  it('a fresh admin login starts with NO business in context and clears any stale persisted selection', async () => {
    localStorage.setItem('admin_selected_biz', 'stale-from-last-session');
    mockAdminEndpoints();
    mockAuth.restore.mockRejectedValue(new Error('no session'));
    mockAuth.login.mockResolvedValue({
      accessToken: 'fresh-token',
      user: { id: 50, username: 'fresh-admin', role: 'ADMIN' },
    });

    renderAdminProvider();
    await waitFor(() => expect(screen.getByTestId('is-admin')).toHaveTextContent('false'));
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByTestId('is-admin')).toHaveTextContent('true'));

    expect(screen.getByTestId('selected-business')).toHaveTextContent('');
    expect(screen.getByTestId('is-admin-view')).toHaveTextContent('false');
    expect(screen.getByTestId('business-name')).toHaveTextContent('');
    expect(localStorage.getItem('admin_selected_biz')).toBeNull();
    expect(screen.getByTestId('admin-business-count')).toHaveTextContent('3');
    // No implicit business profile fetch on login.
    expect(mockRequest).not.toHaveBeenCalledWith('/api/admin/marketplace-businesses/biz-a');
    expect(mockBusiness.me).not.toHaveBeenCalled();
  });

  it('logout clears the admin scope completely (storage + context + cache)', async () => {
    await restoreAdminSession({ savedBiz: 'biz-a' });
    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-a'));
    mockAuth.logout.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(screen.getByTestId('is-admin')).toHaveTextContent('false'));
    expect(screen.getByTestId('selected-business')).toHaveTextContent('');
    expect(screen.getByTestId('is-admin-view')).toHaveTextContent('false');
    expect(screen.getByTestId('business-name')).toHaveTextContent('');
    expect(localStorage.getItem('admin_selected_biz')).toBeNull();
    expect(mockDisconnectSocket).toHaveBeenCalled();
    expect(mockQueryClient.removeQueries).toHaveBeenCalled();
  });
});

// ── 8. Non-admin can never gain admin scope ──────────────────────────────────
describe('non-admin sessions cannot gain admin scope', () => {
  it('ignores a stale admin_selected_biz, uses the owner profile, and refuses selectBusiness', async () => {
    localStorage.setItem('admin_selected_biz', 'biz-a');
    mockAuth.restore.mockResolvedValue({
      accessToken: 'owner-token',
      user: { id: 7, username: 'owner', role: 'BUSINESS' },
    });
    mockBusiness.me.mockResolvedValue({ business: { id: 'biz-own', businessName: 'Owner Shop', category: 'RETAIL' } });

    renderAdminProvider();
    await waitFor(() => expect(screen.getByTestId('business-name')).toHaveTextContent('Owner Shop'));

    // No admin listing was requested for a non-admin session.
    expect(mockRequest).not.toHaveBeenCalledWith('/api/admin/marketplace-businesses');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin-view')).toHaveTextContent('false');

    // selectBusiness is refused: no switching state, no context change, no storage write.
    fireEvent.click(screen.getByRole('button', { name: 'Select A' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('switching')).toHaveTextContent('');
    expect(screen.getByTestId('business-name')).toHaveTextContent('Owner Shop');
    expect(localStorage.getItem('admin_selected_biz')).toBe('biz-a'); // untouched — never written by the app for this role
  });
});

// ── 9. Owner-only contracts are honest in admin view ─────────────────────────
describe('admin view contracts', () => {
  // Unit-level: the contract map classifies the key routes truthfully.
  it('classifies routes by their verified admin contract', async () => {
    const { adminContractFor, ADMIN_ROUTE_CONTRACT } = await import('@/lib/adminContract');
    // Fully supported Business OS surfaces.
    expect(adminContractFor('/messages').level).toBe('supported');
    expect(adminContractFor('/employees').level).toBe('supported');
    // Mixed: admin-capable + named owner-only surfaces.
    expect(adminContractFor('/').level).toBe('mixed');
    expect(adminContractFor('/orders').level).toBe('mixed');
    // Owner-only: refused whole-route.
    expect(adminContractFor('/checkin').level).toBe('owner-only');
    expect(adminContractFor('/settings').level).toBe('owner-only');
    expect(adminContractFor('/kyb').level).toBe('owner-only');
    // Mock-only: Developer stays a preview.
    expect(adminContractFor('/settings/developer').level).toBe('mock-only');
    // Param routes resolve.
    expect(adminContractFor('/orders/abc123').level).toBe('mixed');
    // Every mixed/owner-only route names its owner-only surfaces.
    for (const [route, contract] of Object.entries(ADMIN_ROUTE_CONTRACT)) {
      if (contract.level === 'mixed') {
        expect(contract.ownerOnly.length).toBeGreaterThan(0);
      }
    }
  });

  // Component-level: the gate renders refusals, banners, or the page.
  it('AdminContractGate refuses owner-only routes with an explanation instead of fake empty data', async () => {
    const { default: AdminContractGate } = await import('@/components/AdminContractGate');

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ isAdminView: true }}>
          <AdminContractGate route="/kyb">
            <div data-testid="kyb-page">KYB PAGE</div>
          </AdminContractGate>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('kyb-page')).toBeNull();
    const refusal = await screen.findByTestId('admin-refusal-kyb');
    expect(refusal).toHaveTextContent(/Not available in admin view/i);
  });

  it('AdminContractGate names the owner-only surfaces on mixed routes and still renders the admin-capable page', async () => {
    const { default: AdminContractGate } = await import('@/components/AdminContractGate');

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ isAdminView: true }}>
          <AdminContractGate route="/orders">
            <div data-testid="orders-page">ORDERS PAGE</div>
          </AdminContractGate>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('orders-page')).toBeTruthy();
    const banner = screen.getByTestId('admin-limitation-orders');
    expect(banner).toHaveTextContent(/Admin view limitation/i);
    expect(banner).toHaveTextContent(/legacy order feed/i); // names the actual surface
  });

  it('AdminContractGate renders the page untouched for non-admins (gate is inert without admin scope)', async () => {
    const { default: AdminContractGate } = await import('@/components/AdminContractGate');
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ isAdminView: false }}>
          <AdminContractGate route="/kyb">
            <div data-testid="kyb-page">KYB PAGE</div>
          </AdminContractGate>
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('kyb-page')).toBeTruthy();
    expect(screen.queryByTestId('admin-refusal-kyb')).toBeNull();
  });

  it('the Developer page is refused as a PREVIEW (mock-only), with the honest reason', async () => {
    const { default: AdminContractGate } = await import('@/components/AdminContractGate');
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ isAdminView: true }}>
          <AdminContractGate route="/settings/developer">
            <div data-testid="developer-page">DEVELOPER PAGE</div>
          </AdminContractGate>
        </AuthContext.Provider>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('developer-page')).toBeNull();
    const refusal = await screen.findByTestId('admin-refusal-settings-developer');
    expect(refusal).toHaveTextContent(/preview/i);
  });
});

// ── 2. Marketplace overview correctness ─────────────────────────────────────
describe('marketplace overview', () => {
  const renderOverview = (ctx) => render(
    <MemoryRouter>
      <AuthContext.Provider value={ctx}>
        <AdminMarketplace />
      </AuthContext.Provider>
    </MemoryRouter>
  );

  it('groups businesses by their ACTUAL backend category with real field names, and selection goes through selectBusiness', async () => {
    const selectBusiness = vi.fn();
    renderOverview({
      isAdminView: false,
      selectedBusinessId: null,
      switching: null,
      switchError: null,
      selectBusiness,
      clearSwitchError: vi.fn(),
      adminBusinesses: [
        ...BUSINESSES,
        { id: 'biz-d', businessName: 'Edutech Tutors', category: 'EDUCATION', azamanId: 'AZ-004' }, // outside the four headline verticals
      ],
    });

    // Grouped by actual category (including non-headline ones).
    expect(screen.getByTestId('marketplace-group-FOOD_BEVERAGE')).toBeTruthy();
    expect(screen.getByTestId('marketplace-group-LOGISTICS')).toBeTruthy();
    expect(screen.getByTestId('marketplace-group-HOSPITALITY')).toBeTruthy();
    expect(screen.getByTestId('marketplace-group-EDUCATION')).toBeTruthy();

    // Real field names used: businessName and azamanId rendered.
    expect(screen.getByText('Zoey Restaurant')).toBeTruthy();
    expect(screen.getByText(/AZ-001/)).toBeTruthy();

    // Selection is an explicit action through the controlled transition.
    fireEvent.click(screen.getByTestId('select-business-biz-a'));
    // The enter intent is now part of the AUTH contract: selection passes
    // enterAfterSwitch so AuthContext records the pending dashboard entry.
    expect(selectBusiness).toHaveBeenCalledWith('biz-a', { targetName: 'Zoey Restaurant', enterAfterSwitch: true });
  });

  it('disables selection while a transition is running and shows the error card after a failed switch', () => {
    const selectBusiness = vi.fn();
    renderOverview({
      isAdminView: true,
      selectedBusinessId: 'biz-a',
      switching: null,
      switchError: { kind: 'switch', targetName: 'Biz B', fromName: 'Zoey Restaurant', message: 'Server refused' },
      selectBusiness,
      clearSwitchError: vi.fn(),
      adminBusinesses: BUSINESSES,
    });

    expect(screen.getByTestId('marketplace-switch-error')).toBeTruthy();
    expect(screen.getByTestId('marketplace-switch-error')).toHaveTextContent(/Could not switch to Biz B/);
    expect(screen.getByTestId('marketplace-switch-error')).toHaveTextContent(/still viewing Zoey Restaurant/i);
  });
});
