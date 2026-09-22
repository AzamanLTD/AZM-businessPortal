// src/hooks/usePermission.js
// =============================================================================
// AZM Business Portal — Permission Hook
//
// Resolves the current user's effective permission set for the active
// business. Owners and admins always have all permissions. Employees get
// their resolved permissions from their BusinessEmployee record.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { request } from '@/lib/api';

// Cache resolved permissions per business to avoid re-fetching on every render
let _permCache = { bizId: null, perms: [] };

// A few older business-portal consumers used the pre-template dine-in names.
// Keep those call sites compatible while the backend enforces the canonical
// permission key from permissionTemplates.js.
const PERMISSION_ALIASES = {
  'dinein.manage': 'restaurant.dinein.manage',
  'dinein.view': 'restaurant.dinein.manage',
};

export function usePermission() {
  const { bizProfile, user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState([]);

  const bizId = bizProfile?.id;

  useEffect(() => {
    if (isAdmin) {
      setPermissions(['*']);
      _permCache = { bizId, perms: ['*'] };
      return;
    }

    if (bizProfile && user && bizProfile.userId === user.id) {
      setPermissions(['*']);
      _permCache = { bizId, perms: ['*'] };
      return;
    }

    if (!bizId || !user?.id) {
      setPermissions([]);
      return;
    }

    if (_permCache.bizId === bizId) {
      setPermissions(_permCache.perms);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await request('/api/business-os/employees/me');
        if (cancelled) return;

        if (!data?.employee) {
          setPermissions([]);
          return;
        }

        const emp = data.employee;
        const perms = emp.permissions?.includes('*') || emp.role === 'OWNER'
          ? ['*']
          : (emp.permissions || []);

        if (!cancelled) {
          setPermissions(perms);
          _permCache = { bizId, perms };
        }
      } catch (err) {
        if (!cancelled) setPermissions([]);
      }
    })();

    return () => { cancelled = true; };
  }, [bizId, user?.id, isAdmin, bizProfile?.userId]);

  const hasPermission = useCallback((key) => {
    if (!key) return true;
    if (permissions.includes('*')) return true;
    const canonicalKey = PERMISSION_ALIASES[key] || key;
    return permissions.includes(canonicalKey);
  }, [permissions]);

  return { hasPermission, permissions };
}

export function useCan(key) {
  const { hasPermission } = usePermission();
  return hasPermission(key);
}
