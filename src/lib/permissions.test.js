// src/lib/permissions.test.js
// =============================================================================
// Permissions & Role Integrity — regression suite for the
// fix/permissions-role-integrity pass.
//
// Contracts covered:
//   1. Every permission key the portal uses (route gates, nav items) is a
//      REAL key in the AZM-backend catalog (config/permissionTemplates.js).
//      The P1 defect class of this audit was invented keys the backend never
//      issues (orders.create, inventory.manage, kitchen.*, tables.*,
//      team.manage, products.manage) which over-hid actions the server would
//      have allowed.
//   2. apiCore invalidates the permission cache on any 403 — the
//      server-refusal-driven convergence that keeps a mid-session role
//      downgrade from advertising revoked capabilities indefinitely.
//   3. permissionCache set/get/invalidate + invalidation event.
//   4. gateFor longest-prefix matching (nested routes inherit the parent
//      backend contract).
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';

// The canonical catalog from AZM-backend config/permissionTemplates.js
// (current main). This is the authority: if a portal key is not in here, the
// backend can never grant it and gating on it over-hides a real capability.
const BACKEND_CATALOG = [
  'analytics.view', 'audit.view', 'employees.create', 'employees.permissions',
  'employees.terminate', 'employees.update', 'employees.view', 'ewa.approve',
  'ewa.manage', 'feedback.give', 'feedback.view', 'finance.export',
  'finance.ledger.manage', 'finance.payouts.manage', 'finance.view',
  'followers.broadcast', 'hotel.front_desk.manage', 'hotel.guests.view',
  'hotel.housekeeping.inspect', 'hotel.housekeeping.manage', 'hotel.rates.manage',
  'hotel.rooms.manage', 'hotel.rooms.view', 'invoices.manage', 'invoices.view',
  'invoices.void', 'locations.manage', 'marketing.promotions.manage',
  'marketing.publish', 'marketing.view', 'notifications.view', 'orders.manage',
  'orders.refund', 'orders.view', 'payroll.disburse', 'payroll.process',
  'payroll.view', 'reservations.manage', 'reservations.override_price',
  'reservations.view', 'restaurant.dinein.manage', 'restaurant.inventory.manage',
  'restaurant.inventory.view', 'restaurant.kitchen.manage',
  'restaurant.kitchen.view', 'restaurant.menu.manage', 'restaurant.menu.view',
  'restaurant.tables.manage', 'retail.manage', 'retail.view', 'reviews.respond',
  'reviews.view', 'settings.manage', 'shifts.approve_swap',
  'shifts.approve_timeoff', 'shifts.create', 'shifts.delete', 'shifts.publish',
  'shifts.update', 'shifts.view', 'showcase.manage', 'storefront.manage',
  'team_access.manage', 'transit.cargo.manage', 'transit.cargo.view',
  'transit.drivers.manage', 'transit.fleet.manage', 'transit.fleet.view',
  'transit.maintenance.manage', 'transit.manifests.manage',
  'transit.manifests.view', 'transit.trips.manage', 'transit.trips.view',
];

const { disconnectSocket, updateSocketToken } = vi.hoisted(() => ({
  disconnectSocket: vi.fn(),
  updateSocketToken: vi.fn(),
}));

vi.mock('./socket', () => ({
  disconnectSocket,
  updateSocketToken,
  getSocket: () => null,
  on: () => {},
  off: () => {},
  emit: () => {},
}));

import { ROUTE_GATES, gateFor } from '@/App';
import { DOMAINS } from './nav';
import {
  getCachedPermissions,
  setCachedPermissions,
  invalidatePermissionCache,
  onPermissionsInvalidated,
} from './permissionCache';

describe('route gates mirror the backend permission catalog', () => {
  it('every gated permission key is a real backend key', () => {
    const unknown = ROUTE_GATES
      .filter(g => g.permission)
      .filter(g => !BACKEND_CATALOG.includes(g.permission));
    expect(unknown).toEqual([]);
  });

  it('covers every nav route that the nav gates by permission', () => {
    const navPaths = [];
    const walk = n => {
      if (n && Array.isArray(n.items)) n.items.forEach(i => { if (i.to) navPaths.push(i); });
    };
    DOMAINS.forEach(d => (d.groups || []).forEach(g => walk(g)));

    // Every nav item that carries a perm or ownerOnly flag must have a
    // matching route gate (so direct URL access gets the same refusal as the
    // hidden nav item would have given).
    const gatedNavItems = navPaths.filter(i => i.perm || i.ownerOnly);
    expect(gatedNavItems.length).toBeGreaterThan(20);
    for (const item of gatedNavItems) {
      const gate = gateFor(item.to);
      expect(gate, `no route gate for gated nav item ${item.to}`).not.toBeNull();
      if (item.ownerOnly) expect(gate.ownerOnly, `${item.to} nav says ownerOnly but route does not`).toBe(true);
      if (item.perm) expect(gate.permission, `${item.to} nav perm must match route gate`).toBe(item.perm);
    }
  });

  it('every nav perm key is a real backend key', () => {
    const perms = [];
    DOMAINS.forEach(d => (d.groups || []).forEach(g =>
      (g.items || []).forEach(i => { if (i.perm) perms.push(i.perm); })));
    const unknown = perms.filter(p => !BACKEND_CATALOG.includes(p));
    expect(unknown).toEqual([]);
  });

  it('gateFor uses longest-prefix matching for nested routes', () => {
    expect(gateFor('/finance').permission).toBe('finance.view');
    expect(gateFor('/finance/payouts').permission).toBe('finance.view');
    expect(gateFor('/orders/:id').ownerOnly).toBe(true);
    expect(gateFor('/storefront/experience').ownerOnly).toBe(true);
    expect(gateFor('/restaurant-inventory').permission).toBe('restaurant.inventory.view');
    // Ungated surfaces stay ungated — we mirror the backend, nothing else.
    expect(gateFor('/')).toBeNull();
    expect(gateFor('/settings')).toBeNull();
    expect(gateFor('/notifications')).toBeNull();
    expect(gateFor('/messages')).toBeNull();
  });

  it('gates the settings messaging and developer surfaces on settings.manage', () => {
    // Backend contract: every messaging-config mutation requires
    // settings.manage; the developer surface mirrors the same key as UX
    // until the backend security fix lands (its API only enforces auth).
    for (const p of ['/settings/messaging', '/settings/developer']) {
      const gate = gateFor(p);
      expect(gate, `${p} must have a route gate`).not.toBeNull();
      expect(gate.permission, `${p} must gate on settings.manage`).toBe('settings.manage');
      expect(gate.ownerOnly, `${p} is permission-gated, not owner-only`).toBeUndefined();
    }
  });

  it('direct URL access and nav visibility agree for the settings surfaces', () => {
    const navPaths = [];
    const walk = n => { if (n && Array.isArray(n.items)) n.items.forEach(i => { if (i.to) navPaths.push(i); }); };
    DOMAINS.forEach(d => (d.groups || []).forEach(g => walk(g)));
    for (const p of ['/settings/messaging', '/settings/developer']) {
      const item = navPaths.find(i => i.to === p);
      expect(item, `${p} must be in the nav`).toBeDefined();
      const gate = gateFor(p);
      // Consistency: the nav hides exactly what the route gate refuses.
      expect(item.perm, `${p} nav perm must equal route gate`).toBe(gate.permission);
      expect(item.ownerOnly).toBeUndefined();
    }
    // Both surfaces resolve for /settings/:id-style nested access the same way.
    expect(gateFor('/settings/messaging/history').permission).toBe('settings.manage');
  });

  it('never gates on the pre-fix invented keys', () => {
    const invented = ['orders.create', 'inventory.manage', 'inventory.view',
      'kitchen.view', 'kitchen.manage', 'tables.manage', 'tables.view',
      'team.manage', 'products.manage'];
    const used = ROUTE_GATES.map(g => g.permission).filter(Boolean)
      .concat(DOMAINS.flatMap(d => (d.groups || []).flatMap(g => (g.items || []).map(i => i.perm).filter(Boolean))));
    for (const bad of invented) {
      expect(used, `invented key ${bad} resurrected`).not.toContain(bad);
    }
  });
});

describe('permissionCache', () => {
  beforeEach(() => {
    invalidatePermissionCache();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('stores and returns a per-business set', () => {
    setCachedPermissions('biz-1', ['orders.manage']);
    expect(getCachedPermissions('biz-1')).toEqual(['orders.manage']);
    // Another business has no cached set yet.
    expect(getCachedPermissions('biz-2')).toBeNull();
  });

  it('invalidatePermissionCache clears the cache and emits the event', () => {
    setCachedPermissions('biz-1', ['orders.manage']);
    let fired = 0;
    const off = onPermissionsInvalidated(() => { fired += 1; });
    invalidatePermissionCache();
    expect(getCachedPermissions('biz-1')).toBeNull();
    expect(fired).toBe(1);
    off();
    invalidatePermissionCache();
    expect(fired).toBe(1); // listener removed
  });

  it('a server 403 invalidates the cached permission view', async () => {
    const { request } = await import('./apiCore');
    setCachedPermissions('biz-1', ['finance.view', 'orders.refund']);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ message: 'Insufficient permissions' }),
    }));

    let fired = 0;
    const off = onPermissionsInvalidated(() => { fired += 1; });

    await expect(request('/api/business-os/orders/o1/refund', { method: 'POST' }))
      .rejects.toThrow('Insufficient permissions');

    // The stale cached set is proven wrong by the server's own refusal.
    expect(getCachedPermissions('biz-1')).toBeNull();
    expect(fired).toBe(1);
    off();
  });

  it('a non-permission failure (500) does NOT invalidate the cache', async () => {
    const { request } = await import('./apiCore');
    setCachedPermissions('biz-1', ['finance.view']);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server error',
      json: async () => ({ message: 'boom' }),
    }));

    await expect(request('/api/business-os/finance/summary')).rejects.toThrow('boom');
    expect(getCachedPermissions('biz-1')).toEqual(['finance.view']);
  });
});
