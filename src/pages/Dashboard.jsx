/**
 * Command Center — INSTRUMENT design system (Phase 2 cutover).
 *
 * All Forge imports replaced with Instrument components.
 * motion → m (motion/react) under LazyMotion strict.
 * All data fetching, business logic, and route structure preserved.
 */
import { m } from 'motion/react';
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
import { fmtUSDC, fmt, ORDER_STATUS_META, KYB_STATUS_META } from '@/lib/utils';
import { getTypeConfig } from '@/lib/businessTypes';

// Instrument components
import { Card, CardHead, CardBody, Tag, Button, Skel, Empty, Metric, Spark } from '@/components/instrument';
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
      <CardBody>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <div className="i-tag i-tag--go" style={{ flex: 'none' }}><i /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>All clear</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No urgent items need your attention.</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const urgent = items.filter(i => i.severity === 'urgent').length;
  const warnings = items.length - urgent;

  return (
    <Card>
      <CardHead>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Needs Attention</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {urgent > 0 && <Tag tone="stop">{urgent} urgent</Tag>}
          {warnings > 0 && <Tag tone="hold">{warnings} warning{warnings > 1 ? 's' : ''}</Tag>}
        </div>
      </CardHead>
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, i) => {
            const Icon = RISK_ICONS[item.type] || AlertTriangle;
            return (
              <Link key={i} to={item.link || '#'}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                  borderRadius: 'var(--r2)', background: 'var(--surface-sunk)', textDecoration: 'none' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 'var(--r2)',
                  display: 'grid', placeItems: 'center', flex: 'none',
                  background: item.severity === 'urgent' ? 'var(--stop-bg)' : 'var(--hold-bg)',
                }}>
                  <Icon size={13} strokeWidth={1.75}
                    color={item.severity === 'urgent' ? 'var(--stop)' : 'var(--hold)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>
                </div>
                <ArrowRight size={13} color="var(--text-3)" />
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Inline header (replaces Forge PageHeader) ────────────────────────────────
function PageHeader({ title, subtitle, actions }) {
  return (
    <header style={{ marginBottom: 16 }}>
      <div style={{ height: 2, width: 40, borderRadius: 2, background: 'var(--accent)', marginBottom: 12 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.022em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          {subtitle && <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>{actions}</div>}
      </div>
    </header>
  );
}

// ── Instrument KPI card wrapper (maps old KpiCard API to Instrument) ─────────
function KpiCard({ label, value, delta, deltaLabel, deltaTone, icon: KpiIcon, loading }) {
  if (loading) return <Metric label={label} value={0} loading />;
  const numVal = typeof value === 'string' ? value : Number(value) || 0;
  const deltaNum = delta != null && typeof delta === 'number' ? delta : null;
  const deltaStr = deltaLabel || (deltaNum != null ? `${Math.abs(deltaNum)}%` : null);

  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        {KpiIcon && <KpiIcon size={11} strokeWidth={1.75} color="var(--text-3)" />}
        <span className="i-eyebrow">{label}</span>
      </div>
      <div className="i-num i-num--metric">{numVal}</div>
      {deltaStr && (
        <div style={{
          marginTop: 8, fontSize: 11,
          color: deltaTone === 'down' ? 'var(--stop)' : deltaTone === 'up' ? 'var(--go)' : 'var(--text-3)',
        }}>
          {deltaStr}
        </div>
      )}
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
      <div>
        <PageHeader title="Marketplace Overview" subtitle="Select a business to manage their portal." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <Metric label="Total" value={adminBusinesses.length} />
          <Metric label="Restaurants" value={grouped['FOOD_BEVERAGE']?.length || 0} />
          <Metric label="Hotels" value={grouped['REAL_ESTATE']?.length || 0} />
          <Metric label="Transit" value={grouped['LOGISTICS']?.length || 0} />
        </div>
        {Object.entries(grouped).map(([category, businesses]) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <div className="i-eyebrow" style={{ marginBottom: 12 }}>{category}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {businesses.map(b => (
                <button key={b.id} onClick={() => selectBusiness(b.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', padding: 16, borderRadius: 'var(--r3)',
                    background: 'var(--surface)', border: '1px solid var(--line)', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--d2)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{b.business_type || 'General'}</div>
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
    <div>
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
        <Link to="/kyb" style={{ display: 'block', marginBottom: 16, textDecoration: 'none' }}>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--r2)', background: 'var(--hold-bg)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <FileCheck size={14} strokeWidth={1.75} color="var(--hold)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {bizProfile?.kybStatus === 'UNVERIFIED' && 'Complete your business verification'}
                    {bizProfile?.kybStatus === 'PENDING' && 'Verification is under review'}
                    {bizProfile?.kybStatus === 'REJECTED' && 'Verification rejected — resubmit'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {bizProfile?.kybStatus === 'UNVERIFIED' && 'Upload documents to receive orders publicly.'}
                    {bizProfile?.kybStatus === 'PENDING' && 'Usually takes 24–48 hours.'}
                    {bizProfile?.kybStatus === 'REJECTED' && 'Review feedback and upload corrected documents.'}
                  </div>
                </div>
                <Tag tone={bizProfile?.kybStatus === 'REJECTED' ? 'stop' : 'hold'}>
                  {kybMeta?.label || bizProfile?.kybStatus}
                </Tag>
              </div>
            </CardBody>
          </Card>
        </Link>
      )}

      {/* Employee KPIs */}
      <m.div variants={ContainerV} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <m.div variants={ItemV}><KpiCard label="Total Employees" value={employeeStatsLoading ? '—' : String(employeeStats.totalEmployees)} deltaLabel={employeeStats.totalEmployees > 0 ? `${employeeStats.totalEmployees} active` : 'No employees yet'} icon={Users} loading={employeeStatsLoading} /></m.div>
        <m.div variants={ItemV}><KpiCard label="Active Shifts" value={employeeStatsLoading ? '—' : String(employeeStats.activeShifts)} deltaLabel={employeeStats.activeShifts > 0 ? 'On duty' : 'None'} deltaTone={employeeStats.activeShifts > 0 ? 'up' : 'flat'} icon={Clock} loading={employeeStatsLoading} /></m.div>
        <m.div variants={ItemV}><KpiCard label="Time Off Requests" value={employeeStatsLoading ? '—' : String(employeeStats.pendingTimeOff)} deltaLabel={employeeStats.pendingTimeOff > 0 ? 'Pending' : 'All clear'} deltaTone={employeeStats.pendingTimeOff > 0 ? 'down' : 'up'} icon={CalendarCheck} loading={employeeStatsLoading} /></m.div>
        <m.div variants={ItemV}><KpiCard label="Monthly Payroll" value={employeeStatsLoading ? '—' : `${Number(employeeStats.monthlyPayroll).toLocaleString()} USDC`} deltaLabel="This month" icon={DollarSign} loading={employeeStatsLoading} /></m.div>
      </m.div>

      {/* Quick action cards by type */}
      {quickActions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          {quickActions.map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
                <Card style={{ height: '100%', cursor: 'pointer' }}>
                  <CardBody>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      <div>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--r2)', background: 'var(--surface-sunk)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                          <Icon size={15} strokeWidth={1.75} color="var(--text-2)" />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{a.desc}</div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginTop: 16 }}>
                        Open <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Link to="/reservations?new=true"><Button variant="ghost" size="sm" icon={CalendarPlus}>New Reservation</Button></Link>
        <Link to="/products?new=true"><Button variant="ghost" size="sm" icon={Plus}>Add Product</Button></Link>
        <Link to="/employees?invite=true"><Button variant="ghost" size="sm" icon={UserPlus}>Invite Employee</Button></Link>
        <Link to="/marketing?new_promo=true"><Button variant="ghost" size="sm" icon={TagIcon}>New Promo</Button></Link>
      </div>

      {/* At-risk widget */}
      <div style={{ marginBottom: 16 }}><AtRiskWidget /></div>

      {/* Core KPIs */}
      <m.div variants={ContainerV} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <m.div variants={ItemV}><KpiCard label="Total Orders" value={fmt(stats.totalOrders || 0, 0)} deltaLabel="All time" icon={ShoppingBag} loading={statsLoading} /></m.div>
        <m.div variants={ItemV}><KpiCard label="Revenue" value={fmtUSDC(stats.totalRevenue || 0)} deltaLabel="Completed" icon={TrendingUp} loading={statsLoading} /></m.div>
        <m.div variants={ItemV}><KpiCard label="Pending" value={fmt(stats.pendingOrders || 0, 0)} deltaLabel="Awaiting action" icon={Clock} loading={statsLoading} /></m.div>
        <m.div variants={ItemV}><KpiCard label="Completed" value={fmt(stats.completedOrders || 0, 0)} deltaLabel="All time" icon={CheckCircle2} loading={statsLoading} /></m.div>
      </m.div>

      {/* Type-specific KPIs */}
      {typeConfig.type === 'TRANSIT' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          <KpiCard label="Active Trips" value={fmt(trips.filter(t => ['SCHEDULED','BOARDING'].includes(t.status)).length, 0)} deltaLabel="Scheduled + boarding" icon={Bus} />
          <KpiCard label="Seats Sold" value={fmt(trips.reduce((s, t) => s + (t._count?.seats || 0), 0), 0)} deltaLabel="All trips" icon={Users} />
          <KpiCard label="Check-Ins Today" value={fmt(checkInStats.todayCount || 0, 0)} deltaLabel="Passengers" icon={QrCode} />
          <KpiCard label="Transit Revenue" value={fmtUSDC(trips.reduce((s, t) => s + (t._count?.seats || 0) * (Number(t.fareUsdc) || 0), 0))} deltaLabel="From bookings" icon={DollarSign} />
        </div>
      )}
      {['RESTAURANT','HOTEL','SERVICES'].includes(typeConfig.type) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          <KpiCard label="Reservations" value={fmt(resStats.total || 0, 0)} deltaLabel="All bookings" icon={CalendarCheck} />
          <KpiCard label="Pending" value={fmt(resStats.pending || 0, 0)} deltaLabel="Awaiting confirmation" icon={Clock} />
          <KpiCard label="Checked In" value={fmt(checkInStats.todayCount || 0, 0)} deltaLabel="Today" icon={CheckCircle2} />
          <KpiCard label="No-Shows" value={fmt(resStats.noShows || 0, 0)} deltaLabel="Penalized" deltaTone="down" icon={AlertTriangle} />
        </div>
      )}

      {/* Invoice KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Invoices Sent" value={fmt(invoiceStats.sent, 0)} deltaLabel="Awaiting payment" icon={Receipt} />
        <KpiCard label="Invoices Paid" value={fmt(invoiceStats.paid, 0)} deltaLabel="Settled" icon={CheckCircle2} />
        <KpiCard label="Invoice Revenue" value={fmtUSDC(invoiceStats.paidRevenue)} deltaLabel="From paid invoices" icon={DollarSign} />
      </div>

      {/* Revenue chart */}
      {hasRevenue && (
        <Card style={{ marginBottom: 16 }}>
          <CardHead>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Revenue · Last 30 days</span>
          </CardHead>
          <CardBody>
            <div style={{ height: 180 }}>
              <ResponsiveRevenueChart data={dailyRevenue} />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Order funnel */}
      <div style={{ marginBottom: 16 }}>
        <Card>
          <CardHead>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Order Funnel</span>
          </CardHead>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map((stage, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-2)' }}>{stage.label}</span>
                    <span className="i-num" style={{ color: 'var(--text)' }}>{stage.count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-sunk)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${(stage.count / funnelMax) * 100}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.5s var(--e-io)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent orders + Reviews */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* Recent Orders */}
        <Card>
          <CardHead>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Recent Orders</span>
            <Link to="/orders"><Button variant="ghost" size="xs" icon={ArrowRight}>All</Button></Link>
          </CardHead>
          <CardBody>
            {recentLoading ? <Skel h={120} /> :
             recent.length === 0 ? (
              <Empty title="No orders yet" body="Orders will appear here once customers start buying." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recent.map(o => {
                  const meta = ORDER_STATUS_META[o.status] || {};
                  return (
                    <Link key={o.id} to={`/orders/${o.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        padding: '8px 10px', borderRadius: 'var(--r2)', background: 'var(--surface-sunk)',
                        textDecoration: 'none' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtUSDC(o.amountUsdc)}</div>
                      </div>
                      <Tag tone={meta.tagVariant === 'bad' ? 'stop' : meta.tagVariant === 'warn' ? 'hold' : meta.tagVariant === 'ok' ? 'go' : 'neutral'}>
                        {meta.label || o.status}
                      </Tag>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Customer Rating */}
        <Card>
          <CardHead><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Customer Rating</span></CardHead>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="i-num i-num--metric">{fmt(reviewStats.avgRating || 0, 1)}</span>
              <div style={{ display: 'flex' }}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14}
                    fill={s <= Math.round(reviewStats.avgRating || 0) ? 'var(--accent)' : 'none'}
                    color={s <= Math.round(reviewStats.avgRating || 0) ? 'var(--accent)' : 'var(--line-firm)'} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{reviewStats.total || 0} reviews</div>
          </CardBody>
        </Card>

        {/* Reviews promoted */}
        <Card>
          <CardHead><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Stories Promoted</span></CardHead>
          <CardBody>
            <div className="i-num i-num--metric">{fmt(reviewStats.storiesPromoted || 0, 0)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>From customer reviews</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ── Inline revenue chart (lightweight, no recharts dependency for this) ──────
function ResponsiveRevenueChart({ data }) {
  const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } = require('recharts');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line-firm)', borderRadius: 'var(--r3)', fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
