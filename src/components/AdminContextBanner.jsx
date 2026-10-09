// src/components/AdminContextBanner.jsx
// =============================================================================
// Unmistakable admin context indicator, rendered across authenticated pages
// while an admin is scoped to a business:
//
//        ADMIN VIEW · Test Restaurant · FOOD_BEVERAGE
//
// Shows the active business name and its actual backend category, carries the
// switch error state (a failed switch leaves the OLD context visible — this
// banner keeps saying so), and provides the return-to-marketplace action.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getTypeConfig } from '@/lib/businessTypes';
import { Button, Tag } from '@/components/instrument';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AdminContextBanner() {
  const { isAdminView, bizProfile, switching, switchError, clearSwitchError, selectBusiness } = useAuth();
  const navigate = useNavigate();
  if (!isAdminView) return null;

  const cfg = getTypeConfig(bizProfile?.category);
  const category = bizProfile?.category || 'OTHER';

  return (
    <div
      data-testid="admin-context-banner"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '8px 14px', marginBottom: 16,
        borderRadius: 'var(--r3)',
        background: 'color-mix(in oklch, var(--accent) 8%, transparent)',
        border: '1px solid color-mix(in oklch, var(--accent) 25%, transparent)',
      }}
    >
      <ShieldCheck size={14} color="var(--accent)" style={{ flex: 'none' }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>
        ADMIN VIEW
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {bizProfile?.businessName || '—'}
      </span>
      <Tag tone="neutral">{cfg.label} · {category}</Tag>

      {switching && (
        <span data-testid="admin-banner-switching" style={{ fontSize: 11, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={11} className="animate-spin" />
          {switching.waitingForMutations
            ? 'Waiting for in-progress business operations…'
            : `Switching to ${switching.targetName}…`}
        </span>
      )}

      {switchError && !switching && (
        <span data-testid="admin-banner-switch-error" style={{ fontSize: 11, color: 'var(--stop)' }}>
          Could not switch to {switchError.targetName} — still viewing {bizProfile?.businessName}
        </span>
      )}

      <span style={{ flex: 1 }} />
      <Button
        variant="ghost"
        size="sm"
        icon={ArrowLeft}
        data-testid="return-to-marketplace"
        onClick={() => { clearSwitchError(); selectBusiness(null); navigate('/admin-marketplace'); }}
      >
        Return to Marketplace
      </Button>
    </div>
  );
}
