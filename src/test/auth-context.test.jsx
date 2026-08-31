import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

const {
  mockAuth,
  mockBusiness,
  mockRequest,
  mockSetAccessToken,
  mockConnectSocket,
  mockJoinUserRoom,
  mockDisconnectSocket,
  mockEnsureRealtimeQueryBridge,
} = vi.hoisted(() => ({
  mockAuth: { login: vi.fn(), restore: vi.fn(), logout: vi.fn() },
  mockBusiness: { me: vi.fn() },
  mockRequest: vi.fn(),
  mockSetAccessToken: vi.fn(),
  mockConnectSocket: vi.fn(),
  mockJoinUserRoom: vi.fn(),
  mockDisconnectSocket: vi.fn(),
  mockEnsureRealtimeQueryBridge: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  auth: mockAuth,
  business: mockBusiness,
  request: mockRequest,
}));

vi.mock('@/lib/apiCore', () => ({
  setAccessToken: mockSetAccessToken,
}));

vi.mock('@/lib/socket', () => ({
  connectSocket: mockConnectSocket,
  joinUserRoom: mockJoinUserRoom,
  disconnectSocket: mockDisconnectSocket,
}));

vi.mock('@/lib/query-client', () => ({
  ensureRealtimeQueryBridge: mockEnsureRealtimeQueryBridge,
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <output data-testid="loading">{String(auth.loading)}</output>
      <output data-testid="authed">{String(auth.authed)}</output>
      <output data-testid="is-admin">{String(auth.isAdmin)}</output>
      <output data-testid="username">{auth.user?.username || ''}</output>
      <output data-testid="business-name">{auth.bizProfile?.name || ''}</output>
      <output data-testid="selected-business">{auth.selectedBusinessId || ''}</output>
      <button onClick={() => void auth.login('owner@example.com', 'secret')}>Login</button>
      <button onClick={() => void auth.logout()}>Logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe('AuthProvider runtime behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockConnectSocket.mockReturnValue({ connected: true, once: vi.fn() });
  });

  it('restores a business session, loads its profile, and wires realtime state', async () => {
    mockAuth.restore.mockResolvedValue({
      accessToken: 'access-123',
      user: { id: 7, username: 'owner', role: 'BUSINESS' },
    });
    mockBusiness.me.mockResolvedValue({ business: { id: 'biz-7', name: 'Owner Shop' } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('authed')).toHaveTextContent('true');
    expect(screen.getByTestId('username')).toHaveTextContent('owner');
    expect(screen.getByTestId('business-name')).toHaveTextContent('Owner Shop');
    expect(mockSetAccessToken).toHaveBeenCalledWith('access-123');
    expect(mockBusiness.me).toHaveBeenCalledTimes(1);
    expect(mockConnectSocket).toHaveBeenCalledWith('access-123');
    expect(mockJoinUserRoom).toHaveBeenCalledWith(7);
    expect(mockEnsureRealtimeQueryBridge).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('biz_user'))).toEqual({ id: 7, username: 'owner', role: 'BUSINESS' });
  });

  it('fails closed when session restore fails', async () => {
    localStorage.setItem('biz_user', JSON.stringify({ id: 9, username: 'stale' }));
    mockAuth.restore.mockRejectedValue(new Error('expired'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('');
    expect(mockSetAccessToken).toHaveBeenCalledWith(null);
    expect(mockBusiness.me).not.toHaveBeenCalled();
    expect(localStorage.getItem('biz_user')).toBeNull();
  });

  it('restores an admin session and selects a persisted business without loading the owner profile', async () => {
    localStorage.setItem('admin_selected_biz', 'biz-42');
    mockAuth.restore.mockResolvedValue({
      accessToken: 'admin-token',
      user: { id: 42, username: 'admin', role: 'ADMIN' },
    });
    mockRequest.mockImplementation((path) => {
      if (path === '/api/admin/marketplace-businesses') {
        return Promise.resolve({ businesses: [{ id: 'biz-10', name: 'First Shop' }, { id: 'biz-42', name: 'Selected Shop' }] });
      }
      if (path === '/api/admin/marketplace-businesses/biz-42') {
        return Promise.resolve({ business: { id: 'biz-42', name: 'Selected Shop' } });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-42'));

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('business-name')).toHaveTextContent('Selected Shop');
    expect(mockBusiness.me).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith('/api/admin/marketplace-businesses');
    expect(mockRequest).toHaveBeenCalledWith('/api/admin/marketplace-businesses/biz-42');
  });

  it('logs an admin in, stores the first available business selection, and does not lose auth state', async () => {
    mockAuth.restore.mockRejectedValue(new Error('no existing session'));
    mockAuth.login.mockResolvedValue({
      accessToken: 'login-token',
      user: { id: 11, username: 'operator', role: 'ADMIN' },
    });
    mockRequest.mockImplementation((path) => {
      if (path === '/api/admin/marketplace-businesses') {
        return Promise.resolve({ businesses: [{ id: 'biz-99', name: 'Demo Business' }] });
      }
      if (path === '/api/admin/marketplace-businesses/biz-99') {
        return Promise.resolve({ business: { id: 'biz-99', name: 'Demo Business' } });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByTestId('business-name')).toHaveTextContent('Demo Business'));

    expect(screen.getByTestId('authed')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('username')).toHaveTextContent('operator');
    expect(screen.getByTestId('selected-business')).toHaveTextContent('biz-99');
    expect(localStorage.getItem('admin_selected_biz')).toBe('biz-99');
    expect(mockAuth.login).toHaveBeenCalledWith('owner@example.com', 'secret');
  });

  it('logout disconnects realtime state and clears persisted session selections', async () => {
    mockAuth.restore.mockResolvedValue({
      accessToken: 'access-logout',
      user: { id: 15, username: 'owner', role: 'BUSINESS' },
    });
    mockBusiness.me.mockResolvedValue({ business: { id: 'biz-15', name: 'Logout Shop' } });
    mockAuth.logout.mockResolvedValue(undefined);

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    localStorage.setItem('admin_selected_biz', 'stale-biz');
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));

    expect(mockDisconnectSocket).toHaveBeenCalledTimes(1);
    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('username')).toHaveTextContent('');
    expect(screen.getByTestId('business-name')).toHaveTextContent('');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(localStorage.getItem('biz_user')).toBeNull();
    expect(localStorage.getItem('admin_selected_biz')).toBeNull();
  });
});
