// src/components/OwnerOnlyRefusal.jsx
// =============================================================================
// Honest inline state for an owner-only data feed rendered in admin view.
//
// The server resolves these feeds from the business owner's identity and
// refuses them for a scoped admin (403). Rendering "No orders yet" / an
// empty list would be fake empty success — this card states what actually
// happened: a refusal, not an empty business.
//
// The server remains the authorization authority; this is presentation
// honesty only.
// =============================================================================

import { ShieldAlert } from 'lucide-react';

export default function OwnerOnlyRefusal({ label = 'This feed', testId }) {
  return (
    <div
      data-testid={testId || 'owner-only-refusal'}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        borderRadius: 'var(--r3)',
        border: '1px solid color-mix(in oklch, var(--hold) 35%, transparent)',
        background: 'color-mix(in oklch, var(--hold) 6%, transparent)',
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55,
      }}
    >
      <ShieldAlert size={14} color="var(--hold)" style={{ flex: 'none', marginTop: 1 }} />
      <div>
        <strong style={{ color: 'var(--text)' }}>{label} is owner-only.</strong> The server
        resolves it from the business owner's identity and refused it in admin view — this is
        a server refusal, not an empty business.
      </div>
    </div>
  );
}
