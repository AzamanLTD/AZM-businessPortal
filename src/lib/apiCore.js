/**
 * Shared request core for the Business Portal API layer.
 * Access JWTs live only in memory. The refresh token is kept by the backend
 * in an HttpOnly cookie after the one-time business-session bootstrap.
 */

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');
const REQUEST_TIMEOUT_MS = 30_000;
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }
export function clearAccessToken() { accessToken = null; }

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout(`${BASE_URL}/api/auth/business-session`, {
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

export function restoreBusinessSession() { return refreshSession(); }

export async function logoutBusinessSession() {
  try {
    await fetchWithTimeout(`${BASE_URL}/api/auth/business-session/logout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    });
  } finally { clearAccessToken(); }
}

export async function request(path, options = {}) {
  const isLoginCall = path.startsWith('/api/auth/login');
  const isSessionCall = path.startsWith('/api/auth/business-session');

  async function send(token) {
    const adminBizId = localStorage.getItem('admin_selected_biz');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminBizId ? { 'x-admin-business-id': adminBizId } : {}),
      ...(options.headers || {}),
    };
    return fetchWithTimeout(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  }

  let res = await send(accessToken);
  if (res.status === 401 && !isLoginCall && !isSessionCall && accessToken) {
    try { await refreshSession(); res = await send(accessToken); }
    catch { clearAccessToken(); }
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
      err.statusCode = 402; err.violations = data.violations; err.tier = data.tier; err.stakedBalance = data.stakedBalance;
    }
    throw err;
  }
  return data;
}
