/**
 * Azaman Business Portal — API layer
 * All calls go to VITE_API_URL (defaults to http://localhost:3000).
 * The JWT is stored in localStorage under 'biz_token'.
 */

import { request } from './apiCore';
export { request };

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  // POST /api/auth/login — returns { success, token, accessToken, user }
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

// ── Business Profile ──────────────────────────────────────────────────────────
export const business = {
  me:       ()      => request('/api/business/me'),
  register: (data)  => request('/api/business/register', { method: 'POST', body: JSON.stringify(data) }),
  update:   (data)  => request('/api/business/profile',  { method: 'PATCH', body: JSON.stringify(data) }),
  // Public storefront lookup (no auth required) — used by the profile preview.
  getPublic:(bizId) => request(`/api/business/${bizId}`),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const products = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business/products${qs ? `?${qs}` : ''}`);
  },
  get:    (id)   => request(`/api/business/products/${id}`),
  create: (data) => request('/api/business/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/business/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)   => request(`/api/business/products/${id}`, { method: 'DELETE' }),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = {
  list:         (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business/orders${qs ? `?${qs}` : ''}`);
  },
  stats:        ()      => request('/api/business/orders/stats'),
  get:          (id)    => request(`/api/business/orders/${id}`),
  markDelivered:(id, deliveryNotes) =>
    request(`/api/business/orders/${id}/delivered`, { method: 'PATCH', body: JSON.stringify({ deliveryNotes }) }),
};

// ── Notifications ───────────────────────────────────────────────────────────────
export const notifications = {
  list:        (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business/notifications${qs ? `?${qs}` : ''}`);
  },
  unreadCount: ()   => request('/api/business/notifications/unread-count'),
  markRead:    (id) => request(`/api/business/notifications/read/${id}`, { method: 'POST' }),
  markAllRead: ()   => request('/api/business/notifications/read-all', { method: 'POST' }),
};

// ── Escrow ──────────────────────────────────────────────────────────────────────
// The business owner is the escrow payee and a participant on the linked ticket,
// so these protected endpoints authorize them. `getForTicket` may 404 when a
// ticket has no escrow — callers must handle that gracefully.
export const escrow = {
  getForTicket: (ticketId)        => request(`/api/escrow/ticket/${ticketId}`),
  satisfy:      (escrowId)        => request('/api/escrow/satisfy', { method: 'POST', body: JSON.stringify({ escrowId }) }),
  dispute:      (escrowId, reason) => request('/api/escrow/dispute', { method: 'POST', body: JSON.stringify({ escrowId, reason }) }),
};

// ── Analytics ───────────────────────────────────────────────────────────────────
// The stats endpoint returns aggregate counts; the revenue trend is computed
// client-side from the orders list (see Dashboard).
export const analytics = {
  summary: () => request('/api/business/orders/stats'),
  predictive: () => request('/api/business-os/analytics/predictive'),
};

// ── Locations ─────────────────────────────────────────────────────────────────
export const locations = {
  list:         ()           => request('/api/business/locations'),
  create:       (data)       => request('/api/business/locations', { method: 'POST', body: JSON.stringify(data) }),
  update:       (id, data)   => request(`/api/business/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove:       (id)         => request(`/api/business/locations/${id}`, { method: 'DELETE' }),
  getPublic:    (bizId)      => request(`/api/business/${bizId}/locations`),
  searchNearby: (params)     => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/search/nearby?${qs}`); },
  createTable:  (locId, lbl) => request(`/api/business/locations/${locId}/tables`, { method: 'POST', body: JSON.stringify({ label: lbl }) }),
  listTables:   (locId)      => request(`/api/business/locations/${locId}/tables`),
  deleteTable:  (tableId)    => request(`/api/business/tables/${tableId}`, { method: 'DELETE' }),
};

// ── Invoices (business-owner side) ────────────────────────────────────────────
export const invoices = {
  list:         (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/invoices${qs ? '?' + qs : ''}`); },
  get:          (id)          => request(`/api/business/invoices/${id}`),
  create:       (data)        => request('/api/business/invoices', { method: 'POST', body: JSON.stringify(data) }),
  send:         (id)          => request(`/api/business/invoices/${id}/send`, { method: 'POST' }),
  email:        (id, email)   => request(`/api/business/invoices/${id}/email`, { method: 'POST', body: JSON.stringify({ email }) }),
  void:         (id)          => request(`/api/business/invoices/${id}/void`, { method: 'POST' }),
  lookupCustomer: (azamanId)  => request(`/api/business/customers/lookup?azamanId=${encodeURIComponent(azamanId)}`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviews = {
  list: (bizId, params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/api/business/${bizId}/reviews${qs ? '?' + qs : ''}`); },
};

// ── KYB ───────────────────────────────────────────────────────────────────────
export const kyb = {
  status: () => request('/api/business/kyb/status'),
  submit: (documents) =>
    request('/api/business/kyb/submit', { method: 'POST', body: JSON.stringify({ documents }) }),
};

// ── Business OS (Governance, Workforce, Operations) ──────────────────────────
// All endpoints are mounted under /api/business-os/
export const businessOS = {
  // Permission Templates
  getPermissionTemplates: () => request('/api/business-os/permission-templates'),
  savePermissionTemplate: (data) =>
    request('/api/business-os/permission-templates', { method: 'POST', body: JSON.stringify(data) }),

  // Audit Log
  getAuditLog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/audit-log${qs ? `?${qs}` : ''}`);
  },

  // Notification Preferences
  getNotificationPrefs: () => request('/api/business-os/notification-preferences'),
  updateNotificationPrefs: (preferences) =>
    request('/api/business-os/notification-preferences', { method: 'PATCH', body: JSON.stringify({ preferences }) }),

  // Location Hours Exceptions
  getHoursExceptions: (locationId) => request(`/api/business-os/locations/${locationId}/hours-exceptions`),
  addHoursException: (locationId, data) =>
    request(`/api/business-os/locations/${locationId}/hours-exceptions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteHoursException: (locationId, exceptionId) =>
    request(`/api/business-os/locations/${locationId}/hours-exceptions/${exceptionId}`, { method: 'DELETE' }),

  // Business Pause
  togglePause: (paused) =>
    request('/api/business-os/pause', { method: 'PATCH', body: JSON.stringify({ paused }) }),
};

// ── Employees (Business OS) ──────────────────────────────────────────────────
export const businessOSEmployees = {
  me:         ()    => request('/api/business-os/employees/me'),
  list:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/business-os/employees${qs ? `?${qs}` : ''}`);
  },
  create:     (data) => request('/api/business-os/employees', { method: 'POST', body: JSON.stringify(data) }),
  update:     (id, data) => request(`/api/business-os/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove:     (id) => request(`/api/business-os/employees/${id}`, { method: 'DELETE' }),
  setPermissions: (id, permissions) =>
    request(`/api/business-os/employees/${id}/permissions`, { method: 'POST', body: JSON.stringify({ permissions }) }),
};
