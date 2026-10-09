// src/lib/adminContract.js
// =============================================================================
// Admin business-context contract map — which portal routes the server contract
// actually supports while an ADMIN is scoped to a business via
// x-admin-business-id.
//
// Verified against the backend (read-only, no backend change in this PR):
//   • /api/business-os/*  — requirePermission resolves
//     req.adminBusinessScope (middleware/adminBusinessScope.js) and grants
//     impersonating admins resolvedPermissions ['*']  → FULL admin support.
//   • /api/dine-in/*      — dineInController honors req.adminBusinessScope.
//   • /api/direct-messages/* — businessDirectMessageRoutes honors adminScope.
//   • /api/storefront/me/*  — requirePermission('storefront.manage') → supported.
//   • /api/admin/marketplace-businesses* — admin-only listing/detail.
//   • EVERYTHING ELSE resolves the business from the CALLER'S OWN identity
//     (ownership/employment): /api/business/*, /api/marketplace/*,
//     /api/reservations/*, /api/escrow/*, /api/ad-posts/*, /api/showcases/*,
//     /api/follows/*, /api/marketplace-seat-map/*, /api/payout-destinations/*,
//     /api/storefront/:businessProfileId/* (public render paths excepted).
//     For a scoped admin these fail closed (403/empty-of-the-admin's-own) —
//     they are OWNER-ONLY surfaces and must be refused honestly in admin view,
//     never presented as fake empty success.
//
// Levels:
//   'supported'  — every data call on the route is admin-capable.
//   'mixed'      — the page mixes admin-capable and owner-only surfaces; the
//                  gate renders an honest limitation banner naming the
//                  owner-only surfaces, and the page still renders its
//                  admin-capable parts.
//   'owner-only' — no admin-capable data; the gate refuses the whole route
//                  with an honest explanation.
//   'mock-only'  — the page has no live backend at all (client-side state
//                  only); it must stay mock-only until the separate backend
//                  security task lands.
// =============================================================================

export const ADMIN_ROUTE_CONTRACT = {
  // ── Fully supported (Business OS / dine-in / direct messages / storefront) ──
  '/admin-marketplace': { level: 'supported' }, // the admin landing surface itself
  '/seat-map': { level: 'supported' },          // pure redirect to /transit — renders no data
  '/messages': { level: 'supported' },
  '/dine-in': { level: 'supported' },
  '/groups': { level: 'supported' },
  '/employees': { level: 'supported' },
  '/scheduling': { level: 'supported' },
  '/payroll': { level: 'supported' },
  '/time-off': { level: 'supported' },
  '/settings/messaging': { level: 'supported' },
  '/hotel-rooms': { level: 'supported' },
  '/hotel-housekeeping': { level: 'supported' },
  '/guests': { level: 'supported' },
  '/storefront': { level: 'supported' },
  '/storefront/analytics': { level: 'supported' },

  // ── Mixed (admin-capable + owner-only surfaces on the same page) ────────────
  '/': {
    level: 'mixed',
    ownerOnly: ['legacy order feed', 'invoice stats', 'reservation stats', 'check-in stats', 'review stats', 'trip list'],
  },
  '/analytics': {
    level: 'mixed',
    ownerOnly: ['order history feed'],
  },
  '/finance': {
    level: 'mixed',
    ownerOnly: ['payout destinations'],
  },
  '/finance/pnl': { level: 'mixed', ownerOnly: ['payout destinations'] },
  '/finance/expenses': { level: 'mixed', ownerOnly: ['payout destinations'] },
  '/finance/payouts': { level: 'mixed', ownerOnly: ['payout destinations'] },
  '/finance/disputes': { level: 'mixed', ownerOnly: ['payout destinations'] },
  '/transit-fleet': { level: 'mixed', ownerOnly: ['legacy trip list'] },
  '/transit-drivers': { level: 'mixed', ownerOnly: ['legacy trip list'] },
  '/transit-manifests': { level: 'mixed', ownerOnly: ['legacy trip list'] },
  '/transit-cargo': { level: 'mixed', ownerOnly: ['legacy trips', 'seat maps'] },
  '/transit': { level: 'mixed', ownerOnly: ['legacy trips', 'seat maps'] },
  '/restaurant-kitchen': { level: 'mixed', ownerOnly: ['menu catalog'] },
  '/restaurant-inventory': { level: 'mixed', ownerOnly: ['menu catalog', 'product catalog'] },
  '/restaurant-tables': { level: 'mixed', ownerOnly: ['locations', 'tables'] },
  '/retail-inventory': { level: 'mixed', ownerOnly: ['product catalog'] },
  '/pos': { level: 'mixed', ownerOnly: ['product catalog'] },
  '/orders': { level: 'mixed', ownerOnly: ['legacy order feed'] },
  '/orders/:id': { level: 'mixed', ownerOnly: ['legacy order feed'] },
  '/invoices': { level: 'mixed', ownerOnly: ['legacy invoice feed', 'customer lookup', 'locations'] },
  '/products': { level: 'mixed', ownerOnly: ['product catalog', 'locations'] },
  '/reservations': { level: 'mixed', ownerOnly: ['locations', 'tables'] },
  '/marketing': { level: 'mixed', ownerOnly: ['ads', 'followers', 'business profile'] },
  '/marketing/web-ordering': { level: 'mixed', ownerOnly: ['business profile'] },
  '/storefront/experience': { level: 'mixed', ownerOnly: ['product catalog', 'legacy trips'] },
  '/hotel-front-desk': { level: 'mixed', ownerOnly: ['legacy reservation mutations'] },

  // ── Owner-only (no admin-capable data; refuse the route) ───────────────────
  '/checkin': { level: 'owner-only' },
  '/notifications': { level: 'owner-only' },
  '/settings': { level: 'owner-only' },
  '/showcase': { level: 'owner-only' },
  '/kyb': { level: 'owner-only' },
  '/locations': { level: 'owner-only' },
  '/reviews': { level: 'owner-only' },

  // ── Mock-only (no live backend; stays a preview until the separate
  //    backend security task for developer API keys/webhooks lands) ──────────
  '/settings/developer': { level: 'mock-only' },
};

// Explicit 'unverified' state: a route NOT in the map has never been checked
// against the actual backend admin contract. It FAILS CLOSED in admin view —
// never silently treated as 'supported' — with an explanation that the route
// is not yet certified for cross-business viewing.
export const UNVERIFIED_ROUTE_CONTRACT = Object.freeze({ level: 'unverified' });

/** Resolve the admin contract for a pathname against the map (supports
 *  '/orders/:id'-style params). Unknown/missing pathnames resolve to the
 *  explicit unverified state — the map is the record, and anything outside
 *  it must be certified before it renders in admin view. */
export function adminContractFor(pathname) {
  if (!pathname) return UNVERIFIED_ROUTE_CONTRACT;
  const exact = ADMIN_ROUTE_CONTRACT[pathname];
  if (exact) return exact;
  const segments = pathname.split('/').filter(Boolean);
  for (const [route, contract] of Object.entries(ADMIN_ROUTE_CONTRACT)) {
    const patSegs = route.split('/').filter(Boolean);
    if (patSegs.length !== segments.length) continue;
    const match = patSegs.every((s, i) => s.startsWith(':') || s === segments[i]);
    if (match) return contract;
  }
  return UNVERIFIED_ROUTE_CONTRACT;
}

/** True when the route can render ANY admin-capable business data. */
export function adminRouteRenderable(contract) {
  return contract?.level === 'supported' || contract?.level === 'mixed';
}
