/**
 * Shared request core for the Business Portal API layer.
 * Access JWTs live only in memory. The refresh token is kept by the backend
 * in an HttpOnly cookie after the one-time business-session bootstrap.
 */

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/api/auth/business-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.accessToken) throw new Error('Session refresh failed');
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function restoreBusinessSession() {
  return refreshSession();
}

export async function logoutBusinessSession() {
  try {
    await fetch(`${BASE_URL}/api/auth/business-session/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } finally {
    clearAccessToken();
  }
}

export async function request(path, options = {}) {
  const isLoginCall = path.startsWith('/api/auth/login');
  const isSessionCall = path.startsWith('/api/auth/business-session');

  async function send(token) {
    return fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(() => {
          const adminBizId = localStorage.getItem('admin_selected_biz');
          return adminBizId ? { 'x-admin-business-id': adminBizId } : {};
        })(),
        ...options.headers,
      },
      ...options,
    });
  }

  let res = await send(accessToken);

  // A short-lived access token is expected to expire. Rotate the HttpOnly
  // refresh cookie once, then replay the original request exactly once.
  if (res.status === 401 && !isLoginCall && !isSessionCall && accessToken) {
    try {
      await refreshSession();
      res = await send(accessToken);
    } catch {
      clearAccessToken();
    }
  }

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    const msg = data.message || data.error || 'Request failed';
    if (res.status === 401 && !isLoginCall && !isSessionCall) {
      clearAccessToken();
      localStorage.removeItem('biz_user');
      if (window.location.pathname !== '/') window.location.replace('/');
      throw new Error('Session expired');
    }
    const err = new Error(msg);
    if (res.status === 402) {
      err.statusCode = 402;
      err.violations = data.violations;
      err.tier = data.tier;
      err.stakedBalance = data.stakedBalance;
    }
    throw err;
  }

  return data;
}
