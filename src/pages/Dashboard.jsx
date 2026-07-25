/**
 * Dashboard — Sentry-inspired widget-based dashboard.
 * Business-type-aware: shows different widgets for transit, restaurant, hotel, retail, etc.
 *
 * Sentry design tenets applied:
 * - Widget-based layout (like Sentry's dashboard widgets)
 * - Placeholders instead of loading spinners
 * - Data-dense, clean visual hierarchy
 * - Global date range context
 * - Type-specific widget sections
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orders as ordersApi, invoices as invoicesApi, request } from '@/lib/api';
import { reservations as resApi, transit as transitApi, checkIn as checkInApi, reviews as reviewsApi } from '@/lib/marketplaceApi';
import { useAuth } from '@/lib/AuthContext';
import { Widget, WidgetStat, WidgetRow } from '@/components/ui/Widget';
import { KpiCard } from '@/components/charts/KpiCard';
import { Badge, Skeleton, Card } from '@/components/ui';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { fmtUSDC, fmt, relativeTime, ORDER_STATUS_META, KYB_STATUS_META, cn } from '@/lib/utils';
import { getTypeConfig } from '@/lib/businessTypes';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import OnboardingChecklist from '@/components/ui/OnboardingChecklist';
import {
  ShoppingBag, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, ArrowRight, Package, FileCheck,
  Receipt, DollarSign, Bus, Users, CalendarCheck,
  QrCode, Star, UserCheck, UserX, Route, Sparkles,
  UtensilsCrossed, Building2, Briefcase, Store,
  Utensils, Hotel, ArrowUpRight, Plus, CalendarPlus, UserPlus, Tag
} from 'lucide-react';

// ── Revenue computation ──────────────────────────────────────────────────────
function computeDailyRevenue(orders, days = 30) {
  const map = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    map[key] = { date: key, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), revenue: 0 };
  }
  orders
    .filter(o => o.status === 'COMPLETED')
    .forEach(o => {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (map[key]) map[key].revenue += Number(o.amountUsdc) || 0;
    });
  return Object.values(map);
}

function computeFunnel(orders) {
  const funded    = ['PAID', 'DELIVERED', 'COMPLETED', 'DISPUTED'];
  const delivered = ['DELIVERED', 'COMPLETED'];
  return [
    { label: 'Total',     count: orders.length,                                          color: 'var(--az-info)' },
    { label: 'Paid',      count: orders.filter(o => funded.includes(o.status)).length,    color: 'var(--az-accent)' },
    { label: 'Delivered', count: orders.filter(o => delivered.includes(o.status)).length, color: 'var(--az-warning)' },
    { label: 'Completed', count: orders.filter(o => o.status === 'COMPLETED').length,      color: 'var(--az-success)' },
  ];
}

const TYPE_ICONS = { Bus, UtensilsCrossed, Building2, Briefcase, Store, ShoppingBag };

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// ── At-Risk Widget ───────────────────────────────────────────────────────────
function AtRiskWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => request('/api/business-os/dashboard/at-risk'),
    refetchInterval: 60_000, // refresh every minute
  });

  const items = data?.items || [];

  if (isLoading) {
    return (
      <GlassPanel className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border animate-pulse" />
          <div className="h-4 w-32 rounded bg-az-bg-alt animate-pulse" />
        </div>
      </GlassPanel>
    );
  }

  if (items.length === 0) {
    return (
      <GlassPanel className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
            <CheckCircle2 className="w-5 h-5 text-az-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-az-text">All clear</p>
            <p className="text-xs text-az-text-secondary">No urgent items need your attention right now.</p>
          </div>
        </div>
      </GlassPanel>
    );
  }

  const urgentCount = items.filter(i => i.severity === 'urgent').length;
  const warningCount = items.length - urgentCount;

  const SEVERITY_COLORS = {
    urgent: 'var(--az-danger)',
    warning: 'var(--az-warning)',
    info: 'var(--az-info)',
  };

  const TYPE_ICONS = {
    HOUSEKEEPING_OVERDUE: Building2,
    KITCHEN_AGING: Utensils,
    VEHICLE_MAINTENANCE: Bus,
    SHIFT_SWAP_PENDING: Users,
    TIME_OFF_PENDING: CalendarCheck,
    NEGATIVE_REVIEW: Star,
    RESERVATION_PENDING: CalendarCheck,
    LOW_STOCK: Package,
  };

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-az-md flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--az-danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--az-danger) 30%, transparent)' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--az-danger)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-az-text">Needs Attention</h3>
            <p className="text-xs text-az-text-secondary">
              {urgentCount > 0 && <span className="text-az-danger font-medium">{urgentCount} urgent</span>}
              {urgentCount > 0 && warningCount > 0 && ' · '}
              {warningCount > 0 && <span>{warningCount} warning{warningCount > 1 ? 's' : ''}</span>}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {items.map((item, i) => {
          const Icon = TYPE_ICONS[item.type] || AlertTriangle;
          const color = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.warning;
          return (
            <Link
              key={i}
              to={item.link || '#'}
              className="flex items-center gap-3 p-2.5 rounded-az-md border border-az-border bg-az-surface hover:bg-az-surface-solid transition-colors group"
            >
              <div className="w-8 h-8 rounded-az-md flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-az-text truncate">{item.title}</p>
                <p className="text-[11px] text-az-text-secondary truncate">{item.subtitle}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-az-text-muted flex-shrink-0 group-hover:text-az-accent transition-colors" />
            </Link>
          );
        })}
      </div>
    </GlassPanel>
  );
}

export default function Dashboard() {
  const { isAdmin, adminBusinesses, bizProfile, selectedBusinessId, selectBusiness } = useAuth();

  if (isAdmin && !selectedBusinessId) {
      const grouped = adminBusinesses.reduce((acc, b) => {
          (acc[b.category] = acc[b.category] || []).push(b);
          return acc;
      }, {});

      return (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
              <header>
                  <h1 className="text-2xl font-bold text-az-text">Marketplace Overview</h1>
                  <p className="text-sm text-az-text-muted mt-1">Select a business from the sidebar to manage their portal.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <GlassPanel className="p-4">
                      <p className="text-xs text-az-text-muted font-semibold uppercase">Total</p>
                      <p className="text-2xl font-bold text-az-text mt-1">{adminBusinesses.length}</p>
                  </GlassPanel>
                  <GlassPanel className="p-4">
                      <p className="text-xs text-az-text-muted font-semibold uppercase">Restaurants</p>
                      <p className="text-2xl font-bold text-az-text mt-1">{grouped['FOOD_BEVERAGE']?.length || 0}</p>
                  </GlassPanel>
                  <GlassPanel className="p-4">
                      <p className="text-xs text-az-text-muted font-semibold uppercase">Hotels</p>
                      <p className="text-2xl font-bold text-az-text mt-1">{grouped['REAL_ESTATE']?.length || 0}</p>
                  </GlassPanel>
                  <GlassPanel className="p-4">
                      <p className="text-xs text-az-text-muted font-semibold uppercase">Transit</p>
                      <p className="text-2xl font-bold text-az-text mt-1">{grouped['LOGISTICS']?.length || 0}</p>
                  </GlassPanel>
              </div>

              {Object.entries(grouped).map(([category, businesses]) => (
                  <div key={category} className="space-y-3">
                      <h2 className="text-sm font-bold text-az-text uppercase tracking-wider">{category}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {businesses.map(b => (
                              <button
                                  key={b.id}
                                  onClick={() => {
                                      localStorage.setItem('admin_selected_biz', b.id);
                                      selectBusiness(b.id);
                                  }}
                                  className="text-left rounded-az-lg border border-az-border bg-az-surface backdrop-blur-glass hover:bg-az-surface-solid hover:border-az-accent p-4 transition-all"
                              >
                                  <p className="text-sm font-bold text-az-text truncate">{b.businessName}</p>
                                  <p className="text-xs text-az-text-muted mt-1 truncate">ID: {b.azamanId || b.bizId}</p>
                                  <div className="flex gap-2 mt-3">
                                      <Badge variant={b.kybStatus === 'VERIFIED' ? 'success' : 'secondary'}>{b.kybStatus}</Badge>
                                      {b._count && (
                                          <Badge variant="outline">{b._count.orders || 0} orders</Badge>
                                      )}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      );
  }

  const typeConfig = getTypeConfig(bizProfile);
  const TypeIcon = TYPE_ICONS[typeConfig.icon] || Store;

  // ── Core queries (shared across all business types) ──────────────────────
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['biz-stats'],
    queryFn:  () => ordersApi.stats(),
    refetchInterval: 60_000,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn:  () => ordersApi.list({ limit: 5 }),
    refetchInterval: 30_000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics-orders'],
    queryFn:  () => ordersApi.list({ limit: 50 }),
    refetchInterval: 60_000,
  });

  const { data: invoiceData } = useQuery({
    queryKey: ['dashboard-invoices'],
    queryFn:  () => invoicesApi.list({ limit: 50 }),
    refetchInterval: 60_000,
  });

  // ── Type-specific queries ────────────────────────────────────────────────
  const { data: resStatsData } = useQuery({
    queryKey: ['reservation-stats'],
    queryFn:  () => resApi.stats(),
    enabled: typeConfig.navItems.includes('reservations'),
  });

  const { data: transitData } = useQuery({
    queryKey: ['transit-trips-dashboard'],
    queryFn:  () => transitApi.list(),
    enabled: typeConfig.type === 'TRANSIT',
  });

  const { data: checkInStatsData } = useQuery({
    queryKey: ['checkin-stats-dashboard'],
    queryFn:  () => checkInApi.todayStats(),
    enabled: typeConfig.navItems.includes('checkin'),
    retry: false,
  });

  const { data: reviewStatsData } = useQuery({
    queryKey: ['review-stats-dashboard'],
    queryFn:  () => reviewsApi.stats(),
    enabled: true,
    retry: false,
  });

  // ── Employee stats (real data, not hardcoded) ──────────────────────────
  const { data: employeeStatsData, isLoading: employeeStatsLoading } = useQuery({
    queryKey: ['employee-stats-dashboard'],
    queryFn:  () => request('/api/business-os/dashboard/employee-stats'),
    refetchInterval: 60_000,
  });

  // ── Computed values ──────────────────────────────────────────────────────
  const stats  = statsData?.stats  || {};
  const recent = recentData?.orders || [];
  const analyticsOrders = analyticsData?.orders || [];
  const allInvoices = invoiceData?.invoices || [];

  const dailyRevenue = useMemo(() => computeDailyRevenue(analyticsOrders, 30), [analyticsOrders]);
  const funnel       = useMemo(() => computeFunnel(analyticsOrders), [analyticsOrders]);
  const hasRevenue   = dailyRevenue.some(d => d.revenue > 0);
  const funnelMax    = Math.max(funnel[0]?.count || 0, 1);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const bizName = bizProfile?.businessName || 'there';

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
        <OnboardingChecklist />
      {/* Employee Summary Widget with motion stagger */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            label="Total Employees"
            value={employeeStatsLoading ? '—' : String(employeeStats.totalEmployees)}
            delta={employeeStats.totalEmployees > 0 ? `${employeeStats.totalEmployees} active` : 'No employees yet'}
            deltaType="info"
            icon={Users}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            label="Active Shifts"
            value={employeeStatsLoading ? '—' : String(employeeStats.activeShifts)}
            delta={employeeStats.activeShifts > 0 ? 'On duty now' : 'No active shifts'}
            deltaType={employeeStats.activeShifts > 0 ? 'positive' : 'info'}
            icon={Clock}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            label="Time Off Requests"
            value={employeeStatsLoading ? '—' : String(employeeStats.pendingTimeOff)}
            delta={employeeStats.pendingTimeOff > 0 ? 'Pending approval' : 'All clear'}
            deltaType={employeeStats.pendingTimeOff > 0 ? 'warning' : 'positive'}
            icon={CalendarCheck}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            label="Monthly Payroll"
            value={employeeStatsLoading ? '—' : `${Number(employeeStats.monthlyPayroll).toLocaleString()} USDC`}
            delta={Number(employeeStats.monthlyPayroll) > 0 ? 'This month (paid)' : 'No payroll yet'}
            deltaType="info"
            icon={DollarSign}
          />
        </motion.div>
      </motion.div>

      {/* ── Header with business type badge ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-az-text flex items-center gap-2">
            {greeting}, {bizName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-sm text-az-text-secondary">Here's what's happening today.</p>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-az-accent-subtle text-az-accent border border-az-accent-border"
            >
              <TypeIcon className="w-2.5 h-2.5" />
              {typeConfig.label}
            </span>
          </div>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-az-lg text-xs font-semibold text-az-accent bg-az-accent-subtle border border-az-accent-border hover:bg-az-surface transition-colors"
        >
          View all orders <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Business-type-aware hero quick-action section ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {typeConfig.type === 'TRANSIT' && (
          <>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Bus className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Manage Fleet</h3>
                <p className="text-xs text-az-text-secondary mt-1">Assign drivers, optimize routes, and manage vehicles.</p>
              </div>
              <Link to="/transit/fleet" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Go to Fleet <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Route className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Trip Manifests</h3>
                <p className="text-xs text-az-text-secondary mt-1">Review passenger rosters and finalize check-ins.</p>
              </div>
              <Link to="/transit/manifests" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                View Manifests <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <QrCode className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Scan Tickets</h3>
                <p className="text-xs text-az-text-secondary mt-1">Quickly boarding check-in with QR code scanners.</p>
              </div>
              <Link to="/checkin" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Launch Scanner <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
          </>
        )}
        {typeConfig.type === 'RESTAURANT' && (
          <>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Utensils className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Floor Plan & Tables</h3>
                <p className="text-xs text-az-text-secondary mt-1">Monitor table statuses, covers, and real-time seating.</p>
              </div>
              <Link to="/restaurant/tables" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Manage Tables <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Clock className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Active Kitchen Queue</h3>
                <p className="text-xs text-az-text-secondary mt-1">Monitor live kitchen prep times and dish dispatch statuses.</p>
              </div>
              <Link to="/restaurant/kitchen" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Kitchen Screen <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Package className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Inventory & Ingredients</h3>
                <p className="text-xs text-az-text-secondary mt-1">Track low stock ingredients and automate supplier orders.</p>
              </div>
              <Link to="/restaurant/inventory" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Check Stock <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
          </>
        )}
        {typeConfig.type === 'HOTEL' && (
          <>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Hotel className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Front Desk</h3>
                <p className="text-xs text-az-text-secondary mt-1">Manage guest arrivals, assignments, and keycard creation.</p>
              </div>
              <Link to="/hotel/frontdesk" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Front Desk <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Clock className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Housekeeping Panel</h3>
                <p className="text-xs text-az-text-secondary mt-1">Track clean, dirty, and inspection room statuses.</p>
              </div>
              <Link to="/hotel/housekeeping" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                Housekeeping <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
            <GlassPanel className="p-5 flex flex-col justify-between" hover>
              <div>
                <div className="w-10 h-10 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border mb-3">
                  <Users className="w-5 h-5 text-az-accent" />
                </div>
                <h3 className="text-sm font-bold text-az-text">Guest Profiles</h3>
                <p className="text-xs text-az-text-secondary mt-1">Access CRM history, VIP details, and preferences.</p>
              </div>
              <Link to="/guests" className="flex items-center gap-1.5 text-xs font-semibold text-az-accent mt-4 hover:underline">
                View Guests <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </GlassPanel>
          </>
        )}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/reservations?new=true" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-az-md text-xs font-semibold text-az-accent bg-az-accent-subtle border border-az-accent-border hover:bg-az-surface transition-colors">
          <CalendarPlus className="w-3.5 h-3.5" /> New Reservation
        </Link>
        <Link to="/products?new=true" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-az-md text-xs font-semibold text-az-accent bg-az-accent-subtle border border-az-accent-border hover:bg-az-surface transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Product
        </Link>
        <Link to="/employees?invite=true" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-az-md text-xs font-semibold text-az-accent bg-az-accent-subtle border border-az-accent-border hover:bg-az-surface transition-colors">
          <UserPlus className="w-3.5 h-3.5" /> Invite Employee
        </Link>
        <Link to="/marketing?new_promo=true" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-az-md text-xs font-semibold text-az-accent bg-az-accent-subtle border border-az-accent-border hover:bg-az-surface transition-colors">
          <Tag className="w-3.5 h-3.5" /> New Promo
        </Link>
      </div>

      {/* ── At-Risk Widget ─────────────────────────────────────────────────── */}
      <AtRiskWidget />

      {/* ── KYB banner ────────────────────────────────────────────────────── */}
      {needsKyb && (
        <Link to="/kyb">
          <div
            className="flex items-center gap-4 p-4 rounded-az-lg border cursor-pointer hover:opacity-90 transition-opacity bg-az-surface backdrop-blur-glass shadow-az-card"
            style={{ borderColor: `${kybMeta.color}40` }}
          >
            <div className="w-10 h-10 rounded-az-md flex items-center justify-center flex-shrink-0 bg-az-accent-subtle border border-az-accent-border">
              <FileCheck className="w-5 h-5 text-az-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-az-text">
                {bizProfile?.kybStatus === 'UNVERIFIED' && 'Complete your business verification'}
                {bizProfile?.kybStatus === 'PENDING' && 'Verification is under review'}
                {bizProfile?.kybStatus === 'REJECTED' && 'Verification rejected — please resubmit'}
              </p>
              <p className="text-xs text-az-text-secondary mt-0.5">
                {bizProfile?.kybStatus === 'UNVERIFIED' && 'Upload your business documents to start receiving orders publicly.'}
                {bizProfile?.kybStatus === 'PENDING' && "We're reviewing your documents. This usually takes 24–48 hours."}
                {bizProfile?.kybStatus === 'REJECTED' && 'Review the feedback and upload corrected documents.'}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0 text-az-text-secondary" />
          </div>
        </Link>
      )}

      {/* ── Core stats widgets (all business types) ───────────────────────── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        data-tour="dashboard-stats"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <KpiCard label="Total Orders" value={fmt(stats.totalOrders || 0, 0)} delta="All time" deltaType="positive" icon={ShoppingBag} loading={statsLoading} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard label="Revenue" value={fmtUSDC(stats.totalRevenue || 0)} delta="Completed orders" deltaType="positive" icon={TrendingUp} loading={statsLoading} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard label="Pending" value={fmt(stats.pendingOrders || 0, 0)} delta="Awaiting action" deltaType="positive" icon={Clock} loading={statsLoading} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard label="Completed" value={fmt(stats.completedOrders || 0, 0)} delta="All time" deltaType="positive" icon={CheckCircle2} loading={statsLoading} />
        </motion.div>
      </motion.div>

      {/* ── Business-type-specific widgets ────────────────────────────────── */}
      {typeConfig.type === 'TRANSIT' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Trips"
            value={fmt(trips.filter(t => ['SCHEDULED','BOARDING'].includes(t.status)).length, 0)}
            delta="Scheduled + boarding"
            icon={Bus}
          />
          <KpiCard
            label="Seats Sold"
            value={fmt(trips.reduce((s, t) => s + (t._count?.seats || 0), 0), 0)}
            delta="All trips"
            icon={Users}
          />
          <KpiCard
            label="Check-Ins Today"
            value={fmt(checkInStats.todayCount || 0, 0)}
            delta="Passengers checked in"
            icon={QrCode}
          />
          <KpiCard
            label="Transit Revenue"
            value={fmtUSDC(trips.reduce((s, t) => s + (t._count?.seats || 0) * (Number(t.fareUsdc) || 0), 0))}
            delta="From seat bookings"
            icon={DollarSign}
          />
        </div>
      )}

      {['RESTAURANT', 'HOTEL', 'SERVICES'].includes(typeConfig.type) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Reservations" value={fmt(resStats.total || 0, 0)} delta="All bookings" icon={CalendarCheck} />
          <KpiCard label="Pending" value={fmt(resStats.pending || 0, 0)} delta="Awaiting confirmation" icon={Clock} />
          <KpiCard label="Checked In" value={fmt(checkInStats.todayCount || 0, 0)} delta="Seated/checked in today" icon={UserCheck} />
          <KpiCard label="No-Shows" value={fmt(resStats.noShows || 0, 0)} delta="Penalties applied" icon={UserX} />
        </div>
      )}

      {/* ── Invoice KPIs (all types) ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Invoices Sent" value={fmt(invoiceStats.sent, 0)} delta="Awaiting payment" icon={Receipt} />
        <KpiCard label="Invoices Paid" value={fmt(invoiceStats.paid, 0)} delta="Settled" icon={CheckCircle2} />
        <KpiCard label="Invoice Revenue" value={fmtUSDC(invoiceStats.paidRevenue)} delta="From paid invoices" icon={DollarSign} />
      </div>

      {/* ── Revenue trend + Order funnel ──────────────────────────────────── */}
      <div data-tour="dashboard-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend — Area chart */}
        <div className="lg:col-span-2">
          <GlassPanel className="p-6 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-az-text">Revenue Trend</h3>
                <p className="text-xs text-az-text-secondary mt-0.5">Completed orders · last 30 days</p>
              </div>
              <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
                <TrendingUp className="w-4 h-4 text-az-accent" />
              </div>
            </div>
            {!hasRevenue ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-az-accent-subtle border border-az-accent-border flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-az-accent" />
                </div>
                <p className="text-sm text-az-text-secondary">Complete your first order to see revenue.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--az-accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--az-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: 'var(--az-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fill: 'var(--az-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <Tooltip
                    cursor={{ stroke: 'var(--az-border)', strokeDasharray: '4 4', strokeOpacity: 0.4 }}
                    contentStyle={{ background: 'var(--az-surface-solid)', border: '1px solid var(--az-border)', borderRadius: '6px' }}
                    labelStyle={{ color: 'var(--az-text)', fontSize: 12 }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--az-accent)" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassPanel>
        </div>

        {/* Order funnel */}
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-az-text">Order Funnel</h3>
              <p className="text-xs text-az-text-secondary mt-0.5">Lifecycle progression</p>
            </div>
            <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
              <Package className="w-4 h-4 text-az-accent" />
            </div>
          </div>
          <div className="space-y-4 pt-2">
            {funnel.map(stage => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-az-text-muted uppercase tracking-wider">{stage.label}</span>
                  <span className="text-xs font-bold text-az-text">{stage.count}</span>
                </div>
                <div className="h-2 rounded-full bg-az-bg-alt overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(stage.count / funnelMax) * 100}%`, background: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* ── Transit-specific: upcoming trips widget ────────────────────────── */}
      {typeConfig.type === 'TRANSIT' && trips.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-az-text">Upcoming Trips</h3>
                <p className="text-xs text-az-text-secondary mt-0.5">Next departures</p>
              </div>
              <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
                <Route className="w-4 h-4 text-az-accent" />
              </div>
            </div>
            <div className="space-y-0 max-h-[240px] overflow-y-auto">
              {trips
                .filter(t => ['SCHEDULED', 'BOARDING'].includes(t.status))
                .sort((a, b) => new Date(a.departureAt) - new Date(b.departureAt))
                .slice(0, 5)
                .map(trip => {
                  const booked = trip._count?.seats || 0;
                  const total = trip.vehicle?.capacity || 0;
                  const pct = total > 0 ? (booked / total) * 100 : 0;
                  return (
                    <WidgetRow
                      key={trip.id}
                      label={trip.routeName}
                      value={`${booked}/${total}`}
                      badge={<Badge color={pct > 80 ? 'var(--az-warning)' : 'var(--az-accent)'}>{pct > 80 ? 'Filling Up' : 'Available'}</Badge>}
                      onClick={() => window.location.href = '/transit'}
                    />
                  );
                })}
            </div>
          </GlassPanel>

          {/* Recent check-ins for transit */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-az-text">Recent Check-Ins</h3>
                <p className="text-xs text-az-text-secondary mt-0.5">Passenger activity</p>
              </div>
              <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
                <QrCode className="w-4 h-4 text-az-accent" />
              </div>
            </div>
            <div className="space-y-0">
              <WidgetRow label="Checked in today" value={fmt(checkInStats.todayCount || 0, 0)} badge={<Badge color="var(--az-accent)">Today</Badge>} />
              <WidgetRow label="Pending" value={fmt(checkInStats.pending || 0, 0)} badge={<Badge color="var(--az-warning)">Waiting</Badge>} />
              <WidgetRow label="No-shows" value={fmt(checkInStats.noShows || 0, 0)} badge={<Badge color="var(--az-danger)">Today</Badge>} />
              <WidgetRow label="Total guests" value={fmt(checkInStats.totalGuests || 0, 0)} badge={<Badge color="var(--az-info)">All time</Badge>} />
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── Reservation-specific widgets ──────────────────────────────────── */}
      {['RESTAURANT', 'HOTEL', 'SERVICES'].includes(typeConfig.type) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-az-text">Reservation Summary</h3>
                <p className="text-xs text-az-text-secondary mt-0.5">By status</p>
              </div>
              <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
                <CalendarCheck className="w-4 h-4 text-az-accent" />
              </div>
            </div>
            <div className="space-y-0">
              <WidgetRow label="Pending" value={fmt(resStats.pending || 0, 0)} badge={<Badge color="var(--az-warning)">Action needed</Badge>} />
              <WidgetRow label="Confirmed" value={fmt(resStats.confirmed || 0, 0)} badge={<Badge color="var(--az-info)">Upcoming</Badge>} />
              <WidgetRow label="Checked In" value={fmt(resStats.checkedIn || 0, 0)} badge={<Badge color="var(--az-accent)">Today</Badge>} />
              <WidgetRow label="No-Shows" value={fmt(resStats.noShows || 0, 0)} badge={<Badge color="var(--az-danger)">Penalized</Badge>} />
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-az-text">Check-In Activity</h3>
                <p className="text-xs text-az-text-secondary mt-0.5">Today</p>
              </div>
              <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
                <QrCode className="w-4 h-4 text-az-accent" />
              </div>
            </div>
            <div className="space-y-0">
              <WidgetRow label="Checked in" value={fmt(checkInStats.todayCount || 0, 0)} badge={<Badge color="var(--az-accent)">Today</Badge>} />
              <WidgetRow label="Pending" value={fmt(checkInStats.pending || 0, 0)} badge={<Badge color="var(--az-warning)">Waiting</Badge>} />
              <WidgetRow label="No-shows" value={fmt(checkInStats.noShows || 0, 0)} badge={<Badge color="var(--az-danger)">Today</Badge>} />
              <WidgetRow label="Total guests" value={fmt(checkInStats.totalGuests || 0, 0)} badge={<Badge color="var(--az-info)">All time</Badge>} />
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── Reviews widget (all types) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-az-text">Customer Rating</h3>
              <p className="text-xs text-az-text-secondary mt-0.5">Aggregated rating score</p>
            </div>
            <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
              <Star className="w-4 h-4 text-az-accent" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WidgetStat value={fmt(reviewStats.avgRating || 0, 1)} color="var(--az-accent)" />
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={cn('w-4 h-4', s <= Math.round(reviewStats.avgRating || 0) ? 'text-az-accent fill-az-accent' : 'text-az-border')} />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-az-text-muted mt-2">{reviewStats.total || 0} reviews</p>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-az-text">Stories Promoted</h3>
              <p className="text-xs text-az-text-secondary mt-0.5">Shared review count</p>
            </div>
            <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
              <Sparkles className="w-4 h-4 text-az-accent" />
            </div>
          </div>
          <WidgetStat value={fmt(reviewStats.storiesPromoted || 0, 0)} label="From reviews" color="var(--az-accent)" />
        </GlassPanel>

        {/* Recent orders widget */}
        <GlassPanel className="p-6" loading={recentLoading}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-az-text">Recent Orders</h3>
              <p className="text-xs text-az-text-secondary mt-0.5">Latest activity</p>
            </div>
            <div className="w-8 h-8 rounded-az-md flex items-center justify-center bg-az-accent-subtle border border-az-accent-border">
              <ShoppingBag className="w-4 h-4 text-az-accent" />
            </div>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[80px] text-center">
              <p className="text-xs text-az-text-secondary">No orders yet.</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-[160px] overflow-y-auto">
              {recent.map(o => {
                const meta = ORDER_STATUS_META[o.status] || {};
                return (
                  <WidgetRow
                    key={o.id}
                    label={o.azamanId || o.reference || `#${o.id.slice(-6)}`}
                    value={o.amountUsdc ? fmtUSDC(o.amountUsdc) : '—'}
                    badge={<Badge color={meta.color}>{meta.label}</Badge>}
                  />
                );
              })}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
