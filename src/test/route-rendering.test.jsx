import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { Suspense } from 'react';

// Mock the auth context so we can control auth state per test.
const mockAuth = {
  user: null,
  bizProfile: null,
  loading: true,
  authed: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
  isAdmin: false,
  adminBusinesses: [],
  selectedBusinessId: null,
  selectBusiness: vi.fn(),
};

vi.mock('@/lib/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockAuth,
}));

// Mock lazy-loaded page components to avoid importing the entire app graph.
vi.mock('@/pages/Login', () => ({ default: () => <div data-testid="page-login">Login</div> }));
vi.mock('@/pages/Dashboard', () => ({ default: () => <div data-testid="page-dashboard">Dashboard</div> }));
vi.mock('@/pages/Onboarding', () => ({ default: () => <div data-testid="page-onboarding">Onboarding</div> }));

// Mock Layout and TypeGuardedRoute so authenticated routes render without business-type logic.
vi.mock('react-router-dom', async () => { const actual = await vi.importActual('react-router-dom'); return { ...actual }; });
vi.mock('@/components/instrument', () => ({
  Layout: () => <div data-testid="layout"><Outlet /></div>,
}));
vi.mock('./components/TypeGuardedRoute', () => ({
  TypeGuardedRoute: ({ children }) => children,
}));

// Mock providers that hit network on mount.
vi.mock('@/lib/query-client', () => ({
  queryClient: {},
  ensureRealtimeQueryBridge: vi.fn(),
}));
vi.mock('@/lib/socket', () => ({
  connectSocket: vi.fn(() => ({ connected: false, on: vi.fn(), off: vi.fn(), once: vi.fn() })),
  joinUserRoom: vi.fn(),
  disconnectSocket: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({
  ToastHost: () => null,
}));
vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }) => children,
  SectionBoundary: ({ children }) => children,
}));
vi.mock('@/components/AppBackground', () => ({
  AppBackground: () => null,
}));

// Import AppRoutes AFTER mocks are registered.
import { AppRoutes } from "@/App";

function renderWithRouter(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Suspense fallback={<div>loading…</div>}>
        <AppRoutes />
      </Suspense>
    </MemoryRouter>
  );
}

describe('Business Portal route rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockAuth, {
      user: null,
      bizProfile: null,
      loading: true,
      authed: false,
      isAdmin: false,
    });
  });

  it('shows loading state while restoring session', () => {
    mockAuth.loading = true;
    renderWithRouter('/');
    expect(screen.getByText(/loading your portal/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.loading = false;
    mockAuth.authed = false;
    renderWithRouter('/orders');
    await waitFor(() => {
      expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });
  });

  it('renders login page directly at /login when unauthenticated', async () => {
    mockAuth.loading = false;
    mockAuth.authed = false;
    renderWithRouter('/login');
    await waitFor(() => {
      expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });
  });

  it('renders Dashboard for authenticated business user at /', async () => {
    mockAuth.loading = false;
    mockAuth.authed = true;
    mockAuth.user = { id: 1, username: 'biz_owner', role: 'BUSINESS' };
    mockAuth.bizProfile = { id: 1, name: 'Test Shop' };
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    });
  });

  it('redirects /login to / when already authenticated', async () => {
    mockAuth.loading = false;
    mockAuth.authed = true;
    mockAuth.user = { id: 1, username: 'biz_owner', role: 'BUSINESS' };
    mockAuth.bizProfile = { id: 1, name: 'Test Shop' };
    renderWithRouter('/login');
    await waitFor(() => {
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    });
  });

  it('shows onboarding when authenticated but no business profile', async () => {
    mockAuth.loading = false;
    mockAuth.authed = true;
    mockAuth.user = { id: 1, username: 'new_user', role: 'BUSINESS' };
    mockAuth.bizProfile = null;
    mockAuth.isAdmin = false;
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByTestId('page-onboarding')).toBeInTheDocument();
    });
  });
});
