// src/components/AdminContractGate.jsx
// =============================================================================
// Route-level honesty for admin business view.
//
// In admin view (a genuine ADMIN scoped to a business via
// x-admin-business-id), the server only authorizes a SUBSET of the portal's
// data surfaces (see src/lib/adminContract.js). This gate renders each route
// according to its verified contract:
//
//   supported  → render the page as-is.
//   mixed      → render the page with a prominent limitation banner naming
//                exactly which surfaces on it are owner-only. The admin-capable
//                parts still work; the owner-only parts surface honest server
//                refusals, never fabricated empty success.
//   owner-only → refuse the route with a full-page explanation. Rendering the
//                page would produce 403s dressed up as empty lists.
//   mock-only  → refuse with an explanation that the page has no live backend
//                and stays a preview until the separate backend security task.
//
// The server remains the authority: this gate is UX honesty, not an
// authorization boundary. Every request still carries the JWT and the
// x-admin-business-id header the server independently validates.
// =============================================================================

import { useAuth } from '@/lib/AuthContext';
import { adminContractFor } from '@/lib/adminContract';
import { Card, Button } from '@/components/instrument';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Info } from 'lucide-react';

function RefusalCard({ route, contract }) {
  return (
    <div data-testid={`admin-refusal-${route.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`} style={{ maxWidth: 640, margin: '48px auto' }}>
      <Card>
        <div style={{ padding: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r3)', background: 'color-mix(in oklch, var(--stop) 10%, transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <ShieldAlert size={20} color="var(--stop)" />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 650, color: 'var(--text)', textAlign: 'center' }}>
            {contract.level === 'mock-only' ? 'Developer Tools are a preview only' : 'Not available in admin view'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
            {contract.level === 'mock-only' ? (
              <>
                The Developer page has no live backend in the current server contract — API keys and
                webhooks are client-side previews only. Wiring it to the developer endpoints is a
                separate backend security task (tenant isolation) and is deliberately out of scope here.
              </>
            ) : (
              <>
                Every data feed on this page is resolved from the business owner's own identity by the
                server. An admin business scope (<code>x-admin-business-id</code>) is not honored for
                these endpoints, and the server refuses them — showing the page would only dress those
                refusals up as empty data.
              </>
            )}
          </p>
          {contract.ownerOnly?.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
              Owner-only surfaces: {contract.ownerOnly.join(', ')}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
            <Link to="/admin-marketplace"><Button variant="ghost" size="sm" icon={ArrowLeft}>Back to Marketplace Overview</Button></Link>
            <Link to="/"><Button variant="secondary" size="sm">Back to Dashboard</Button></Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LimitationBanner({ route, contract }) {
  return (
    <div data-testid={`admin-limitation-${route.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`} style={{ marginBottom: 16 }}>
      <Card style={{ border: '1px solid color-mix(in oklch, var(--hold) 35%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px' }}>
          <Info size={15} color="var(--hold)" style={{ flex: 'none', marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text)' }}>Admin view limitation.</strong> Parts of this page
            resolve data from the business owner's identity and are refused by the server in admin
            scope: <strong>{(contract.ownerOnly || []).join(', ')}</strong>. Those parts surface the
            server's refusals or empty data below — they are not this business being empty, and no
            admin-capable section is affected.
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AdminContractGate({ route, children }) {
  const { isAdminView } = useAuth();
  const location = useLocation();
  if (!isAdminView) return children;

  const contract = adminContractFor(route || location.pathname);
  if (contract.level === 'owner-only' || contract.level === 'mock-only') {
    return <RefusalCard route={route || location.pathname} contract={contract} />;
  }
  if (contract.level === 'mixed') {
    return (
      <>
        <LimitationBanner route={route || location.pathname} contract={contract} />
        {children}
      </>
    );
  }
  return children;
}
