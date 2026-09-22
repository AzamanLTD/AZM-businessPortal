/**
 * Analytics — Phase 2 Section 9: Predictive & Advanced Analytics
 * - Inventory reorder suggestions (consumption rate vs minimumStock)
 * - Demand forecasting (trailing average + day-of-week seasonality)
 * - Staffing suggestions vs forecast
 * - Customer lifetime value & churn risk
 * All explainable: every suggestion shows the logic behind it.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { m } from 'motion/react';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/instrument';
import { orders as ordersApi, analytics as analyticsApi } from '@/lib/api';
import { fmtUSDC, fmt, cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Package, Users, AlertTriangle,
  Lightbulb, BarChart2, Calendar, ChevronRight, Info,
  ArrowUpRight, RefreshCw, ShoppingBag
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Helpers ────────────────────────────────────────────────────────────────────
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function buildDayOfWeekProfile(orders) {
  const counts = [0,0,0,0,0,0,0];
  const totals  = [0,0,0,0,0,0,0];
  orders.forEach(o => {
    const d = new Date(o.createdAt).getDay();
    counts[d]++;
    totals[d] += Number(o.amountUsdc) || 0;
  });
  return DAYS.map((day, i) => ({ day, orders: counts[i], revenue: totals[i] }));
}

function forecastNext7Days(orders, dayProfile) {
  const recent = orders.filter(o => {
    const age = (Date.now() - new Date(o.createdAt)) / 86400000;
    return age <= 28;
  });
  const avgPerDay = recent.length / 28;
  const profile   = buildDayOfWeekProfile(recent);
  const totalWeight = profile.reduce((s, d) => s + d.orders, 0) || 1;

  const result = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    const dow     = date.getDay();
    const weight  = (profile[dow].orders / totalWeight) * 7;
    const forecast = Math.round(avgPerDay * weight * 7) / 7;
    result.push({
      date: date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      forecast: Math.max(0, Math.round(forecast)),
      dow: DAYS[dow],
    });
  }
  return result;
}

function computeInventoryAlerts(products) {
  if (!Array.isArray(products)) return [];
  return products
    .filter(p => p.trackInventory && p.stockQuantity != null && p.minimumStock != null)
    .map(p => {
      const ratio = p.stockQuantity / Math.max(p.minimumStock, 1);
      let severity = ratio > 2 ? null : ratio > 1 ? 'low' : 'critical';
      return { ...p, ratio, severity };
    })
    .filter(p => p.severity)
    .sort((a, b) => a.ratio - b.ratio);
}

function computeChurnRisk(customers, orders) {
  if (!Array.isArray(customers) || !Array.isArray(orders)) return [];
  const byCustomer = {};
  orders.forEach(o => {
    const uid = o.userId || o.customerId;
    if (!uid) return;
    if (!byCustomer[uid]) byCustomer[uid] = { orders: [], uid };
    byCustomer[uid].orders.push(o);
  });

  return Object.values(byCustomer)
    .map(({ uid, orders: ords }) => {
      if (ords.length < 2) return null;
      ords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const gaps = [];
      for (let i = 1; i < ords.length; i++) {
        const gap = (new Date(ords[i-1].createdAt) - new Date(ords[i].createdAt)) / 86400000;
        gaps.push(gap);
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const daysSinceLast = (Date.now() - new Date(ords[0].createdAt)) / 86400000;
      const churnScore = daysSinceLast / Math.max(avgGap, 1);
      const totalSpend = ords.reduce((s, o) => s + (Number(o.amountUsdc) || 0), 0);
      return { uid, totalOrders: ords.length, avgGap: Math.round(avgGap), daysSinceLast: Math.round(daysSinceLast), churnScore, totalSpend, name: ords[0].customerName || ords[0].buyerName || `Customer ${uid.slice(-4)}` };
    })
    .filter(Boolean)
    .filter(c => c.churnScore > 1.5)
    .sort((a, b) => b.churnScore - a.churnScore)
    .slice(0, 10);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ className = '' }) {
  return <div className={`animate-pulse bg-line rounded ${className}`} />;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface-raise)] border border-line rounded-xl px-3 py-2 shadow-sm text-xs">
      <p className="text-[var(--text-3)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item      = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } } };

export default function Analytics() {
  const { bizProfile } = useAuth();
  const [forecastView, setForecastView] = useState('orders');

  const { data: predictiveData, isLoading: predictiveLoading } = useQuery({
    queryKey: ['analytics-predictive'],
    queryFn: () => analyticsApi.predictive(),
    enabled: !!bizProfile,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['analytics-orders'],
    queryFn: () => ordersApi.list({ limit: 200 }),
    enabled: !!bizProfile,
  });

  const allOrders = useMemo(() => Array.isArray(ordersData) ? ordersData : (ordersData?.orders || []), [ordersData]);

  const forecast  = predictiveData?.forecast || [];
  const dowProfile = useMemo(() => buildDayOfWeekProfile(allOrders), [allOrders]);
  const churnList  = predictiveData?.churnRisk || [];
  const inventoryAlerts = predictiveData?.inventoryAlerts || [];
  // Trailing 30d revenue
  const revenueData = useMemo(() => {
    const map = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), revenue: 0, orders: 0 };
    }
    allOrders.filter(o => o.status === 'COMPLETED').forEach(o => {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (map[key]) { map[key].revenue += Number(o.amountUsdc) || 0; map[key].orders++; }
    });
    return Object.values(map);
  }, [allOrders]);

  const totalRevenue30 = revenueData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders30  = revenueData.reduce((s, d) => s + d.orders, 0);
  const prev15 = revenueData.slice(0, 15).reduce((s, d) => s + d.revenue, 0);
  const curr15 = revenueData.slice(15).reduce((s, d) => s + d.revenue, 0);
  const revDelta = prev15 > 0 ? ((curr15 - prev15) / prev15) * 100 : 0;

  return (
    <ErrorBoundary>
      <m.div variants={container} initial="hidden" animate="show" className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <m.div variants={item}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">Analytics</h1>
              <p className="text-sm text-[var(--text-3)] mt-0.5">Demand forecasting, reorder alerts, and customer insights</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-3)] bg-[var(--surface-sunk)] border border-line-firm rounded-md px-3 py-2">
              <Lightbulb className="w-3.5 h-3.5 text-tint" />
              <span>All insights show their reasoning — <Info className="w-3 h-3 inline" /> for details</span>
            </div>
          </div>
        </m.div>

        {/* KPI row */}
        <m.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ordersLoading ? [1,2,3,4].map(i => <Card key={i} className="p-5"><Sk className="h-4 w-20 mb-2" /><Sk className="h-8 w-28" /></Card>) : [
            { label: '30-day Revenue', value: fmtUSDC(totalRevenue30), delta: revDelta, icon: TrendingUp },
            { label: '30-day Orders',  value: fmt(totalOrders30, 0),    delta: null, icon: ShoppingBag },
            { label: 'Avg Order/Day',  value: fmt(totalOrders30 / 30, 1), delta: null, icon: BarChart2 },
            { label: 'Churn Risks',    value: fmt(churnList.length, 0), delta: null, icon: Users, alert: churnList.length > 0 },
          ].map(({ label, value, delta, icon: Icon, alert }) => (
            <Card key={label} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--text-3)] font-medium">{label}</p>
                <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${alert ? 'bg-bad-bg' : 'bg-[var(--surface-sunk)]'}`}>
                  <Icon className={`w-3.5 h-3.5 ${alert ? 'text-bad' : 'text-tint'}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-ink font-mono">{value}</p>
              {delta != null && (
                <p className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-ok' : 'text-bad'}`}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs prior 15d
                </p>
              )}
            </Card>
          ))}
        </m.div>

        {/* Revenue trend */}
        <m.div variants={item}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Revenue Trend — Last 30 Days</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Completed orders only</p>
              </div>
            </div>
            {ordersLoading ? <Sk className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" strokeOpacity={0.4} vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `$${(v/1).toFixed(0)}` : '0'} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revGrad)" dot={false} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </m.div>

        {/* Demand forecast + Day of week */}
        <m.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 7-day forecast */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-ink">7-Day Demand Forecast</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Weighted moving average + day-of-week seasonality</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)] bg-[var(--surface-sunk)] rounded-sm px-2 py-1">
                <Info className="w-3 h-3 text-tint" />
                Based on last 4 weeks
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {forecast.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--text-3)] w-28 shrink-0">{f.date}</span>
                  <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                    <m.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--accent)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (f.forecast / Math.max(...forecast.map(x => x.forecast), 1)) * 100)}%` }}
                      transition={{ delay: i * 0.07, duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-ink w-10 text-right">{f.forecast}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Day of week profile */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Busiest Days</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Average orders by day of week</p>
              </div>
            </div>
            {ordersLoading ? <Sk className="h-36 w-full" /> : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={dowProfile} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" strokeOpacity={0.4} vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </m.div>

        {/* Churn risk */}
        <m.div variants={item}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Customer Churn Risk</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Customers overdue vs their usual visit frequency</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)] bg-[var(--surface-sunk)] rounded-sm px-2 py-1">
                <Info className="w-3 h-3 text-tint" />
                Based on order history
              </div>
            </div>
            {ordersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Sk key={i} className="h-10 w-full" />)}</div>
            ) : churnList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="w-8 h-8 text-[color:var(--text-3)] mb-2" />
                <p className="text-sm text-[var(--text-2)]">No churn risks detected</p>
                <p className="text-xs text-[var(--text-3)] mt-1">Your regular customers are still active</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {churnList.map((c, i) => {
                  const risk = c.churnScore > 3 ? 'high' : c.churnScore > 2 ? 'medium' : 'low';
                  const riskColor = risk === 'high' ? 'var(--stop)' : risk === 'medium' ? 'var(--hold)' : 'var(--info)';
                  return (
                    <div key={c.uid} className="flex items-center gap-3 p-3 rounded-md border border-line:bg-[var(--surface-sunk)] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-sunk)] flex items-center justify-center text-tint font-bold text-xs flex-shrink-0">
                        {c.name.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink">{c.name}</p>
                        <p className="text-[11px] text-[var(--text-3)]">
                          {c.totalOrders} orders · last seen {c.daysSinceLast}d ago · avg gap {c.avgGap}d
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-az-pill" style={{ background: `${riskColor}18`, color: riskColor }}>
                          {risk} risk
                        </span>
                        <span className="text-[11px] text-[var(--text-3)]">{fmtUSDC(c.totalSpend)} LTV</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </m.div>

        {/* ── Comparative View: This Week vs Last Week ──────────────────────── */}
        <m.div variants={item}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Comparative Performance</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">This week vs last week · This month vs last month</p>
              </div>
            </div>
            {(() => {
              const now = new Date();
              const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
              const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

              const inRange = (o, start, end) => {
                const d = new Date(o.createdAt);
                return d >= start && d < end;
              };

              const completed = allOrders.filter(o => o.status === 'COMPLETED');
              const thisWeek = completed.filter(o => inRange(o, weekStart, now));
              const lastWeek = completed.filter(o => inRange(o, lastWeekStart, weekStart));
              const thisMonth = completed.filter(o => inRange(o, monthStart, now));
              const lastMonth = completed.filter(o => inRange(o, lastMonthStart, monthStart));

              const sumRev = arr => arr.reduce((s, o) => s + (Number(o.amountUsdc) || 0), 0);
              const avgOrder = arr => arr.length > 0 ? sumRev(arr) / arr.length : 0;
              const pct = (curr, prev) => prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);

              const metrics = [
                { label: 'Orders', thisW: thisWeek.length, lastW: lastWeek.length, thisM: thisMonth.length, lastM: lastMonth.length, fmt: v => fmt(v, 0) },
                { label: 'Revenue', thisW: sumRev(thisWeek), lastW: sumRev(lastWeek), thisM: sumRev(thisMonth), lastM: sumRev(lastMonth), fmt: v => fmtUSDC(v) },
                { label: 'Avg Order Value', thisW: avgOrder(thisWeek), lastW: avgOrder(lastWeek), thisM: avgOrder(thisMonth), lastM: avgOrder(lastMonth), fmt: v => fmtUSDC(v) },
              ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {metrics.map(m => {
                    const wDelta = pct(m.thisW, m.lastW);
                    const mDelta = pct(m.thisM, m.lastM);
                    return (
                      <div key={m.label} className="p-4 rounded-md border border-line bg-[var(--surface)]">
                        <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">{m.label}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[var(--text-3)]">This week</span>
                            <span className="text-sm font-bold text-ink font-mono">{m.fmt(m.thisW)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[var(--text-3)]">Last week</span>
                            <span className="text-xs text-[var(--text-3)] font-mono">{m.fmt(m.lastW)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-medium ${wDelta >= 0 ? 'text-ok' : 'text-bad'}`}>
                              {wDelta >= 0 ? '▲' : '▼'} {Math.abs(wDelta).toFixed(1)}%
                            </span>
                            <span className="text-[11px] text-[var(--text-3)]">vs last week</span>
                          </div>
                          <div className="border-t border-line pt-2 mt-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-3)]">This month</span>
                              <span className="text-sm font-bold text-ink font-mono">{m.fmt(m.thisM)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[var(--text-3)]">Last month</span>
                              <span className="text-xs text-[var(--text-3)] font-mono">{m.fmt(m.lastM)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-medium ${mDelta >= 0 ? 'text-ok' : 'text-bad'}`}>
                                {mDelta >= 0 ? '▲' : '▼'} {Math.abs(mDelta).toFixed(1)}%
                              </span>
                              <span className="text-[11px] text-[var(--text-3)]">vs last month</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </m.div>

        {/* ── Top Items by Volume ───────────────────────────────────────────── */}
        <m.div variants={item}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-ink">Top Products by Volume</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Best-selling items from completed orders</p>
              </div>
            </div>
            {(() => {
              const counts = {};
              const revenue = {};
              allOrders.filter(o => o.status === 'COMPLETED').forEach(o => {
                const name = o.productName || o.items?.[0]?.name || o.azamanId || 'Unknown';
                counts[name] = (counts[name] || 0) + 1;
                revenue[name] = (revenue[name] || 0) + (Number(o.amountUsdc) || 0);
              });
              const top = Object.entries(counts)
                .map(([name, count]) => ({ name, count, revenue: revenue[name] }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
              const maxCount = Math.max(...top.map(t => t.count), 1);

              if (top.length === 0) {
                return <p className="text-sm text-[var(--text-3)] text-center py-8">No completed orders yet to rank products.</p>;
              }
              return (
                <div className="space-y-2">
                  {top.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-3 p-3 rounded-md border border-line:bg-[var(--surface-raise)] transition-colors">
                      <span className="text-lg font-bold text-[var(--text-3)] w-6 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{t.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(t.count / maxCount) * 100}%`, background: 'var(--accent)' }} />
                          </div>
                          <span className="text-[11px] text-[var(--text-3)] flex-shrink-0">{t.count} orders · {fmtUSDC(t.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </m.div>

      </m.div>
    </ErrorBoundary>
  );
}
