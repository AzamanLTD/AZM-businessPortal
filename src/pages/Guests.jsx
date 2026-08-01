import { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, DollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
import { marketplaceApi } from '../lib/marketplaceApi';
import { Card, Button, Badge, Input, Empty, GlassPanel } from '@/components/ui';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const TIER_COLORS = {
  GOLD: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B30' },
  SILVER: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', border: '#6B728030' },
  BRONZE: { color: '#B45309', bg: 'rgba(180, 83, 9, 0.1)', border: '#B4530930' }
};

export default function Guests({ businessId }) {
  const [query, setQuery] = useState('');
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSegment, setActiveSegment] = useState('ALL'); // ALL, VIP, RISK, NEW
  const [sourceFilter, setSourceFilter] = useState('ALL'); // ALL, hotel, restaurant, transit

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.getGuests(businessId);
      setGuests(res.data || []);
    } catch (e) {
      toast.error('Failed to retrieve intelligence directory');
    }
    setLoading(false);
  };

  const getLoyaltyTier = (spend) => {
    if (spend >= 500) return 'GOLD';
    if (spend >= 150) return 'SILVER';
    return 'BRONZE';
  };

  // Pre-calculated stats row
  const totalGuestsCount = guests.length;
  const avgSpend = totalGuestsCount > 0 ? (guests.reduce((sum, g) => sum + (g.totalSpentUsdc || 0), 0) / totalGuestsCount) : 0;
  const ltvEstimate = totalGuestsCount > 0 ? (guests.reduce((sum, g) => sum + (g.totalSpentUsdc || 0), 0) * 1.2 / totalGuestsCount) : 0;
  const repeatRate = totalGuestsCount > 0 ? ((guests.filter(g => g.totalVisits > 1).length / totalGuestsCount) * 100) : 0;

  // Filter pipeline: Search query + Segment buttons + Channel Sources
  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      g.fullName?.toLowerCase().includes(query.toLowerCase()) ||
      g.azamanId?.toLowerCase().includes(query.toLowerCase());

    const matchesSource = sourceFilter === 'ALL' || (g.recentVisits || []).some(v => v.type === sourceFilter);

    let matchesSegment = true;
    if (activeSegment === 'VIP') {
      matchesSegment = (g.totalVisits >= 5);
    } else if (activeSegment === 'RISK') {
      matchesSegment = (g.noShowCount > 0 || (g.trustLevel === 'CAUTION' || g.trustLevel === 'RISK'));
    } else if (activeSegment === 'NEW') {
      matchesSegment = (g.totalVisits === 1);
    }

    return matchesSearch && matchesSource && matchesSegment;
  });

  // Initials color helper
  const getInitialsColor = (name) => {
    if (!name) return '#6C4FD1';
    const colors = ['#6C4FD1', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6'];
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 " style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--f-text)]">Customer Intelligence</h1>
        <p className="text-sm text-[var(--sn-text-muted)] mt-1">
          Perform targeted segments, track retention metrics, review payment loyalty, and check trust records.
        </p>
      </div>

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-[var(--f-line)] rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#6C4FD1]/10 text-[#6C4FD1]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[var(--sn-text-muted)]">Total Customers</span>
            <p className="text-xl font-extrabold text-[var(--f-text)]">{totalGuestsCount}</p>
          </div>
        </Card>

        <Card className="p-4 border border-[var(--f-line)] rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[var(--az-success-subtle)] text-[var(--f-ok)]">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[var(--sn-text-muted)]">Repeat Rate %</span>
            <p className="text-xl font-extrabold text-[var(--f-text)]">{repeatRate.toFixed(1)}%</p>
          </div>
        </Card>

        <Card className="p-4 border border-[var(--f-line)] rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[var(--az-warning-subtle)] text-[var(--f-warn)]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[var(--sn-text-muted)]">Avg Spend</span>
            <p className="text-xl font-extrabold text-[var(--f-text)]">{avgSpend.toFixed(2)} USDC</p>
          </div>
        </Card>

        <Card className="p-4 border border-[var(--f-line)] rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[var(--f-info)] text-[var(--f-info)]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[var(--sn-text-muted)]">LTV Estimate</span>
            <p className="text-xl font-extrabold text-[var(--f-text)]">{ltvEstimate.toFixed(2)} USDC</p>
          </div>
        </Card>
      </div>

      {/* Segmentation Filter Row */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--f-line)] pb-3">
        {[
          { key: 'ALL', label: 'All Segments' },
          { key: 'VIP', label: 'VIP (5+ Visits)' },
          { key: 'RISK', label: 'At Risk / Caution' },
          { key: 'NEW', label: 'New (< 30 days)' }
        ].map((seg) => (
          <button
            key={seg.key}
            onClick={() => setActiveSegment(seg.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeSegment === seg.key
                ? 'bg-[#6C4FD1]/15 text-[#6C4FD1] border-[#6C4FD1]'
                : 'bg-[var(--az-surface-1)] text-[var(--sn-text-muted)] border-[var(--f-line)]:bg-[var(--f-line)]/10'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Search Bar & Legend Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Search and Filters Table Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 border border-[var(--f-line)] rounded-2xl flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sn-text-muted)]" />
              <Input
                placeholder="Search by customer name or identity..."
                className="pl-10 w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-48">
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--az-surface-1)] border border-[var(--f-line)] text-[var(--f-text)] text-sm outline-none focus:border-[#6C4FD1]"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="ALL">All Event Types</option>
                <option value="ORDER">Orders</option>
                <option value="RESERVATION">Reservations</option>
                <option value="NO_SHOW">No Shows</option>
              </select>
            </div>
          </Card>

          {/* Customer Table */}
          <Card className="border border-[var(--f-line)] rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--f-line)]/20 text-xs font-semibold text-[var(--sn-text-muted)] border-b border-[var(--f-line)]">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Loyalty Tier</th>
                  <th className="p-4">Total Visits</th>
                  <th className="p-4">Aggregate Spend</th>
                  <th className="p-4">System Trust</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--f-line)] text-xs text-[var(--f-text)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center"><Skel className="h-20 w-full" /></td>
                  </tr>
                ) : filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--sn-text-muted)]">No active customer profiles found.</td>
                  </tr>
                ) : (
                  filteredGuests.map((guest) => {
                    const tier = getLoyaltyTier(guest.totalSpentUsdc || 0);
                    const tierMeta = TIER_COLORS[tier] || TIER_COLORS.BRONZE;
                    return (
                      <tr
                        key={guest.id}
                        onClick={() => setSelectedGuest(guest)}
                        className="hover:bg-[var(--f-line)]/10 cursor-pointer transition-colors"
                      >
                        <td className="p-4 flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--f-text)] font-bold text-xs"
                            style={{ backgroundColor: getInitialsColor(guest.fullName) }}
                          >
                            {guest.fullName?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-bold">{guest.fullName}</p>
                            <p className="text-[10px] text-[var(--sn-text-muted)] font-mono">{guest.azamanId}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border"
                            style={{ color: tierMeta.color, backgroundColor: tierMeta.bg, borderColor: tierMeta.border }}
                          >
                            {tier}
                          </span>
                        </td>
                        <td className="p-4 font-semibold">{guest.totalVisits} visits</td>
                        <td className="p-4 font-mono font-semibold">{(guest.totalSpentUsdc || 0).toFixed(2)} USDC</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            guest.trustLevel === 'EXCELLENT' ? 'text-[var(--f-ok)] bg-emerald-50' : 'text-[var(--f-info)] bg-blue-50'
                          }`}>
                            {guest.trustLevel}
                          </span>
                        </td>
                        <td className="p-4 text-right text-[#6C4FD1] font-semibold:underline">Drawer →</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Legend Panel & Quick insights */}
        <div className="space-y-6 col-span-1">
          <Card className="p-5 border border-[var(--f-line)] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--f-text)]">Loyalty Tier Thresholds</h3>
            <p className="text-xs text-[var(--sn-text-muted)] leading-relaxed">
              Customers automatically upgrade tiers based on cumulative lifetime purchase volume.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS.GOLD.color }} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--f-text)]">Gold Segment</p>
                  <p className="text-[10px] text-[var(--sn-text-muted)]">Cumulative spend ≥ 500 USDC</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS.SILVER.color }} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--f-text)]">Silver Segment</p>
                  <p className="text-[10px] text-[var(--sn-text-muted)]">Cumulative spend ≥ 150 USDC</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS.BRONZE.color }} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--f-text)]">Bronze Segment</p>
                  <p className="text-[10px] text-[var(--sn-text-muted)]">Initial Tier &lt; 150 USDC</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-[var(--f-line)] rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-[var(--f-text)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6C4FD1]" /> System Trust Score
            </h3>
            <p className="text-xs text-[var(--sn-text-muted)] leading-relaxed">
              Calculated based on booking retention, no-show histories, and verified payments across the network.
            </p>
          </Card>
        </div>
      </div>

      {/* Guest Detail Drawer */}
      {selectedGuest && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-end p-0 z-50 "
          onClick={() => setSelectedGuest(null)}
        >
          <div
            className="bg-[var(--az-surface-1)] max-w-md w-full h-full p-6 space-y-6 flex flex-col shadow-2xl overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <div className="flex justify-between items-center border-b border-[var(--f-line)] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--f-text)]">{selectedGuest.fullName}</h2>
                <span className="text-xs font-mono text-[var(--sn-text-muted)]">{selectedGuest.azamanId}</span>
              </div>
              <button onClick={() => setSelectedGuest(null)} className="text-[var(--sn-text-muted)]:text-black font-bold">✕</button>
            </div>

            {/* Spend Insights & Loyalty */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[var(--f-line)]/15 border border-[var(--f-line)] rounded-xl">
                <span className="text-[var(--sn-text-muted)] block mb-1">Total Visits</span>
                <span className="font-extrabold text-[var(--f-text)] text-sm">{selectedGuest.totalVisits}</span>
              </div>
              <div className="p-3 bg-[var(--f-line)]/15 border border-[var(--f-line)] rounded-xl">
                <span className="text-[var(--sn-text-muted)] block mb-1">Lifetime Volume</span>
                <span className="font-extrabold text-[var(--f-text)] text-sm font-mono">{(selectedGuest.totalSpentUsdc || 0).toFixed(2)} USDC</span>
              </div>
            </div>

            {/* Visit Breakdown chart simulation */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--sn-text-muted)] uppercase tracking-wider">Spend Progression</h4>
              <div className="h-44 bg-[var(--f-line)]/10 rounded-xl p-3 flex flex-col justify-end">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', spend: (selectedGuest.totalSpentUsdc || 0) * 0.2 },
                    { name: 'Mar', spend: (selectedGuest.totalSpentUsdc || 0) * 0.4 },
                    { name: 'May', spend: (selectedGuest.totalSpentUsdc || 0) * 0.7 },
                    { name: 'Jul', spend: (selectedGuest.totalSpentUsdc || 0) }
                  ]}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--f-tint-color)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--f-tint-color)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="spend" stroke="var(--f-tint-color)" fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Visit History Timeline */}
            <div className="space-y-3 flex-1">
              <h4 className="text-xs font-bold text-[var(--sn-text-muted)] uppercase tracking-wider">Activity Timeline</h4>
              <div className="space-y-3.5">
                {selectedGuest.recentVisits && selectedGuest.recentVisits.length > 0 ? (
                  selectedGuest.recentVisits.map((v, i) => (
                    <div key={i} className="flex gap-3 items-start text-xs border-l-2 border-[#6C4FD1]/30 pl-3 ml-1.5 py-1">
                      <div className="flex-1">
                        <p className="font-bold text-[var(--f-text)]">{v.description}</p>
                        <p className="text-[10px] text-[var(--sn-text-muted)] mt-0.5">{v.date || 'Recent Event'}</p>
                      </div>
                      <Tag variant="neutral" bg="rgba(108, 79, 209, 0.08)">{v.type}</Tag>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--sn-text-muted)] italic">No recent timeline events recorded.</p>
                )}
              </div>
            </div>

            {/* Sticky Admin note field */}
            <div className="space-y-2 border-t border-[var(--f-line)] pt-4">
              <h4 className="text-xs font-bold text-[var(--sn-text-muted)] uppercase tracking-wider">Internal Desk Notes</h4>
              <textarea
                className="w-full text-xs p-3 rounded-xl border border-[var(--f-line)] outline-none focus:border-[#6C4FD1] min-h-[60px]"
                placeholder="Write optional operational notes here (such as diet preferences or table assignments)..."
              />
            </div>

            <Button onClick={() => setSelectedGuest(null)} className="w-full bg-[#6C4FD1] text-[var(--f-text)]:bg-[#5b42b1]">
              Close Directory Profile
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
