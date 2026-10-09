// src/pages/AdminMarketplace.jsx
// =============================================================================
// Marketplace Overview — the admin's landing surface after login.
//
// A fresh admin login NEVER auto-selects a business (AuthContext guarantees
// this); this page presents every registered business grouped by its actual
// backend category, with identifying details and an explicit selection
// action. Selection is a controlled context transition (see AuthContext):
// the page disables its actions while a transition is running and reports
// failed loads honestly instead of falling back to stale data.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getTypeConfig, BUSINESS_TYPES } from '@/lib/businessTypes';
import { Card, Button, Tag, Input } from '@/components/instrument';
import { Search, MapPin, ShieldAlert, RefreshCw } from 'lucide-react';
import { KYB_STATUS_META } from '@/lib/utils';

const CATEGORY_ORDER = [
  'FOOD_BEVERAGE', 'REAL_ESTATE', 'LOGISTICS', 'RETAIL',
  'FREELANCE_SERVICES', 'HOSPITALITY', 'TECHNOLOGY', 'EDUCATION',
  'HEALTH_WELLNESS', 'ENTERTAINMENT', 'FINANCIAL_SERVICES', 'OTHER',
];

export default function AdminMarketplace() {
  const { adminBusinesses, selectedBusinessId, selectBusiness, switching, switchError, clearSwitchError } = useAuth();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const businesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return adminBusinesses || [];
    return (adminBusinesses || []).filter(b =>
      b.businessName?.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q) ||
      b.azamanId?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q)
    );
  }, [adminBusinesses, search]);

  // Group by the ACTUAL backend category — every category the API returns
  // gets a group, including ones outside the four "headline" verticals.
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const b of businesses) {
      const cat = b.category || 'OTHER';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(b);
    }
    return [...groups.entries()].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a[0]), ib = CATEGORY_ORDER.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a[0].localeCompare(b[0]);
    });
  }, [businesses]);

  const stats = useMemo(() => {
    const byCat = {};
    for (const b of adminBusinesses || []) {
      const cat = b.category || 'OTHER';
      byCat[cat] = (byCat[cat] || 0) + 1;
    }
    return byCat;
  }, [adminBusinesses]);

  // The business the operator asked to ENTER (selection → dashboard entry).
  // Kept across the whole controlled transition — including a switch that is
  // deferred while business mutations settle — so the dashboard entry is a
  // direct consequence of the switch SUCCEEDING, never of it merely starting.
  const [enterTarget, setEnterTarget] = useState(null);

  const handleSelect = (b) => {
    if (switching) return; // a controlled transition is already in progress
    clearSwitchError();
    setEnterTarget(b.id);
    selectBusiness(b.id, { targetName: b.businessName });
  };

  // Enter the selected business's dashboard ONLY when its context has fully
  // committed (selected id set AND no transition running). A failed switch
  // never lands here: the old context stays active, the error card explains
  // what happened, and the operator is never navigated into a partial or
  // failed context.
  useEffect(() => {
    if (enterTarget && selectedBusinessId === enterTarget && !switching) {
      setEnterTarget(null);
      navigate('/');
    }
  }, [enterTarget, selectedBusinessId, switching, navigate]);

  return (
    <div data-testid="admin-marketplace">
      <div data-testid="marketplace-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 650, color: 'var(--text)' }}>Marketplace Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Select a business to view and manage their portal in admin scope.
        </p>
      </div>

      {/* Honest error states — never silent fallbacks to stale data */}
      {switchError && (
        <div data-testid="marketplace-switch-error" className="mb-4">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <ShieldAlert size={16} color="var(--stop)" style={{ flex: 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {switchError.kind === 'restore'
                    ? 'Previous selection unavailable'
                    : `Could not switch to ${switchError.targetName}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {switchError.message}
                  {switchError.fromName
                    ? ` — you are still viewing ${switchError.fromName}. No context was changed.`
                    : ' — no business is currently selected.'}
                </div>
              </div>
              {switchError.fromName && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                  Back to {switchError.fromName}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {switching && (
        <div data-testid="marketplace-switching" className="mb-4">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <RefreshCw size={16} className="animate-spin" color="var(--accent)" style={{ flex: 'none' }} />
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {switching.waitingForMutations
                  ? `Waiting for in-progress business operations to finish before switching to ${switching.targetName}…`
                  : `Switching to ${switching.targetName}…`}
              </div>
              {switching.waitingForMutations && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {switching.targetName}'s dashboard will open automatically once the switch completes.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Search */}
      <div style={{ maxWidth: 360, marginBottom: 20 }}>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, category, AZ ID or owner email…"
        />
      </div>

      {/* Headline metrics — every category, not just the four big verticals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Card><div style={{ padding: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 650, color: 'var(--text)' }}>{adminBusinesses?.length ?? 0}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Total registered</div>
        </div></Card>
        {Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, n]) => (
          <Card key={cat}><div style={{ padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 650, color: 'var(--text)' }}>{n}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {getTypeConfig(cat).label} <span style={{ opacity: .6 }}>({cat})</span>
            </div>
          </div></Card>
        ))}
      </div>

      {/* Business groups by actual category */}
      {grouped.length === 0 && (
        <Card><div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No businesses match this search.
        </div></Card>
      )}
      {grouped.map(([category, list]) => {
        const cfg = getTypeConfig(category);
        return (
          <div key={category} style={{ marginBottom: 28 }} data-testid={`marketplace-group-${category}`}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span className="i-eyebrow" style={{ color: cfg.color }}>{cfg.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{category} · {list.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {list.map(b => {
                const kybMeta = KYB_STATUS_META[b.kybStatus || 'UNVERIFIED'];
                const isSelected = selectedBusinessId === b.id;
                return (
                  <Card key={b.id} style={{ border: isSelected ? '1px solid var(--accent)' : undefined }}>
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.businessName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {b.azamanId ? `${b.azamanId} · ` : ''}{cfg.label}
                          </div>
                        </div>
                        <Tag tone={kybMeta?.tone || 'neutral'}>{kybMeta?.label || b.kybStatus || 'UNVERIFIED'}</Tag>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span>Owner: {b.user?.username || b.user?.email || '—'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} style={{ flex: 'none' }} />
                          {b.locations?.length
                            ? b.locations.slice(0, 2).map(l => l.city || l.label).filter(Boolean).join(', ') + (b.locations.length > 2 ? ` +${b.locations.length - 2}` : '')
                            : 'No locations'}
                        </span>
                        <span>
                          {[
                            b._count?.reservations ? `${b._count.reservations} reservations` : null,
                            b._count?.transitTrips ? `${b._count.transitTrips} trips` : null,
                            b._count?.dineInTabs ? `${b._count.dineInTabs} dine-in tabs` : null,
                            b._count?.followers ? `${b._count.followers} followers` : null,
                          ].filter(Boolean).join(' · ') || 'No activity yet'}
                        </span>
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button
                          size="sm"
                          variant={isSelected ? 'secondary' : 'primary'}
                          disabled={!!switching}
                          onClick={() => handleSelect(b)}
                          data-testid={`select-business-${b.id}`}
                        >
                          {isSelected ? 'Currently viewing' : `Select ${b.businessName}`}
                        </Button>
                        {isSelected && !switching && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate('/')}
                            data-testid={`open-dashboard-${b.id}`}
                          >
                            Open Dashboard
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
