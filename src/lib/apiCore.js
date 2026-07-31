/**
 * Shared request core for the business portal API layer.
 * Extracted from api.js so marketplaceApi.js can reuse the same auth logic.
 */

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');

export async function request(path, options = {}) {
  const token = localStorage.getItem('biz_token');
  const adminBizId = localStorage.getItem('admin_selected_biz');
  const isLoginCall = path.startsWith('/api/auth/login');

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminBizId ? { 'x-admin-business-id': adminBizId } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    const msg = data.message || data.error || 'Request failed';
    if (res.status === 401 && !isLoginCall) {
      localStorage.removeItem('biz_token');
      localStorage.removeItem('biz_user');
      if (window.location.pathname !== '/') window.location.replace('/');
      throw new Error('Session expired');
    }
    // Pass through structured error data (e.g., 402 Nitro eligibility violations)
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
