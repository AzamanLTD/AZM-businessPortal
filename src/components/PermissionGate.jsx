// src/components/PermissionGate.jsx
// =============================================================================
// AZM Business Portal — Route-level honest refusal.
//
// Hiding a nav item is not authorization; the backend's requirePermission()
// is. This gate mirrors the server contract for a page whose backend surface
// enforces a known permission key (or is owner-only by design), so that a
// direct URL visit by an operator without the capability gets a CLEAR
// refusal instead of a page that half-renders against 403-ing queries.
//
// Honesty rules (this is UX mirroring, never enforcement):
//   • status !== 'resolved' (permissions unknown: fetch failed or still
//     loading) → render the page. The server refuses what it must; we never
//     invent a lockout the server did not express.
//   • ownerOnly → the backend surface resolves the business by ownership
//     (_ownedProfile); mirror exactly that, using the authenticated
//     ownership fact, not a role label.
//   • A resolved set without the key → honest refusal screen naming the
//     required capability. No fake "success", no partial UI.
// =============================================================================

import { Lock } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

export function AccessRefused({ area, required }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--f-line, var(--line, rgba(0,0,0,.06)))' }}>
        <Lock className="w-7 h-7 opacity-50" />
      </div>
      <h2 className="text-lg font-bold" style={{ color: 'var(--f-text, inherit)' }}>
        No access to {area}
      </h2>
      <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--f-text-3, inherit)' }}>
        Your account does not have the <strong>{required}</strong> permission the
        server requires for this area. Ask the business owner to grant it, or
        use the surfaces assigned to your role.
      </p>
      <p className="text-xs mt-4 max-w-md opacity-70" style={{ color: 'var(--f-text-3, inherit)' }}>
        This mirrors the server's own access rules — access can only be granted
        by the business owner from Team Access settings.
      </p>
    </div>
  );
}

export function PermissionGate({ permission, ownerOnly = false, area, children }) {
  const { hasPermission, status, isOwner } = usePermission();

  // Unknown permission state: render the page and let the server refuse.
  // A failed permissions fetch must never masquerade as a server refusal.
  if (status !== 'resolved') return children;

  if (ownerOnly) {
    return isOwner ? children : <AccessRefused area={area || 'this area'} required="business ownership" />;
  }
  if (permission && !hasPermission(permission)) {
    return <AccessRefused area={area || 'this area'} required={permission} />;
  }
  return children;
}

export default PermissionGate;
