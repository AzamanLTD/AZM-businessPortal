/**
 * Shared request core for the Business Portal API layer.
 * Access JWTs live only in memory. The refresh token is kept by the backend
 * in an HttpOnly cookie after the one-time business-session bootstrap.
 */

import { disconnectSocket, updateSocketToken } from './socket';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');
const REQUEST_TIMEOUT_MS = 30_000;
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
  if (accessToken) updateSocketToken(accessToken);
}
export function getAccessToken() { return accessToken; }
export function clearAccessToken() {
  accessToken = null;
  disconnectSocket();
}

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

import { invalidatePermissionCache } from './permissionCache';

// A 401 that asks for a second factor is not an expired session: the backend
// answers 401 for an action-bound step-up challenge (STEP_UP_REQUIRED), a
// missing or wrong authenticator code or password, and from the step-up grant
// route itself. Signing the person out there would lose their work (a payroll
// run, a refund) for a typo. Those reach the caller as a typed error instead.
const SECOND_FACTOR_CODES = new Set([
  'STEP_UP_REQUIRED', '2FA_REQUIRED', 'PASSWORD_REQUIRED', 'TOTP_INVALID', 'TOTP_REPLAYED',
]);
export function asksSecondFactor(path, status, data) {
  if (status !== 401) return false;
  if (String(path || '').startsWith('/api/step-up/')) return true;
  return Boolean(data && SECOND_FACTOR_CODES.has(data.code));
}

export async function request(path, options = {}) {
  const isLoginCall = path.startsWith('/api/auth/login');
  const isSessionCall = path.startsWith('/api/auth/business-session');

  async function send(token) {
    // Preserve caller headers for non-security concerns, but make authentication
    // and business selection authoritative. A caller must not be able to
    // accidentally replace the live JWT or selected business context.
    const headers = new Headers(options.headers || {});
    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (isFormDataBody) {
      // The browser must generate multipart/form-data with its boundary. A
      // manually supplied Content-Type makes the upload body unparsable.
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else headers.delete('Authorization');
    const adminBizId = localStorage.getItem('admin_selected_biz');
    if (adminBizId) headers.set('x-admin-business-id', adminBizId);
    else headers.delete('x-admin-business-id');

    return fetchWithTimeout(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  }

  let res = await send(accessToken);
  let data = await res.json().catch(() => ({ message: res.statusText }));
  const secondFactor = asksSecondFactor(path, res.status, data);
  if (res.status === 401 && !isLoginCall && !isSessionCall && accessToken && !secondFactor) {
    try {
      await refreshSession();
      res = await send(accessToken);
      data = await res.json().catch(() => ({ message: res.statusText }));
    }
    catch { clearAccessToken(); }
  }

  if (!res.ok) {
    const msg = data.message || data.error || 'Request failed';
    if (asksSecondFactor(path, res.status, data)) {
      const err = new Error(msg);
      err.statusCode = 401;
      if (data.code) err.code = data.code;
      err.secondFactor = true;
      // A step-up challenge carries what to earn a grant for; the caller
      // echoes it to POST /api/step-up/grant, then retries with the grant in
      // the x-step-up-grant header.
      if (data.code === 'STEP_UP_REQUIRED') {
        err.stepUp = { actionType: data.actionType, actionDigest: data.actionDigest, action: data.action };
      }
      throw err;
    }
    if (res.status === 401 && !isLoginCall && !isSessionCall) {
      clearAccessToken();
      localStorage.removeItem('biz_user');
      if (window.location.pathname !== '/') window.location.replace('/');
      const err = new Error('Session expired');
      err.statusCode = 401;
      if (data.code) err.code = data.code;
      throw err;
    }
    const err = new Error(msg);
    // Preserve the server error contract for every non-2xx response. Callers
    // use statusCode/code for optimistic-concurrency conflicts and other typed
    // recovery paths; dropping them turns recoverable server responses into
    // generic failures.
    err.statusCode = res.status;
    if (data.code) err.code = data.code;
    // A 403 from the permission authority proves the cached permission view
    // is stale (revoked role/permission, suspended employment). Invalidate
    // the client cache so usePermission refetches the real server set —
    // server-refusal-driven convergence, not speculative client policy.
    if (res.status === 403) invalidatePermissionCache();
    if (res.status === 402) {
      err.violations = data.violations; err.tier = data.tier; err.stakedBalance = data.stakedBalance;
    }
    throw err;
  }
  return data;
}
