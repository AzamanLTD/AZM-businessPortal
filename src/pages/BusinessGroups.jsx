/**
 * Business Groups — Section 6, Phase 2
 * Consolidated view for owners with multiple brands / locations.
 * Compare KPIs side-by-side, manage group membership.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { request } from '@/lib/apiCore';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Card } from '@/components/forge';
import {
  Building2, TrendingUp, Users, ShoppingBag, DollarSign,
  Plus, Star, ArrowUpRight, ArrowDownRight, BarChart3,
  Globe, ChevronRight, Check, AlertTriangle, MapPin,
  Layers, RefreshCw, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (n) => `GHS ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 0 })}`;
const fmtShort = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}k` : String(Math.round(n));

const BIZ_TYPE_COLORS = {
  RESTAURANT: '#E2A33D', HOTEL: '#3D74DB', TRANSIT: '#1FA37A',
  RETAIL: '#6C4FD1', DEFAULT: '#9A96A3',
};

export default function BusinessGroups() {
  const { adminBusinesses, bizProfile, isAdmin, selectedBusinessId, selectBusiness } = useAuth();
  const [activeMetric, setActiveMetric] = useState('revenue');
  const [hoveredBiz, setHoveredBiz] = useState(null);

  // Use adminBusinesses if admin, or just the current biz
  const businesses = isAdmin && adminBusinesses?.length > 0
    ? adminBusinesses
    : bizProfile ? [bizProfile] : [];

  // Fetch real group stats from backend
  const { data: groupStats, isLoading, isError, refetch } = useQuery({
    queryKey: ['group-stats'],
    queryFn: async () => {
      const res = await request('/api/business-os/group-stats');
      return res;
    },
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const bizList = groupStats?.businesses || [];

  const METRICS = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign, format: fmtShort, prefix: 'GHS ' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, format: String },
    { id: 'employees', label: 'Staff', icon: Users, format: String },
  ];

  const chartData = bizList.map(b => ({ name: b.name?.substring(0, 12) || 'N/A', value: b[activeMetric] || 0, color: BIZ_TYPE_COLORS[b.type] || BIZ_TYPE_COLORS.DEFAULT }));

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  if (businesses.length <= 1 && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--az-accent-subtle)' }}>
          <Layers className="w-8 h-8" style={{ color: 'var(--f-tint-color)' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--f-text)' }}>Business Groups</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--f-text-3)' }}>
          Business Groups let you manage multiple brands side-by-side with consolidated revenue, headcount, and performance data.
          This view becomes available once you have more than one business registered under your account.
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--f-text)]" style={{ background: 'var(--f-tint-color)' }}>
          <Plus className="w-4 h-4" /> Register another business to get started
        </div>
      </div>
    );
  }

  // Error state — no mock data fallback
  if (isError && !groupStats) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--az-danger-subtle, rgba(239,68,68,0.1))' }}>
          <AlertCircle className="w-8 h-8" style={{ color: 'var(--f-bad)' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--f-text)' }}>Couldn't load group stats</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--f-text-3)' }}>
          There was a problem fetching your business group data. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[var(--f-text)] transition-opacity:opacity-90"
          style={{ background: 'var(--f-tint-color)' }}
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>Business Groups</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>{bizList.length} businesses in your group</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--f-text-3)' }} />}
        </div>
      </div>

      {/* Group KPI summary */}
      <motion.div variants={containerVariants} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: groupStats?.totalRevenue || 0, format: fmt, icon: DollarSign, color: 'var(--f-ok)' },
          { label: 'Total Orders', value: groupStats?.totalOrders || 0, format: String, icon: ShoppingBag, color: 'var(--f-tint-color)' },
          { label: 'Total Staff', value: groupStats?.totalEmployees || 0, format: String, icon: Users, color: 'var(--f-info)' },
          { label: 'Avg Rating', value: groupStats?.avgRating || 0, format: v => Number(v).toFixed(1), icon: Star, color: 'var(--f-warn)' },
        ].map(kpi => (
          <motion.div key={kpi.label} variants={itemVariants}>
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>{kpi.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: kpi.color + '20' }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--f-text)' }}>
                <AnimatedNumber value={kpi.value} formatter={kpi.format} />
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-3 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>Side-by-side comparison</h3>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--f-bg)' }}>
              {METRICS.map(m => (
                <button key={m.id} onClick={() => setActiveMetric(m.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={activeMetric === m.id ? { background: 'var(--f-tint-color)', color: '#fff' } : { color: 'var(--f-text-3)' }}>
                  <m.icon className="w-3 h-3" />{m.label}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--f-text-3)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--f-text-3)' }} tickFormatter={fmtShort} />
                <Tooltip
                  contentStyle={{ background: 'var(--az-surface-solid)', border: '1px solid var(--f-line)', borderRadius: 10, color: 'var(--f-text)' }}
                  cursor={{ fill: 'var(--az-accent-subtle)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] gap-2">
              <BarChart3 className="w-8 h-8" style={{ color: 'var(--f-text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>No business data yet</p>
            </div>
          )}
        </Card>

        {/* Business list */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
            <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>Businesses</h3>
          </div>
          <div className="divide-y overflow-y-auto max-h-[320px]" style={{ borderColor: 'var(--f-line)' }}>
            {bizList.map(biz => {
              const color = BIZ_TYPE_COLORS[biz.type] || BIZ_TYPE_COLORS.DEFAULT;
              const isSelected = biz.id === selectedBusinessId;
              return (
                <div key={biz.id}
                  onMouseEnter={() => setHoveredBiz(biz.id)}
                  onMouseLeave={() => setHoveredBiz(null)}
                  className="px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-colors"
                  style={hoveredBiz === biz.id ? { background: 'var(--f-bg)' } : {}}
                  onClick={() => isAdmin && biz.id && selectBusiness && selectBusiness(biz.id)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[var(--f-text)] text-xs font-bold"
                    style={{ background: color }}>
                    {(biz.name || 'B').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--f-text)' }}>{biz.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--f-ok)' }} />}
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--f-text-3)' }}>
                      <MapPin className="w-3 h-3" />{biz.location}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--f-text)' }}>
                      {activeMetric === 'revenue' ? `GHS ${fmtShort(biz.revenue || 0)}` : String(biz[activeMetric] || 0)}
                    </div>
                    {biz.delta !== 0 && (
                      <div className={cn('text-xs flex items-center justify-end gap-0.5 font-semibold')}
                        style={{ color: biz.delta > 0 ? 'var(--f-ok)' : 'var(--f-bad)' }}>
                        {biz.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(biz.delta)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Shared employee notice */}
      <Card className="p-4 flex items-start gap-3">
        <Users className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--f-info)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--f-text)' }}>Shared Employee Pool</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--f-text-3)' }}>
            Employees can be staffed across multiple businesses in your group. A roving GM or shared staff member 
            appears under each business they're assigned to. Manage cross-business assignments in Employees → each person's profile.
          </p>
        </div>
      </Card>
    </div>
  );
}
