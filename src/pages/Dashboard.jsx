/**
 * Dashboard — Forge design system rebuild.
 * Title is "Command Center" — no greeting string.
 * Uses Forge primitives: PageHeader, KpiCard, Card, Tag, DataTable.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, Package, FileCheck, Receipt, DollarSign, Bus,
  Users, CalendarCheck, QrCode, Star, Utensils, Hotel, Route,
  ArrowUpRight, Plus, CalendarPlus, UserPlus, Tag as TagIcon,
} from 'lucide-react';

import { orders as ordersApi, invoices as invoicesApi, request } from '@/lib/api';
import { reservations as resApi, transit as transitApi, checkIn as checkInApi, reviews as reviewsApi } from '@/lib/marketplaceApi';
import { useAuth } from '@/lib/AuthContext';
import { fmtUSDC, fmt, ORDER_STATUS_META, KYB_STATUS_META, cn } from '@/lib/utils';
import { getTypeConfig } from '@/lib/businessTypes';
import { PageHeader, KpiCard, Card, CardHead, CardTitle, CardBody, Tag, Button, Skel } from '@/components/forge';
import { ContainerV, ItemV } from '@/lib/motion';

// ── Revenue computation (unchanged) ──────────────────────────────────────────
function computeDailyRevenue(orders, days = 30) {
  const map = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    map[key] = { date: key, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), revenue: 0 };
  }
  orders.filter(o => o.status === 'COMPLETED').forEach(o => {
    const key = new Date(o.createdAt).toISOString().split('T')[0];
    if (map[key]) map[key].revenue += Number(o.amountUsdc) || 0;
  });
  return Object.values(map);
}

function computeFunnel(orders) {
  const funded    = ['PAID', 'DELIVERED', 'COMPLETED', 'DISPUTED'];
  const delivered = ['DELIVERED', 'COMPLETED'];
  return [
    { label: 'Total',     count: orders.length },
    { label: 'Paid',      count: orders.filter(o => funded.includes(o.status)).length },
    { label: 'Delivered', count: orders.filter(o => delivered.includes(o.status)).length },
    { label: 'Completed', count: orders.filter(o => o.status === 'COMPLETED').length },
  ];
}

// ── At-Risk Widget ───────────────────────────────────────────────────────────
const RISK_ICONS = {
  HOUSEKEEPING_OVERDUE: Hotel, KITCHEN_AGING: Utensils, VEHICLE_MAINTENANCE: Bus,
  SHIFT_SWAP_PENDING: Users, TIME_OFF_PENDING: CalendarCheck, NEGATIVE_REVIEW: Star,
  RESERVATION_PENDING: CalendarCheck, LOW_STOCK: Package,
};

function AtRiskWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => request('/api/business-os/dashboard/at-risk'),
    refetchInterval: 60_000,
  });
  const items = data?.items || [];

  if (isLoading) return <Skel h={120} />;
  if (!items.length) return (
    <Card>
      <CardBody className="flex items-center gap-3 py-4">
        <div className="f-icon-wrap f-icon-wrap--ok"><CheckCircle2 className="h-4 w-4" /></div>
        <div>
          <p className="text-sm font-semibold text-ink">All clear</p>
          <p className="text-xs text-ink-3">No urgent items need your attention.</p>
        </div>
      </CardBody>
    </Card>
  );

  const urgent = items.filter(i => i.severity === 'urgent').length;
  const warnings = items.length - urgent;

  return (
    <Card>
      <CardHead>
        <CardTitle>Needs Attention</CardTitle>
        <div className="flex gap-2">
          {urgent > 0 && <Tag variant="bad">{urgent} urgent</Tag>}
          {warnings > 0 && <Tag variant="warn">{warnings} warning{warnings > 1 ? 's' : ''}</Tag>}
        </div>
      </CardHead>
      <CardBody className="space-y-1">
        {items.map((item, i) => {
          const Icon = RISK_ICONS[item.type] || AlertTriangle;
          return (
            <Link key={i} to={item.link || '#'}
                  className="flex items-center gap-3 p-2 rounded-md:bg-surface-sunken transition-colors">
              <div className={cn('f-icon-wrap', item.severity === 'urgent' ? 'f-icon-wrap--bad' : 'f-icon-wrap--warn')}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                <p className="text-[11px] text-ink-3 truncate">{item.subtitle}</p>
              </div>
              <ArrowRight className="h-3 w-3 text-ink-3" />
            </Link>
          );
        })}
      </CardBody>
    </Card>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isAdmin, adminBusinesses, bizProfile, selectedBusinessId, selectBusiness } = useAuth();
  const typeConfig = getTypeConfig(bizProfile?.business_type);
  const TypeIcon = typeConfig.icon || ShoppingBag;

  // ── Core queries ──────────────────────────────────────────────────────────
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['biz-stats'], queryFn: () => ordersApi.stats(), refetchInterval: 60_000,
  });
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-orders'], queryFn: () => ordersApi.list({ limit: 5 }), refetchInterval: 30_000,
  });
  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard-analytics-orders'], queryFn: () => ordersApi.list({ limit: 50 }), refetchInterval: 60_000,
  });
  const { data: invoiceData } = useQuery({
    queryKey: ['dashboard-invoices'], queryFn: () => invoicesApi.list({ limit: 50 }), refetchInterval: 60_000,
  });
  const { data: resStatsData } = useQuery({
    queryKey: ['reservation-stats'], queryFn: () => resApi.stats(),
    enabled: typeConfig.navItems.includes('reservations'),
  });
  const { data: transitData } = useQuery({
    queryKey: ['transit-trips-dashboard'], queryFn: () => transitApi.list(),
    enabled: typeConfig.type === 'TRANSIT',
  });
  const { data: checkInStatsData } = useQuery({
    queryKey: ['checkin-stats-dashboard'], queryFn: () => checkInApi.todayStats(),
    enabled: typeConfig.navItems.includes('checkin'), retry: false,
  });
  const { data: reviewStatsData } = useQuery({
    queryKey: ['review-stats-dashboard'], queryFn: () => reviewsApi.stats(), retry: false,
  });
  const { data: employeeStatsData, isLoading: employeeStatsLoading } = useQuery({
    queryKey: ['employee-stats-dashboard'],
    queryFn: () => request('/api/business-os/dashboard/employee-stats'),
    refetchInterval: 60_000,
  });

  // ── Computed values ────────────────────────────────────────────────────────
  const stats = statsData?.stats || {};
  const recent = recentData?.orders || [];
  const analyticsOrders = analyticsData?.orders || [];
  const allInvoices = invoiceData?.invoices || [];
  const dailyRevenue = useMemo(() => computeDailyRevenue(analyticsOrders, 30), [analyticsOrders]);
  const funnel = useMemo(() => computeFunnel(analyticsOrders), [analyticsOrders]);
  const hasRevenue = dailyRevenue.some(d => d.revenue > 0);
  const funnelMax = Math.max(funnel[0]?.count || 0, 1);
  const invoiceStats = useMemo(() => ({
    sent: allInvoices.filter(i => i.status === 'SENT').length,
    paid: allInvoices.filter(i => i.status === 'PAID').length,
    paidRevenue: allInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (Number(i.billTotalUsdc) || 0), 0),
  }), [allInvoices]);
  const resStats = resStatsData?.stats || {};
  const checkInStats = checkInStatsData?.stats || {};
  const reviewStats = reviewStatsData?.stats || {};
  const trips = transitData?.trips || [];
  const employeeStats = employeeStatsData?.stats || { totalEmployees: 0, activeShifts: 0, pendingTimeOff: 0, monthlyPayroll: '0.00' };
  const kybMeta = KYB_STATUS_META[bizProfile?.kybStatus || 'UNVERIFIED'];
  const needsKyb = bizProfile?.kybStatus !== 'VERIFIED';

  // ── Admin business picker ─────────────────────────────────────────────────
  if (isAdmin && !selectedBusinessId) {
    const grouped = adminBusinesses.reduce((acc, b) => {
      (acc[b.category] = acc[b.category] || []).push(b);
      return acc;
    }, {});
    return (
      <div className="f-content">
        <PageHeader title="Marketplace Overview" subtitle="Select a business to manage their portal." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total" value={String(adminBusinesses.length)} />
          <KpiCard label="Restaurants" value={String(grouped['FOOD_BEVERAGE']?.length || 0)} />
          <KpiCard label="Hotels" value={String(grouped['REAL_ESTATE']?.length || 0)} />
          <KpiCard label="Transit" value={String(grouped['LOGISTICS']?.length || 0)} />
        </div>
        {Object.entries(grouped).map(([category, businesses]) => (
          <div key={category} className="mb-6">
            <p className="f-eyebrow mb-3">{category}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {businesses.map(b => (
                <button key={b.id} onClick={() => selectBusiness(b.id)}
                  className="f-card p-4 text-left:shadow-md transition-shadow cursor-pointer">
                  <p className="text-sm font-semibold text-ink">{b.name}</p>
                  <p className="text-xs text-ink-3 mt-1">{b.business_type || 'General'}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Quick actions by type ──────────────────────────────────────────────────
  const quickActions = [];
  if (typeConfig.type === 'TRANSIT') {
    quickActions.push(
      { to: '/transit-fleet', label: 'Manage Fleet', desc: 'Assign drivers, optimize routes.', icon: Bus },
      { to: '/transit-manifests', label: 'Trip Manifests', desc: 'Review passenger rosters.', icon: Route },
      { to: '/checkin', label: 'Scan Tickets', desc: 'Boarding check-in with QR.', icon: QrCode },
    );
  } else if (typeConfig.type === 'RESTAURANT') {
    quickActions.push(
      { to: '/restaurant-tables', label: 'Floor Plan', desc: 'Table statuses and seating.', icon: Utensils },
      { to: '/restaurant-kitchen', label: 'Kitchen', desc: 'Monitor open tickets.', icon: Utensils },
      { to: '/dine-in', label: 'Dine-In', desc: 'Manage active sessions.', icon: Utensils },
    );
  } else if (typeConfig.type === 'HOTEL') {
    quickActions.push(
      { to: '/hotel-front-desk', label: 'Front Desk', desc: 'Guest arrivals and keys.', icon: Hotel },
      { to: '/hotel-housekeeping', label: 'Housekeeping', desc: 'Room status tracking.', icon: Clock },
      { to: '/guests', label: 'Guest Profiles', desc: 'CRM history and preferences.', icon: Users },
    );
  }

  return (
    <div className="f-content">
      <PageHeader title="Command Center"
        subtitle={typeConfig.label}
        actions={
          <Link to="/orders">
            <Button variant="ghost" size="sm" icon={ArrowRight}>View all orders</Button>
          </Link>
        }
      />

      {/* KYB banner */}
      {needsKyb && (
        <Link to="/kyb" className="block mb-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardBody className="flex items-center gap-3 py-3">
              <div className="f-icon-wrap f-icon-wrap--warn"><FileCheck className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {bizProfile?.kybStatus === 'UNVERIFIED' && 'Complete your business verification'}
                  {bizProfile?.kybStatus === 'PENDING' && 'Verification is under review'}
                  {bizProfile?.kybStatus === 'REJECTED' && 'Verification rejected — resubmit'}
                </p>
                <p className="text-xs text-ink-3 mt-0.5">
                  {bizProfile?.kybStatus === 'UNVERIFIED' && 'Upload documents to receive orders publicly.'}
                  {bizProfile?.kybStatus === 'PENDING' && 'Usually takes 24–48 hours.'}
                  {bizProfile?.kybStatus === 'REJECTED' && 'Review feedback and upload corrected documents.'}
                </p>
              </div>
              <Tag variant={bizProfile?.kybStatus === 'REJECTED' ? 'bad' : 'warn'}>
                {kybMeta?.label || bizProfile?.kybStatus}
              </Tag>
            </CardBody>
          </Card>
        </Link>
      )}

      {/* Employee KPIs */}
      <motion.div variants={ContainerV} initial="hidden" animate="show"
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <ItemV><KpiCard label="Total Employees" value={employeeStatsLoading ? '—' : String(employeeStats.totalEmployees)} delta={employeeStats.totalEmployees > 0 ? `${employeeStats.totalEmployees} active` : 'No employees yet'} icon={Users} /></ItemV>
        <ItemV><KpiCard label="Active Shifts" value={employeeStatsLoading ? '—' : String(employeeStats.activeShifts)} delta={employeeStats.activeShifts > 0 ? 'On duty' : 'None'} deltaTone={employeeStats.activeShifts > 0 ? 'up' : 'flat'} icon={Clock} /></ItemV>
        <ItemV><KpiCard label="Time Off Requests" value={employeeStatsLoading ? '—' : String(employeeStats.pendingTimeOff)} delta={employeeStats.pendingTimeOff > 0 ? 'Pending' : 'All clear'} deltaTone={employeeStats.pendingTimeOff > 0 ? 'down' : 'up'} icon={CalendarCheck} /></ItemV>
        <ItemV><KpiCard label="Monthly Payroll" value={employeeStatsLoading ? '—' : `${Number(employeeStats.monthlyPayroll).toLocaleString()} USDC`} delta="This month" icon={DollarSign} /></ItemV>
      </motion.div>

      {/* Quick action cards by type */}
      {quickActions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {quickActions.map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.to} to={a.to}>
                <Card className="h-full:shadow-md transition-shadow">
                  <CardBody className="flex flex-col justify-between h-full">
                    <div>
                      <div className="f-icon-wrap mb-3"><Icon className="h-4 w-4" /></div>
                      <h3 className="text-sm font-semibold text-ink">{a.label}</h3>
                      <p className="text-xs text-ink-3 mt-1">{a.desc}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-tint mt-4">
                      Open <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link to="/reservations?new=true"><Button variant="ghost" size="sm" icon={CalendarPlus}>New Reservation</Button></Link>
        <Link to="/products?new=true"><Button variant="ghost" size="sm" icon={Plus}>Add Product</Button></Link>
        <Link to="/employees?invite=true"><Button variant="ghost" size="sm" icon={UserPlus}>Invite Employee</Button></Link>
        <Link to="/marketing?new_promo=true"><Button variant="ghost" size="sm" icon={TagIcon}>New Promo</Button></Link>
      </div>

      {/* At-risk widget */}
      <div className="mb-4"><AtRiskWidget /></div>

      {/* Core KPIs */}
      <motion.div variants={ContainerV} initial="hidden" animate="show"
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <ItemV><KpiCard label="Total Orders" value={fmt(stats.totalOrders || 0, 0)} delta="All time" icon={ShoppingBag} /></ItemV>
        <ItemV><KpiCard label="Revenue" value={fmtUSDC(stats.totalRevenue || 0)} delta="Completed" icon={TrendingUp} /></ItemV>
        <ItemV><KpiCard label="Pending" value={fmt(stats.pendingOrders || 0, 0)} delta="Awaiting action" icon={Clock} /></ItemV>
        <ItemV><KpiCard label="Completed" value={fmt(stats.completedOrders || 0, 0)} delta="All time" icon={CheckCircle2} /></ItemV>
      </motion.div>

      {/* Type-specific KPIs */}
      {typeConfig.type === 'TRANSIT' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard label="Active Trips" value={fmt(trips.filter(t => ['SCHEDULED','BOARDING'].includes(t.status)).length, 0)} delta="Scheduled + boarding" icon={Bus} />
          <KpiCard label="Seats Sold" value={fmt(trips.reduce((s, t) => s + (t._count?.seats || 0), 0), 0)} delta="All trips" icon={Users} />
          <KpiCard label="Check-Ins Today" value={fmt(checkInStats.todayCount || 0, 0)} delta="Passengers" icon={QrCode} />
          <KpiCard label="Transit Revenue" value={fmtUSDC(trips.reduce((s, t) => s + (t._count?.seats || 0) * (Number(t.fareUsdc) || 0), 0))} delta="From bookings" icon={DollarSign} />
        </div>
      )}
      {['RESTAURANT','HOTEL','SERVICES'].includes(typeConfig.type) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard label="Reservations" value={fmt(resStats.total || 0, 0)} delta="All bookings" icon={CalendarCheck} />
          <KpiCard label="Pending" value={fmt(resStats.pending || 0, 0)} delta="Awaiting confirmation" icon={Clock} />
          <KpiCard label="Checked In" value={fmt(checkInStats.todayCount || 0, 0)} delta="Today" icon={CheckCircle2} />
          <KpiCard label="No-Shows" value={fmt(resStats.noShows || 0, 0)} delta="Penalized" deltaTone="down" icon={AlertTriangle} />
        </div>
      )}

      {/* Invoice KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <KpiCard label="Invoices Sent" value={fmt(invoiceStats.sent, 0)} delta="Awaiting payment" icon={Receipt} />
        <KpiCard label="Invoices Paid" value={fmt(invoiceStats.paid, 0)} delta="Settled" icon={CheckCircle2} />
        <KpiCard label="Invoice Revenue" value={fmtUSDC(invoiceStats.paidRevenue)} delta="From paid invoices" icon={DollarSign} />
      </div>

      {/* Revenue trend + Order funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHead>
            <CardTitle>Revenue Trend</CardTitle>
            <Tag variant="neutral">Last 30 days</Tag>
          </CardHead>
          <CardBody>
            {!hasRevenue ? (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <Package className="h-8 w-8 text-ink-3 mb-2" />
                <p className="text-sm text-ink-3">No completed orders yet.</p>
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveRevenueChart data={dailyRevenue} />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Order funnel */}
        <Card>
          <CardHead><CardTitle>Order Funnel</CardTitle></CardHead>
          <CardBody className="space-y-3">
            {funnel.map(stage => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="f-eyebrow">{stage.label}</span>
                  <span className="f-num text-sm font-semibold text-ink">{stage.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-tint transition-all duration-500"
                       style={{ width: `${(stage.count / funnelMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Recent orders + Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <Card className="lg:col-span-1">
          <CardHead>
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/orders"><Button variant="ghost" size="sm" icon={ArrowRight}>All</Button></Link>
          </CardHead>
          <CardBody className="space-y-1">
            {recentLoading ? <Skel h={120} /> :
             recent.length === 0 ? (
              <p className="text-sm text-ink-3 py-4 text-center">No orders yet.</p>
            ) : (
              recent.map(o => {
                const meta = ORDER_STATUS_META[o.status] || {};
                return (
                  <Link key={o.id} to={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-2 p-2 rounded-md:bg-surface-sunken transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate">
                        {o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}
                      </p>
                      <p className="text-[11px] text-ink-3">{fmtUSDC(o.amountUsdc)}</p>
                    </div>
                    <Tag variant={meta.tagVariant || 'neutral'}>{meta.label || o.status}</Tag>
                  </Link>
                );
              })
            )}
          </CardBody>
        </Card>

        {/* Customer Rating */}
        <Card>
          <CardHead><CardTitle>Customer Rating</CardTitle></CardHead>
          <CardBody>
            <div className="flex items-baseline gap-2">
              <span className="f-num text-2xl font-bold text-ink">{fmt(reviewStats.avgRating || 0, 1)}</span>
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('h-3.5 w-3.5', s <= Math.round(reviewStats.avgRating || 0) ? 'text-tint fill-tint' : 'text-line-strong')} />
                ))}
              </div>
            </div>
            <p className="text-xs text-ink-3 mt-2">{reviewStats.total || 0} reviews</p>
          </CardBody>
        </Card>

        {/* Reviews promoted */}
        <Card>
          <CardHead><CardTitle>Stories Promoted</CardTitle></CardHead>
          <CardBody>
            <p className="f-num text-2xl font-bold text-ink">{fmt(reviewStats.storiesPromoted || 0, 0)}</p>
            <p className="text-xs text-ink-3 mt-2">From customer reviews</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ── Inline revenue chart (lightweight, no recharts dependency for this) ──────
function ResponsiveRevenueChart({ data }) {
  // Use recharts AreaChart — imported dynamically to keep bundle small
  const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } = require('recharts');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--f-tint-color)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--f-tint-color)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: 'var(--f-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--f-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={{ background: 'var(--f-surface)', border: '1px solid var(--f-line-strong)', borderRadius: '8px', fontSize: '12px' }} />
        <Area type="monotone" dataKey="revenue" stroke="var(--f-tint-color)" strokeWidth={2} fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
