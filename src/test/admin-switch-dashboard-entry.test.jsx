import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// ── Dashboard entry across the admin business-context switch ───────────────
// Contract under test (AppRoutes + AuthContext, real code, route-aware
// harness): a marketplace selection that asks to ENTER a business lands the
// operator on that business's dashboard ONLY when the controlled switch
// fully commits. The intent lives in the auth contract, so it survives the
// switching gate unmounting the marketplace page — including a switch
// deferred behind in-flight mutations. Failures never navigate.

const BIZ_A = { id: 'biz-a', businessName: 'Alpha Ltd', category: 'RESTAURANT' };
const BIZ_B = { id: 'biz-b', businessName: 'Beta Ltd', category: 'RETAIL' };

const apiState = {
  businesses: [BIZ_A, BIZ_B],
  targetProfile: { business: { id: 'biz-b', businessName: 'Beta Ltd' } },
  failTarget: false,
  mutating: 0,
};

vi.mock('@/lib/api', () => ({
  auth: {
    restore: vi.fn(async () => ({ accessToken: 'tok', user: { id: 'admin-1', role: 'ADMIN' } })),
    login: vi.fn(),
    logout: vi.fn(),
  },
  business: { me: vi.fn(async () => ({ business: null })) },
  request: vi.fn(),
}));
vi.mock('@/lib/apiCore', () => ({ setAccessToken: vi.fn() }));
vi.mock('@/lib/socket', () => ({
  connectSocket: vi.fn(() => ({ connected: false, on: vi.fn(), off: vi.fn(), once: vi.fn() })),
  joinUserRoom: vi.fn(),
  disconnectSocket: vi.fn(),
}));
vi.mock('@/lib/query-client', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    queryClient,
    ensureRealtimeQueryBridge: vi.fn(),
    __testIsMutating: () => queryClient.isMutating(),
  };
});
vi.mock('@/lib/marketplaceApi', () => ({
  request: vi.fn(),
  transitOpsApi: {}, transitApi: {}, transit: {}, hotelOpsApi: {}, storefrontApi: {},
  messagingApi: {}, reservationsApi: {}, default: {},
}));

// Page mocks keep the graph light and make the RENDERED PAGE itself the
// assertion target — the location must actually render the dashboard.
vi.mock('@/pages/AdminMarketplace', async () => {
  const { default: ActualBehavior } = await vi.importActual('@/pages/AdminMarketplace');
  return { default: () => <ActualBehavior /> };
});
vi.mock('@/pages/Dashboard', () => ({ default: () => <div data-testid="page-dashboard">Dashboard</div> }));
vi.mock('@/pages/Onboarding', () => ({ default: () => <div data-testid="page-onboarding">Onboarding</div> }));
vi.mock('@/pages/Login', () => ({ default: () => <div data-testid="page-login">Login</div> }));
vi.mock('@/components/instrument', async (importOriginal) => {
  const actual = await importOriginal();
  const { Outlet } = await vi.importActual('react-router-dom');
  return { ...actual, Layout: () => <div data-testid="layout"><Outlet /></div> };
});
vi.mock('./components/TypeGuardedRoute', () => ({ TypeGuardedRoute: ({ children }) => children }));
vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }) => children,
  SectionBoundary: ({ children }) => children,
}));
vi.mock('@/components/AppBackground', () => ({ AppBackground: () => null }));
vi.mock('@/lib/toast', () => ({ ToastHost: () => null }));

import { AppRoutes } from '@/App';
import { AuthProvider } from '@/lib/AuthContext';

function LocationProbe() {
  const location = useLocation();
  useEffect(() => { window.__lastLocation = location.pathname; }, [location.pathname]);
  return null;
}

// The REAL marketplace page is used so a select click drives the REAL
// selectBusiness. Requests the switch path issues are intercepted here.
const requestMock = (await import('@/lib/api')).request;
requestMock.mockImplementation(async (url) => {
  if (url === '/api/admin/marketplace-businesses') return { businesses: apiState.businesses };
  if (url && url.startsWith('/api/admin/marketplace-businesses/')) {
    if (apiState.failTarget) throw new Error('Business not found.');
    return apiState.targetProfile;
  }
  return {};
});

function HarnessControls() {
  const navigate = useNavigate();
  return (
    <button data-testid="test-goto-marketplace" onClick={() => navigate('/admin-marketplace')}>
      marketplace
    </button>
  );
}

function Harness({ initial = '/admin-marketplace' }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Suspense fallback={<div data-testid="suspending">…</div>}>
            <LocationProbe />
            <HarnessControls />
            <AppRoutes />
          </Suspense>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiState.failTarget = false;
  window.__lastLocation = null;
});
afterEach(() => { localStorage.clear(); });

async function adminLandsOnMarketplace() {
  const utils = render(<Harness />);
  // Session restore → admin with NO saved business → marketplace overview.
  await waitFor(() => expect(screen.getByTestId('admin-marketplace')).toBeTruthy(), { timeout: 4000 });
  return utils;
}

describe('Dashboard entry across the context-switch unmount', () => {
  it('successful selection commits the context and lands the operator on the dashboard at "/"', async () => {
    await adminLandsOnMarketplace();
    expect(window.__lastLocation).toBe('/admin-marketplace');

    await act(async () => {
      screen.getByTestId('select-business-biz-b').click();
    });

    // Location AND rendered page both assert the dashboard entry.
    await waitFor(() => expect(window.__lastLocation).toBe('/'));
    await waitFor(() => expect(screen.getByTestId('page-dashboard')).toBeTruthy());
    expect(screen.queryByTestId('admin-marketplace')).toBeNull();
  });

  it('a switch deferred behind an in-flight mutation still enters the dashboard after it settles', async () => {
    await adminLandsOnMarketplace();

    // One business mutation is in flight when the operator selects.
    const qcModule = await import('@/lib/query-client');
    let settleMutation;
    const deferred = new Promise((resolve) => { settleMutation = resolve; });
    await act(async () => {
      const cache = qcModule.queryClient.getMutationCache();
      cache.build(qcModule.queryClient, { mutationFn: () => deferred }).execute();
    });

    await act(async () => {
      screen.getByTestId('select-business-biz-b').click();
    });
    // Deferred: switching gate is up (marketplace unmounted), no navigation yet.
    await waitFor(() => expect(screen.getByTestId('admin-switching-screen')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('admin-switching-screen').textContent).toMatch(/Waiting for in-progress business operations/));
    expect(window.__lastLocation).toBe('/admin-marketplace');

    // The mutation settles → switch runs → context commits → dashboard.
    await act(async () => { settleMutation(); });
    await waitFor(() => expect(window.__lastLocation).toBe('/'), { timeout: 4000 });
    await waitFor(() => expect(screen.getByTestId('page-dashboard')).toBeTruthy());
  });

  it('a failed target-profile request stays on the marketplace, keeps the previous context and shows the failure', async () => {
    await adminLandsOnMarketplace();

    // First enter Alpha successfully so a previous context exists.
    await act(async () => { screen.getByTestId('select-business-biz-a').click(); });
    await waitFor(() => expect(screen.getByTestId('page-dashboard')).toBeTruthy());

    // Operator returns to the marketplace overview and selects a business
    // whose target-profile request will fail.
    await act(async () => {
      screen.getByTestId('test-goto-marketplace').click();
    });
    await waitFor(() => expect(screen.getByTestId('admin-marketplace')).toBeTruthy());

    apiState.failTarget = true;
    await act(async () => { screen.getByTestId('select-business-biz-b').click(); });

    // Failure card is shown; no navigation away from the marketplace.
    await waitFor(() => expect(screen.getByTestId('marketplace-switch-error')).toBeTruthy());
    expect(window.__lastLocation).toBe('/admin-marketplace');
    expect(screen.getByTestId('admin-marketplace')).toBeTruthy();
    expect(screen.queryByTestId('page-dashboard')).toBeNull();
    // The failure explanation names the target AND the preserved context:
    // the operator is still scoped to Alpha, nothing was committed.
    const failureText = screen.getByTestId('marketplace-switch-error').textContent;
    expect(failureText).toMatch(/Beta Ltd/);
    expect(failureText).toMatch(/Alpha Ltd/);
    expect(failureText).toMatch(/No context was changed/);
  });

  it('never navigates merely because a switch started or a target was requested', async () => {
    await adminLandsOnMarketplace();
    // Make the target profile request hang forever (never resolves).
    let never = () => {};
    requestMock.mockImplementation(async (url) => {
      if (url === '/api/admin/marketplace-businesses') return { businesses: apiState.businesses };
      if (url && url.startsWith('/api/admin/marketplace-businesses/')) {
        return new Promise(() => {});
      }
      return {};
    });
    await act(async () => { screen.getByTestId('select-business-biz-b').click(); });
    // Switching gate is up, target requested, but NO committed context:
    // the dashboard must never appear.
    await waitFor(() => expect(screen.getByTestId('admin-switching-screen')).toBeTruthy());
    await act(async () => { await new Promise((r) => setTimeout(r, 150)); });
    expect(screen.queryByTestId('page-dashboard')).toBeNull();
    expect(window.__lastLocation).toBe('/admin-marketplace');
  });
});
