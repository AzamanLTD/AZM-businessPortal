// src/hooks/usePermission.js
// =============================================================================
// AZM Business Portal — Permission Hook
//
// Resolves the current user's effective permission set for the active
// business — a CACHE of the backend contract, never an authority. The
// backend's requirePermission() remains the sole enforcement point; this hook
// only mirrors it so the UI can honestly reflect what the server allows.
//
//   • Owners and admins hold ['*'] (authority derives from ownership/admin).
//   • Employees get the backend-resolved effectivePermissions from
//     /api/business-os/employees/me — the exact set requirePermission()
//     enforces (stored-set authoritative; r26/P0-6).
//   • status: 'resolved' (the set is known, possibly empty) or
//     'unavailable' (permission info could not be fetched — network/5xx).
//     Consumers must treat 'unavailable' as UNKNOWN, never as a refusal:
//     render normally and let the server refuse what it must.
//   • The cache is invalidated by any server 403 (see permissionCache.js) and
//     on window focus, so a mid-session role downgrade converges the UI back
//     to the server's truth instead of advertising revoked capabilities
//     indefinitely.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { request } from '@/lib/api';
import {
  getCachedPermissions,
  setCachedPermissions,
  invalidatePermissionCache,
  onPermissionsInvalidated,
} from '@/lib/permissionCache';

// A few older business-portal consumers used the pre-template dine-in names.
// Keep those call sites compatible while the backend enforces the canonical
// permission key from permissionTemplates.js.
const PERMISSION_ALIASES = {
  'dinein.manage': 'restaurant.dinein.manage',
  'dinein.view': 'restaurant.dinein.manage',
};

export function usePermission() {
  // Tests and partial providers may render without an AuthContext; a null
  // context is an unknown identity, not a crash.
  const { bizProfile, user, isAdmin } = useAuth() || {};
  const [permissions, setPermissions] = useState([]);
  const [status, setStatus] = useState('unresolved');
  const bizId = bizProfile?.id;
  // Bump to refetch (403-driven invalidation, window focus).
  const [refreshTick, setRefreshTick] = useState(0);
  const ownerLike = Boolean(
    (isAdmin) ||
    (bizProfile && user && bizProfile.userId === user.id)
  );

  // Server-refusal convergence: a 403 anywhere invalidates the cache and
  // forces a refetch of the authoritative permission set.
  useEffect(() => {
    const bump = () => setRefreshTick(t => t + 1);
    return onPermissionsInvalidated(bump);
  }, []);

  useEffect(() => {
    if (isAdmin || (bizProfile && user && bizProfile.userId === user.id)) {
      setPermissions(['*']);
      setStatus('resolved');
      setCachedPermissions(bizId, ['*']);
      return;
    }

    if (!user?.id) {
      setPermissions([]);
      setStatus('unresolved');
      return;
    }

    // Employees do NOT own a BusinessProfile — GET /api/business/me 404s for
    // them, so bizProfile (and bizId) is null on the employee path.
    // /api/business-os/employees/me is built precisely for that (the worker
    // surface resolves the business by employment, no profile needed), so we
    // must NOT gate the fetch on having a bizId. Cache by user when the
    // business id is unknown.
    const cacheKey = bizId || `user:${user.id}`;

    let cancelled = false;
    (async () => {
      // Serve the cached set instantly (if any), then refetch when forced by
      // a refresh tick; the cache is a UX accelerator, not an authority.
      const cached = getCachedPermissions(cacheKey);
      if (cached) {
        if (!cancelled) { setPermissions(cached); setStatus('resolved'); }
        if (refreshTick === 0) return;
      }
      try {
        const data = await request('/api/business-os/employees/me');
        if (cancelled) return;
        if (!data?.employee) {
          // Definitive server answer: this account is not an active employee
          // of any business → no permissions.
          setPermissions([]);
          setStatus('resolved');
          setCachedPermissions(cacheKey, []);
          return;
        }
        const emp = data.employee;
        // r26/P0-6: the backend returns effectivePermissions — the exact
        // set requirePermission() enforces. Prefer it; fall back to the
        // stored set only for older backend builds.
        const effective = emp.effectivePermissions || emp.permissions || [];
        const perms = effective.includes('*') || emp.role === 'OWNER'
          ? ['*']
          : effective;
        if (!cancelled) {
          setPermissions(perms);
          setStatus('resolved');
          setCachedPermissions(cacheKey, perms);
        }
      } catch (err) {
        // UNKNOWN, not "no permissions": a failed fetch must never be
        // presented as a server refusal. Consumers read status to avoid
        // locking operators out of surfaces the server may still allow.
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => { cancelled = true; };
  }, [bizId, user?.id, isAdmin, bizProfile?.userId, refreshTick]);

  // Window focus: cheap convergence for role changes that happened while the
  // portal was backgrounded. The server remains the authority either way.
  useEffect(() => {
    const onFocus = () => setRefreshTick(t => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const hasPermission = useCallback((key) => {
    if (!key) return true;
    if (permissions.includes('*')) return true;
    const canonicalKey = PERMISSION_ALIASES[key] || key;
    return permissions.includes(canonicalKey);
  }, [permissions]);

  return { hasPermission, permissions, status, isOwner: ownerLike };
}

export function useCan(key) {
  const { hasPermission } = usePermission();
  return hasPermission(key);
}

export { invalidatePermissionCache };
