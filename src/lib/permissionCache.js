// src/lib/permissionCache.js
// =============================================================================
// AZM Business Portal — Permission Cache
//
// The portal's permission state is a CACHE of the backend's authoritative
// effectivePermissions, never an authority of its own. This module keeps the
// per-business cache and the invalidation signal that keeps it honest:
//
//   • A server 403 is definitive proof the cached view is wrong (revoked
//     role/permission, suspended employment). apiCore invalidates here on
//     every 403 so usePermission refetches the real set from the server.
//   • Anyone (AuthContext logout, employee mutation, tests) can force a
//     refetch by calling invalidatePermissionCache().
//
// Backends stay authoritative: hiding or showing an action from this cache
// is UX only — every mutation is still enforced server-side by
// requirePermission() in AZM-backend.
// =============================================================================

const INVALIDATION_EVENT = 'azm:permissions-invalidated';

let _cache = { bizId: null, perms: null };

export function getCachedPermissions(bizId) {
  if (_cache.bizId === bizId) return _cache.perms;
  return null;
}

export function setCachedPermissions(bizId, perms) {
  _cache = { bizId, perms: Array.isArray(perms) ? perms : null };
}

export function invalidatePermissionCache() {
  _cache = { bizId: null, perms: null };
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(INVALIDATION_EVENT));
  }
}

export function onPermissionsInvalidated(handler) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  window.addEventListener(INVALIDATION_EVENT, handler);
  return () => window.removeEventListener(INVALIDATION_EVENT, handler);
}
