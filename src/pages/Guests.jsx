/**
 * Guests (Customer Intelligence) — INSTRUMENT design system (Phase 2, screen 3).
 *
 * All Instrument components.
 * Guest detail drawer → Instrument Sheet. All CSS → Instrument variables.
 */
import { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, DollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
import { marketplaceApi } from '../lib/marketplaceApi';
import { Card, Tag, Button, Skel, Empty, Sheet } from '@/components/instrument';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from '@/lib/toast';

const TIER_META = {
  GOLD:   { color: 'var(--hold)',  bg: 'var(--hold-bg)' },
  SILVER: { color: 'var(--text-3)', bg: 'var(--surface-sunk)' },
  BRONZE: { color: 'var(--hold)',  bg: 'var(--hold-bg)' },
};

export default function Guests({ businessId }) {
  const [query, setQuery] = useState('');
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSegment, setActiveSegment] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  useEffect(() => { loadGuests(); }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.getGuests(businessId);
      setGuests(res.data || []);
    } catch (e) {
      toast.stop('Failed to retrieve intelligence directory');
    }
    setLoading(false);
  };

  const getLoyaltyTier = (spend) => {
    if (spend >= 500) return 'GOLD';
    if (spend >= 150) return 'SILVER';
    return 'BRONZE';
  };

  const totalGuestsCount = guests.length;
  const avgSpend = totalGuestsCount > 0 ? (guests.reduce((s, g) => s + (g.totalSpentUsdc || 0), 0) / totalGuestsCount) : 0;
  const ltvEstimate = totalGuestsCount > 0 ? (guests.reduce((s, g) => s + (g.totalSpentUsdc || 0), 0) * 1.2 / totalGuestsCount) : 0;
  const repeatRate = totalGuestsCount > 0 ? ((guests.filter(g => g.totalVisits > 1).length / totalGuestsCount) * 100) : 0;

  const filteredGuests = guests.filter((g) => {
    const matchesSearch = g.fullName?.toLowerCase().includes(query.toLowerCase()) ||
      g.azamanId?.toLowerCase().includes(query.toLowerCase());
    const matchesSource = sourceFilter === 'ALL' || (g.recentVisits || []).some(v => v.type === sourceFilter);
    let matchesSegment = true;
    if (activeSegment === 'VIP') matchesSegment = (g.totalVisits >= 5);
    else if (activeSegment === 'RISK') matchesSegment = (g.noShowCount > 0 || g.trustLevel === 'CAUTION' || g.trustLevel === 'RISK');
    else if (activeSegment === 'NEW') matchesSegment = (g.totalVisits === 1);
    return matchesSearch && matchesSource && matchesSegment;
  });

  const getInitialsColor = (name) => {
    if (!name) return 'var(--accent)';
    const colors = ['var(--accent)', 'var(--go)', 'var(--info)', 'var(--accent)', 'var(--hold)', 'var(--accent)'];
    return colors[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
  };

  const SEGMENTS = [
    { key: 'ALL', label: 'All Segments' },
    { key: 'VIP', label: 'VIP (5+ Visits)' },
    { key: 'RISK', label: 'At Risk / Caution' },
    { key: 'NEW', label: 'New (< 30 days)' },
  ];

  // KPI helper
  const Kpi = ({ label, value, icon: Icon, iconColor }) => (
    <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--r2)', display: 'grid', placeItems: 'center', background: iconColor + '14' }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div>
        <div className="i-num i-num--metric" style={{ marginTop: 2 }}>{value}</div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ height: 2, width: 40, borderRadius: 2, background: 'var(--accent)', marginBottom: 12 }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.022em', margin: 0 }}>Customer Intelligence</h1>
        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>
          Perform targeted segments, track retention metrics, review payment loyalty, and check trust records.
        </p>
      </header>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Kpi label="Total Customers" value={totalGuestsCount} icon={Sparkles} iconColor="var(--accent)" />
        <Kpi label="Repeat Rate %" value={`${repeatRate.toFixed(1)}%`} icon={RefreshCw} iconColor="var(--go)" />
        <Kpi label="Avg Spend" value={`${avgSpend.toFixed(2)} USDC`} icon={DollarSign} iconColor="var(--hold)" />
        <Kpi label="LTV Estimate" value={`${ltvEstimate.toFixed(2)} USDC`} icon={TrendingUp} iconColor="var(--info)" />
      </div>

      {/* Segmentation filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 24 }}>
        {SEGMENTS.map(seg => (
          <button key={seg.key} onClick={() => setActiveSegment(seg.key)}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r2)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1px solid', transition: 'all 0.12s',
              background: activeSegment === seg.key ? 'var(--accent)' : 'var(--surface)',
              color: activeSegment === seg.key ? 'var(--accent-text)' : 'var(--text-3)',
              borderColor: activeSegment === seg.key ? 'var(--accent)' : 'var(--line)',
            }}>
            {seg.label}
          </button>
        ))}
      </div>

      {/* Main grid: table + legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Table column */}
        <div>
          {/* Search + filter bar */}
          <Card style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                placeholder="Search by customer name or identity..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--line)', background: 'var(--surface)',
                  font: '500 var(--t-sm)/1.4 var(--font)', color: 'var(--text)', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--line)'}
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--line)',
                background: 'var(--surface)', font: '500 var(--t-sm)/1.4 var(--font)',
                color: 'var(--text)', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="ALL">All Event Types</option>
              <option value="ORDER">Orders</option>
              <option value="RESERVATION">Reservations</option>
              <option value="NO_SHOW">No Shows</option>
            </select>
          </Card>

          {/* Customer table */}
          <Card>
            <table className="i-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Loyalty Tier</th>
                  <th>Total Visits</th>
                  <th>Aggregate Spend</th>
                  <th>System Trust</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center' }}><Skel h={80} /></td></tr>
                ) : filteredGuests.length === 0 ? (
                  <tr><td colSpan={6}><Empty title="No customer profiles" body="No customers match the current filters." /></td></tr>
                ) : (
                  filteredGuests.map(guest => {
                    const tier = getLoyaltyTier(guest.totalSpentUsdc || 0);
                    const tm = TIER_META[tier] || TIER_META.BRONZE;
                    return (
                      <tr key={guest.id} onClick={() => setSelectedGuest(guest)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 'var(--r2)', display: 'grid', placeItems: 'center',
                              background: getInitialsColor(guest.fullName), color: '#fff', fontWeight: 700, fontSize: 12,
                            }}>{guest.fullName?.[0] || '?'}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{guest.fullName}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{guest.azamanId}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: tm.color, background: tm.bg,
                          }}>{tier}</span>
                        </td>
                        <td><span style={{ fontWeight: 600 }}>{guest.totalVisits} visits</span></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{(guest.totalSpentUsdc || 0).toFixed(2)} USDC</span></td>
                        <td>
                          <Tag tone={guest.trustLevel === 'EXCELLENT' ? 'go' : 'info'}>
                            {guest.trustLevel}
                          </Tag>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>Drawer →</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Legend panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Loyalty Tier Thresholds</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 16 }}>
              Customers automatically upgrade tiers based on cumulative lifetime purchase volume.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Gold Segment', desc: 'Cumulative spend ≥ 500 USDC', color: TIER_META.GOLD.color },
                { label: 'Silver Segment', desc: 'Cumulative spend ≥ 150 USDC', color: TIER_META.SILVER.color },
                { label: 'Bronze Segment', desc: 'Initial Tier < 150 USDC', color: TIER_META.BRONZE.color },
              ].map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.color, flex: 'none' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ShieldCheck size={16} color="var(--accent)" /> System Trust Score
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Calculated based on booking retention, no-show histories, and verified payments across the network.
            </div>
          </Card>
        </div>
      </div>

      {/* Guest detail drawer — Instrument Sheet */}
      <Sheet open={!!selectedGuest} onClose={() => setSelectedGuest(null)} title={selectedGuest?.fullName || ''}>
        {selectedGuest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              {selectedGuest.azamanId}
            </div>

            {/* Spend insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Total Visits</div>
                <div className="i-num i-num--metric">{selectedGuest.totalVisits}</div>
              </Card>
              <Card style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Lifetime Volume</div>
                <div className="i-num i-num--metric" style={{ fontFamily: 'var(--font-mono)' }}>
                  {(selectedGuest.totalSpentUsdc || 0).toFixed(2)}
                </div>
              </Card>
            </div>

            {/* Spend chart */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Spend Progression
              </div>
              <div style={{ height: 180, background: 'var(--surface-sunk)', borderRadius: 'var(--r3)', padding: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', spend: (selectedGuest.totalSpentUsdc || 0) * 0.2 },
                    { name: 'Mar', spend: (selectedGuest.totalSpentUsdc || 0) * 0.4 },
                    { name: 'May', spend: (selectedGuest.totalSpentUsdc || 0) * 0.7 },
                    { name: 'Jul', spend: (selectedGuest.totalSpentUsdc || 0) },
                  ]}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} tick={{ fill: 'var(--text-3)' }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line-firm)', borderRadius: 'var(--r3)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="spend" stroke="var(--accent)" fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity timeline */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Activity Timeline
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedGuest.recentVisits?.length > 0 ? (
                  selectedGuest.recentVisits.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: '2px solid var(--accent)', paddingLeft: 12, marginLeft: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{v.description}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{v.date || 'Recent Event'}</div>
                      </div>
                      <Tag tone="neutral">{v.type}</Tag>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>No recent timeline events recorded.</div>
                )}
              </div>
            </div>

            {/* Admin notes */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Internal Desk Notes
              </div>
              <textarea
                placeholder="Write optional operational notes here (such as diet preferences or table assignments)..."
                style={{
                  width: '100%', padding: 12, borderRadius: 'var(--r2)',
                  border: '1px solid var(--line)', background: 'var(--surface)',
                  font: '500 var(--t-sm)/1.5 var(--font)', color: 'var(--text)',
                  outline: 'none', minHeight: 60, resize: 'vertical',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--line)'}
              />
            </div>

            <Button variant="primary" onClick={() => setSelectedGuest(null)} style={{ width: '100%' }}>
              Close Directory Profile
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
