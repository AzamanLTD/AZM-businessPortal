/**
 * Azaman Business Portal — API layer.
 * Access JWTs are held in memory by apiCore; refresh tokens are kept in an
 * HttpOnly backend cookie after business-session bootstrap.
 */

import { request, restoreBusinessSession, logoutBusinessSession, setAccessToken } from './apiCore';
export { request };

export const auth = {
  login: async (email, password) => {
    const session = await request('/api/auth/business-session/login', {
      method: 'POST',
      headers: { 'x-auth-client': 'business-portal' },
      body: JSON.stringify({ email, password }),
    });
    if (!session.accessToken) throw new Error('Login failed — server did not return an access session.');
    setAccessToken(session.accessToken);
    return session;
  },
  restore: restoreBusinessSession,
  logout: logoutBusinessSession,
};

// ── Business Profile ──────────────────────────────────────────────────────────
export const business = {
  me:       ()      => request('/api/business/me'),
  register: (data)  => request('/api/business/register', { method: 'POST', body: JSON.stringify(data) }),
  update:   (data)  => request('/api/business/profile',  { method: 'PATCH', body: JSON.stringify(data) }),
  getPublic:(bizId) => request(`/api/business/${bizId}`),
};

export const products = {
  list:   (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/products${qs ? `?${qs}` : ''}`); },
  get:    (id)   => request(`/api/business/products/${id}`),
  create: (data) => request('/api/business/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)   => request(`/api/business/products/${id}`, { method: 'DELETE' }),
};

export const orders = {
  list:         (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/orders${qs ? `?${qs}` : ''}`); },
  stats:        ()      => request('/api/business/orders/stats'),
  get:          (id)    => request(`/api/business/orders/${id}`),
  markDelivered:(id, deliveryNotes) => request(`/api/business/orders/${id}/delivered`, { method: 'PATCH', body: JSON.stringify({ deliveryNotes }) }),
};

export const notifications = {
  list:        (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/notifications${qs ? `?${qs}` : ''}`); },
  unreadCount: ()   => request('/api/business/notifications/unread-count'),
  markRead:    (id) => request(`/api/business/notifications/read/${id}`, { method: 'POST' }),
  markAllRead: ()   => request('/api/business/notifications/read-all', { method: 'POST' }),
};

export const escrow = {
  getForTicket: (ticketId) => request(`/api/escrow/ticket/${ticketId}`),
  satisfy: (escrowId) => request('/api/escrow/satisfy', { method: 'POST', body: JSON.stringify({ escrowId }) }),
  dispute: (escrowId, reason) => request('/api/escrow/dispute', { method: 'POST', body: JSON.stringify({ escrowId, reason }) }),
};

export const analytics = {
  summary: () => request('/api/business/orders/stats'),
  predictive: () => request('/api/business-os/analytics/predictive'),
};

export const locations = {
  list: () => request('/api/business/locations'),
  create: (data) => request('/api/business/locations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/business/locations/${id}`, { method: 'DELETE' }),
  getPublic: (bizId) => request(`/api/business/${bizId}/locations`),
  searchNearby: (params) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/search/nearby?${qs}`); },
  createTable: (locId, lbl) => request(`/api/business/locations/${locId}/tables`, { method: 'POST', body: JSON.stringify({ label: lbl }) }),
  listTables: (locId) => request(`/api/business/locations/${locId}/tables`),
  deleteTable: (tableId) => request(`/api/business/tables/${tableId}`, { method: 'DELETE' }),
};

export const invoices = {
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/invoices${qs ? '?' + qs : ''}`); },
  get: (id) => request(`/api/business/invoices/${id}`),
  create: (data) => request('/api/business/invoices', { method: 'POST', body: JSON.stringify(data) }),
  send: (id) => request(`/api/business/invoices/${id}/send`, { method: 'POST' }),
  email: (id, email) => request(`/api/business/invoices/${id}/email`, { method: 'POST', body: JSON.stringify({ email }) }),
  void: (id) => request(`/api/business/invoices/${id}/void`, { method: 'POST' }),
  lookupCustomer: (azamanId) => request(`/api/business/customers/lookup?azamanId=${encodeURIComponent(azamanId)}`),
};

export const reviews = { list: (bizId, params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/${bizId}/reviews${qs ? '?' + qs : ''}`); } };

export const kyb = {
  status: () => request('/api/business/kyb/status'),
  submit: (documents) => request('/api/business/kyb/submit', { method: 'POST', body: JSON.stringify({ documents }) }),
};

export const businessOS = {
  getPermissionTemplates: () => request('/api/business-os/permission-templates'),
  savePermissionTemplate: (data) => request('/api/business-os/permission-templates', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLog: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business-os/audit-log${qs ? `?${qs}` : ''}`); },
  getNotificationPrefs: () => request('/api/business-os/notification-preferences'),
  updateNotificationPrefs: (preferences) => request('/api/business-os/notification-preferences', { method: 'PATCH', body: JSON.stringify({ preferences }) }),
  getHoursExceptions: (locationId) => request(`/api/business-os/locations/${locationId}/hours-exceptions`),
  addHoursException: (locationId, data) => request(`/api/business-os/locations/${locationId}/hours-exceptions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteHoursException: (locationId, exceptionId) => request(`/api/business-os/locations/${locationId}/hours-exceptions/${exceptionId}`, { method: 'DELETE' }),
  togglePause: (paused) => request('/api/business-os/pause', { method: 'PATCH', body: JSON.stringify({ paused }) }),
};

export const businessOSEmployees = {
  me: () => request('/api/business-os/employees/me'),
  list: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business-os/employees${qs ? `?${qs}` : ''}`); },
  create: (data) => request('/api/business-os/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business-os/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/business-os/employees/${id}`, { method: 'DELETE' }),
  setPermissions: (id, permissions) => request(`/api/business-os/employees/${id}/permissions`, { method: 'POST', body: JSON.stringify({ permissions }) }),
};
