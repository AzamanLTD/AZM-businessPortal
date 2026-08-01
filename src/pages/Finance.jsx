// src/pages/Finance.jsx
// Module 07 — Finance, Ledger & Payouts
// Full financial hub: Dashboard, P&L, Expenses & Ledger, Payroll Position, Payout Settings
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Receipt, Download,
  Plus, Trash2, RefreshCw, AlertTriangle, Calendar, Building2, Repeat,
  PiggyBank, Shield, ArrowRight, Clock, CheckCircle2
} from 'lucide-react';
import { financeApi, employeeApi } from '@/lib/marketplaceApi';
import { request } from '@/lib/apiCore';
import { fmtUSDC, fmtUSDC as fmtUsd } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/lib/AuthContext';
import {
  Card, Button, Badge, Input, Select, Modal, Empty, Skeleton, Switch
} from '@/components/forge';
import { KpiCard, DonutChartCard, AreaChartCard, BarChartCard } from '@/components/charts';
import { toast } from 'sonner';

const TABS = [
  { key: 'dashboard',   label: 'Dashboard',      icon: TrendingUp },
  { key: 'pnl',         label: 'P&L Statement',   icon: Receipt },
  { key: 'expenses',    label: 'Expenses & Ledger', icon: Wallet },
  { key: 'payroll',     label: 'Payroll Position', icon: PiggyBank },
  { key: 'payout',      label: 'Payout Settings',  icon: Shield },
];

const RANGES = [
  { key: '7d',  label: '7 Days',   days: 7 },
  { key: '30d', label: '30 Days',  days: 30 },
  { key: '90d', label: '90 Days',  days: 90 },
];

const SOURCE_BADGES = {
  MANUAL:              { color: 'var(--f-info)',   label: 'Manual' },
  PAYROLL:             { color: 'var(--f-tint-color)',  label: 'Payroll' },
  INVENTORY_RESTOCK:  { color: 'var(--f-warn)',   label: 'Inventory' },
  VEHICLE_MAINTENANCE: { color: 'var(--f-bad)',     label: 'Maintenance' },
  AD_SPEND:            { color: 'var(--f-tint-color)',    label: 'Ad Spend' },
};

// fmtUsd and fmtUSDC imported from @/lib/utils

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0%';
  return `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Finance() {
  const { hasPermission } = usePermission();
  const { bizProfile } = useAuth();
    const location = useLocation();
    const pathTab = location.pathname.split('/finance/')[1] || 'dashboard';
    const tabFromUrl = pathTab === 'pnl' ? 'pnl' : pathTab === 'expenses' ? 'expenses' : pathTab === 'payouts' ? 'payout' : pathTab === 'disputes' ? 'expenses' : 'dashboard';
    const [tab, setTab] = useState(tabFromUrl);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rangeDays = useMemo(() => RANGES.find(r => r.key === range)?.days ?? 30, [range]);

  const canView = hasPermission('finance.view');
  const canManage = hasPermission('finance.ledger.manage');

  if (!canView) {
    return (
      <div className="p-8">
        <EmptyState icon={Shield} title="No access" description="You don't have permission to view finance." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--f-text)]">Finance & Ledger</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Track revenue, expenses, P&L, payroll liability, and payout destinations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--f-line)] p-1">
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r.key
                    ? 'bg-[var(--f-tint-color)] text-[var(--f-text)]'
                    : 'text-[var(--f-text-3)]:text-[var(--f-text)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--f-line)] overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-[var(--f-tint-color)] text-[var(--f-text)]'
                  : 'border-transparent text-[var(--f-text-3)]:text-[var(--f-text)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'dashboard'   && <DashboardTab rangeDays={rangeDays} canManage={canManage} />}
      {tab === 'pnl'         && <PnLTab rangeDays={rangeDays} />}
      {tab === 'expenses'    && <ExpensesTab canManage={canManage} />}
      {tab === 'payroll'     && <PayrollTab />}
      {tab === 'payout'      && <PayoutTab canManage={canManage} />}
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────
function DashboardTab({ rangeDays, canManage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escrow, setEscrow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, esc] = await Promise.all([
        financeApi.getDashboard({ days: rangeDays }),
        financeApi.getEscrowHeld().catch(() => null),
      ]);
      setData(dash);
      setEscrow(esc);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const revenue = data?.revenue ?? data?.totalRevenue ?? 0;
  const expenses = data?.expenses ?? data?.totalExpenses ?? 0;
  const netProfit = revenue - expenses;
  const revenueDelta = data?.revenueDelta ?? data?.revenueChangePct ?? 0;
  const expenseDelta = data?.expenseDelta ?? data?.expensesChangePct ?? 0;
  const outstanding = data?.outstandingInvoices ?? 0;
  const payrollLiability = data?.upcomingPayroll ?? 0;

  // Revenue by category for donut
  const donutData = (data?.revenueByCategory ?? []).map(c => ({
    name: c.category || c.label || 'Other',
    value: Number(c.amount ?? c.value ?? 0),
  }));

  // Cash flow time series
  const cashflowData = (data?.cashflow ?? data?.cashFlowSeries ?? []).map(p => ({
    date: p.date || p.label,
    inflow: Number(p.inflow ?? p.revenue ?? 0),
    outflow: Number(p.outflow ?? p.expense ?? 0),
  }));

  return (
    <div className="space-y-6">
      {/* Escrow Warning Banner */}
      {escrow?.totalHeld > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-warn bg-warn/10">
          <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--f-text)]">
              {fmtUsd(escrow.totalHeld)} held in escrow across open orders
            </p>
            <p className="text-xs text-[var(--f-text-3)] mt-0.5">
              These funds are not yet released to your available balance. Settlement occurs when orders are fulfilled.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Revenue"
          value={fmtUsd(revenue)}
          delta={fmtPct(revenueDelta)}
          deltaType={revenueDelta >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          color="var(--f-ok)"
        />
        <KpiCard
          label="Expenses"
          value={fmtUsd(expenses)}
          delta={fmtPct(expenseDelta)}
          deltaType={expenseDelta <= 0 ? 'positive' : 'negative'}
          icon={TrendingDown}
          color="var(--f-bad)"
        />
        <KpiCard
          label="Net Profit"
          value={fmtUsd(netProfit)}
          delta={revenue - expenses > 0 ? 'Positive' : 'Negative'}
          deltaType={netProfit >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          color="var(--f-tint-color)"
        />
        <KpiCard
          label="Outstanding Invoices"
          value={fmtUsd(outstanding)}
          icon={Receipt}
          color="var(--f-warn)"
        />
        <KpiCard
          label="Payroll Liability"
          value={fmtUsd(payrollLiability)}
          icon={PiggyBank}
          color="var(--f-info)"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartCard
          title="Cash Flow Trend"
          data={cashflowData.length > 0 ? cashflowData : [{ date: '—', inflow: 0, outflow: 0 }]}
          xKey="date"
          yKey="inflow"
          color="var(--f-ok)"
          formatY={(v) => `$${(v / 1000).toFixed(1)}k`}
        />
        <DonutChartCard
          title="Revenue Breakdown"
          data={donutData.length > 0 ? donutData : [{ name: 'No data', value: 1 }]}
        />
      </div>
    </div>
  );
}

// ── P&L Tab ────────────────────────────────────────────────────────────────
function PnLTab({ rangeDays }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getPnL({ days: rangeDays });
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['P&L Statement', '', ''],
      ['Period', data.period || `${rangeDays} days`, ''],
      ['', '', ''],
      ['Line Item', 'Current Period', 'Prior Period'],
    ];
    (data.revenueLines || []).forEach(l => rows.push([l.label || l.category, l.amount ?? l.value, l.priorAmount ?? l.prior ?? '']));
    rows.push(['Total Revenue', data.totalRevenue ?? 0, data.priorRevenue ?? 0]);
    rows.push(['', '', '']);
    (data.cogsLines || []).forEach(l => rows.push([l.label || l.category, l.amount ?? l.value, l.priorAmount ?? l.prior ?? '']));
    rows.push(['Total COGS', data.totalCogs ?? 0, data.priorCogs ?? 0]);
    rows.push(['Gross Profit', data.grossProfit ?? (data.totalRevenue - data.totalCogs) ?? 0, '']);
    rows.push(['', '', '']);
    (data.opexLines || data.operatingExpenses || []).forEach(l => rows.push([l.label || l.category, l.amount ?? l.value, l.priorAmount ?? l.prior ?? '']));
    rows.push(['Total OpEx', data.totalOpex ?? 0, data.priorOpex ?? 0]);
    rows.push(['Net Profit', data.netProfit ?? 0, data.priorNetProfit ?? 0]);

    const csv = rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnl-${rangeDays}d-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PnLSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const revenueLines = data?.revenueLines ?? [];
  const cogsLines = data?.cogsLines ?? [];
  const opexLines = data?.operatingExpenses ?? data?.opexLines ?? [];
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalCogs = data?.totalCogs ?? 0;
  const grossProfit = data?.grossProfit ?? (totalRevenue - totalCogs);
  const totalOpex = data?.totalOpex ?? 0;
  const netProfit = data?.netProfit ?? (grossProfit - totalOpex);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--f-text)]">Profit & Loss Statement</h2>
          <p className="text-sm text-[var(--f-text-3)]">
            {data?.period || `Last ${rangeDays} days`} · Prior period comparison
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--f-line)] bg-[var(--f-surface)]">
              <th className="text-left py-3 px-4 font-semibold text-[var(--f-text)]">Line Item</th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--f-text)]">Current</th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--f-text-3)]">Prior</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr className="border-b border-[var(--f-line)]">
              <td colSpan={3} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-[var(--f-text-3)] bg-[var(--f-surface)]/50">Revenue</td>
            </tr>
            {revenueLines.map((l, i) => (
              <tr key={i} className="border-b border-[var(--f-line)]/50">
                <td className="py-2 px-4 text-[var(--f-text-3)] pl-8">{l.label || l.category || '—'}</td>
                <td className="py-2 px-4 text-right text-[var(--f-text)]">{fmtUsd(l.amount ?? l.value ?? 0)}</td>
                <td className="py-2 px-4 text-right text-[var(--f-text-3)]">{fmtUsd(l.priorAmount ?? l.prior ?? 0)}</td>
              </tr>
            ))}
            <tr className="border-b-2 border-[var(--f-line)]">
              <td className="py-2 px-4 font-semibold text-[var(--f-text)]">Total Revenue</td>
              <td className="py-2 px-4 text-right font-bold text-[var(--f-ok)]">{fmtUsd(totalRevenue)}</td>
              <td className="py-2 px-4 text-right font-semibold text-[var(--f-text-3)]">{fmtUsd(data?.priorRevenue ?? 0)}</td>
            </tr>

            {/* COGS */}
            {cogsLines.length > 0 && (
              <>
                <tr className="border-b border-[var(--f-line)]">
                  <td colSpan={3} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-[var(--f-text-3)] bg-[var(--f-surface)]/50">Cost of Goods / Services</td>
                </tr>
                {cogsLines.map((l, i) => (
                  <tr key={i} className="border-b border-[var(--f-line)]/50">
                    <td className="py-2 px-4 text-[var(--f-text-3)] pl-8">{l.label || l.category || '—'}</td>
                    <td className="py-2 px-4 text-right text-[var(--f-text)]">({fmtUsd(l.amount ?? l.value ?? 0)})</td>
                    <td className="py-2 px-4 text-right text-[var(--f-text-3)]">({fmtUsd(l.priorAmount ?? l.prior ?? 0)})</td>
                  </tr>
                ))}
                <tr className="border-b-2 border-[var(--f-line)]">
                  <td className="py-2 px-4 font-semibold text-[var(--f-text)]">Total COGS</td>
                  <td className="py-2 px-4 text-right font-bold text-[var(--f-bad)]">({fmtUsd(totalCogs)})</td>
                  <td className="py-2 px-4 text-right font-semibold text-[var(--f-text-3)]">({fmtUsd(data?.priorCogs ?? 0)})</td>
                </tr>
              </>
            )}

            {/* Gross Profit */}
            <tr className="border-b-2 border-[var(--f-tint-color)]/30 bg-[var(--f-tint-color)]/5">
              <td className="py-3 px-4 font-bold text-[var(--f-text)]">Gross Profit</td>
              <td className="py-3 px-4 text-right font-bold text-[var(--f-tint-color)]">{fmtUsd(grossProfit)}</td>
              <td className="py-3 px-4 text-right font-semibold text-[var(--f-text-3)]">{fmtUsd(data?.priorGrossProfit ?? 0)}</td>
            </tr>

            {/* Operating Expenses */}
            <tr className="border-b border-[var(--f-line)]">
              <td colSpan={3} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-[var(--f-text-3)] bg-[var(--f-surface)]/50">Operating Expenses</td>
            </tr>
            {opexLines.length > 0 ? (
              opexLines.map((l, i) => (
                <tr key={i} className="border-b border-[var(--f-line)]/50">
                  <td className="py-2 px-4 text-[var(--f-text-3)] pl-8">{l.label || l.category || '—'}</td>
                  <td className="py-2 px-4 text-right text-[var(--f-text)]">({fmtUsd(l.amount ?? l.value ?? 0)})</td>
                  <td className="py-2 px-4 text-right text-[var(--f-text-3)]">({fmtUsd(l.priorAmount ?? l.prior ?? 0)})</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-[var(--f-line)]/50">
                <td className="py-2 px-4 text-[var(--f-text-3)] pl-8 italic">No operating expenses recorded</td>
                <td colSpan={2} />
              </tr>
            )}
            <tr className="border-b-2 border-[var(--f-line)]">
              <td className="py-2 px-4 font-semibold text-[var(--f-text)]">Total OpEx</td>
              <td className="py-2 px-4 text-right font-bold text-[var(--f-bad)]">({fmtUsd(totalOpex)})</td>
              <td className="py-2 px-4 text-right font-semibold text-[var(--f-text-3)]">({fmtUsd(data?.priorOpex ?? 0)})</td>
            </tr>

            {/* Net Profit */}
            <tr className="bg-[var(--f-tint-color)]/10">
              <td className="py-3 px-4 font-bold text-[var(--f-text)]">Net Profit</td>
              <td className={`py-3 px-4 text-right font-bold ${netProfit >= 0 ? 'text-[var(--f-ok)]' : 'text-[var(--f-bad)]'}`}>
                {netProfit >= 0 ? fmtUsd(netProfit) : `(${fmtUsd(Math.abs(netProfit))})`}
              </td>
              <td className="py-3 px-4 text-right font-semibold text-[var(--f-text-3)]">{fmtUsd(data?.priorNetProfit ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Expenses & Ledger Tab ─────────────────────────────────────────────────
function ExpensesTab({ canManage }) {
    const [expenses, setExpenses] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [exp, rec] = await Promise.all([
        financeApi.getExpenses({ days: 90 }).catch(() => []),
        financeApi.getRecurring().catch(() => []),
      ]);
      setExpenses(Array.isArray(exp) ? exp : exp?.entries ?? []);
      setRecurring(Array.isArray(rec) ? rec : rec?.templates ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (filter === 'ALL') return expenses;
    return expenses.filter(e => (e.sourceType || e.source) === filter);
  }, [expenses, filter]);

  const handleAddEntry = async (formData) => {
    try {
      await financeApi.createLedgerEntry(formData);
      toast.success('Entry added');
      setShowEntryModal(false);
      load();
    } catch (e) {
      toast.error(`Failed to add entry: ${e.message}`);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm('Delete this ledger entry? This cannot be undone.')) return;
    try {
      await financeApi.deleteLedgerEntry(id);
      toast.success('Entry deleted');
      load();
    } catch (e) {
      toast.error(`Failed to delete: ${e.message}`);
    }
  };

  const handleToggleRecurring = async (item) => {
    try {
      await financeApi.updateRecurring(item.id, { isActive: !item.isActive });
      toast.success(`Recurring ${item.isActive ? 'paused' : 'activated'}`);
      load();
    } catch (e) {
      toast.error(`Failed to update: ${e.message}`);
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!confirm('Delete this recurring template?')) return;
    try {
      await financeApi.deleteRecurring(id);
      toast.success('Template deleted');
      load();
    } catch (e) {
      toast.error(`Failed to delete: ${e.message}`);
    }
  };

  const handleAddRecurring = async (formData) => {
    try {
      await financeApi.createRecurring(formData);
      toast.success('Recurring template created');
      setShowRecurringModal(false);
      load();
    } catch (e) {
      toast.error(`Failed to create template: ${e.message}`);
    }
  };

  if (loading) return <ExpensesSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      {/* Expense List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--f-text)]">Expense Ledger</h2>
          {canManage && (
            <Button size="sm" onClick={() => setShowEntryModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          )}
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === 'ALL'
                ? 'bg-[var(--f-tint-color)] text-[var(--f-text)]'
                : 'bg-[var(--f-surface)] text-[var(--f-text-3)] border border-[var(--f-line)]:text-[var(--f-text)]'
            }`}
          >
            All Sources
          </button>
          {Object.entries(SOURCE_BADGES).map(([key, b]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === key
                  ? 'text-[var(--f-text)]'
                  : 'bg-[var(--f-surface)] text-[var(--f-text-3)] border border-[var(--f-line)]:text-[var(--f-text)]'
              }`}
              style={filter === key ? { background: b.color } : {}}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Expense Table */}
        {filteredExpenses.length === 0 ? (
          <EmptyState icon={Wallet} title="No expenses found" description="Add a manual entry or adjust your filters." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--f-line)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Source</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--f-text-3)]">Amount</th>
                  {canManage && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.slice(0, 100).map((e, i) => {
                  const src = e.sourceType || e.source || 'MANUAL';
                  const badge = SOURCE_BADGES[src] || { color: 'var(--f-text-3)', label: src };
                  return (
                    <tr key={e.id || i} className="border-b border-[var(--f-line)]/50:bg-[var(--f-surface)]/50">
                      <td className="py-2.5 px-4 text-[var(--f-text-3)]">{fmtDate(e.createdAt || e.date)}</td>
                      <td className="py-2.5 px-4 text-[var(--f-text)]">{e.category || '—'}</td>
                      <td className="py-2.5 px-4">
                        <Tag color={badge.color}>{badge.label}</Tag>
                      </td>
                      <td className="py-2.5 px-4 text-[var(--f-text-3)] max-w-xs truncate">{e.description || e.note || '—'}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-[var(--f-bad)]">
                        ({fmtUsd(e.amount ?? e.value ?? 0)})
                      </td>
                      {canManage && (
                        <td className="py-2.5 px-4">
                          {src === 'MANUAL' && (
                            <button
                              onClick={() => handleDeleteEntry(e.id)}
                              className="text-[var(--f-text-3)]:text-[var(--f-bad)] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Recurring Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[var(--f-text-3)]" />
            <h2 className="text-lg font-bold text-[var(--f-text)]">Recurring Expenses</h2>
          </div>
          {canManage && (
            <Button size="sm" variant="secondary" onClick={() => setShowRecurringModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          )}
        </div>

        {recurring.length === 0 ? (
          <EmptyState icon={Repeat} title="No recurring templates" description="Automate monthly expenses like rent or subscriptions." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurring.map((r, i) => (
              <Card key={r.id || i} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--f-text)]">{r.name}</h3>
                      <Tag color={r.isActive ? 'var(--f-ok)' : 'var(--f-text-3)'} bg={r.isActive ? 'var(--f-ok)' : undefined}>
                        {r.isActive ? 'Active' : 'Paused'}
                      </Tag>
                    </div>
                    <p className="text-sm text-[var(--f-text-3)] mt-1">
                      {fmtUsd(r.amount)} · {r.frequency?.toLowerCase() || 'monthly'} · {r.category}
                    </p>
                    {r.description && (
                      <p className="text-xs text-[var(--f-text-3)] mt-2">{r.description}</p>
                    )}
                    {r.nextDueAt && (
                      <p className="text-xs text-[var(--f-text-3)] mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Next due: {fmtDate(r.nextDueAt)}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Switch checked={r.isActive} onChange={() => handleToggleRecurring(r)} />
                      <button
                        onClick={() => handleDeleteRecurring(r.id)}
                        className="text-[var(--f-text-3)]:text-[var(--f-bad)] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showEntryModal && (
        <ManualEntryModal onClose={() => setShowEntryModal(false)} onSubmit={handleAddEntry} />
      )}

      {/* Recurring Template Modal */}
      {showRecurringModal && (
        <RecurringModal onClose={() => setShowRecurringModal(false)} onSubmit={handleAddRecurring} />
      )}
    </div>
  );
}

// ── Manual Entry Modal ─────────────────────────────────────────────────────
function ManualEntryModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], type: 'EXPENSE' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      sourceType: 'MANUAL',
    }).finally(() => setSubmitting(false));
  };

  return (
    <Modal open onClose={onClose} title="Add Manual Ledger Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={[
            { value: 'EXPENSE', label: 'Expense' },
            { value: 'INCOME', label: 'Income' },
          ]}
          required
        />
        <Input
          label="Category"
          placeholder="e.g. Rent, Utilities, Supplies"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        />
        <Input
          label="Amount (USDC)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <Input
          label="Description"
          placeholder="Optional notes"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add Entry</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Recurring Template Modal ───────────────────────────────────────────────
function RecurringModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '', category: '', amount: '', description: '',
    frequency: 'MONTHLY', dayOfMonth: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      dayOfMonth: parseInt(form.dayOfMonth),
    }).finally(() => setSubmitting(false));
  };

  return (
    <Modal open onClose={onClose} title="Add Recurring Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g. Monthly Rent"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Category"
          placeholder="e.g. Rent, Utilities"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        />
        <Input
          label="Amount (USDC)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <Select
          label="Frequency"
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          options={[
            { value: 'MONTHLY', label: 'Monthly' },
            { value: 'WEEKLY', label: 'Weekly' },
            { value: 'QUARTERLY', label: 'Quarterly' },
          ]}
        />
        {form.frequency === 'MONTHLY' && (
          <Input
            label="Day of Month (1-28)"
            type="number"
            min="1"
            max="28"
            value={form.dayOfMonth}
            onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
          />
        )}
        <Input
          label="Description"
          placeholder="Optional notes"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create Template</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Payroll Position Tab ───────────────────────────────────────────────────
function PayrollTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getPayrollPosition();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PayrollSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const pending = data?.pendingPayroll ?? data?.pending ?? 0;
  const approved = data?.approvedPayroll ?? data?.approved ?? 0;
  const disbursed = data?.disbursedPayroll ?? data?.disbursed ?? 0;
  const ewaFloat = data?.ewaOutstanding ?? data?.ewaFloat ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--f-text)]">Payroll Financial Position</h2>
        <p className="text-sm text-[var(--f-text-3)] mt-1">
          Financial view of payroll liability vs. what's been disbursed. For running payroll, go to the Payroll page.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-warn/10">
              <Clock className="w-5 h-5 text-warn" />
            </div>
            <span className="text-sm font-medium text-[var(--f-text-3)]">Pending</span>
          </div>
          <p className="text-2xl font-bold text-[var(--f-text)]">{fmtUsd(pending)}</p>
          <p className="text-xs text-[var(--f-text-3)] mt-1">Awaiting approval</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--f-info)]/10">
              <CheckCircle2 className="w-5 h-5 text-[var(--f-info)]" />
            </div>
            <span className="text-sm font-medium text-[var(--f-text-3)]">Approved</span>
          </div>
          <p className="text-2xl font-bold text-[var(--f-text)]">{fmtUsd(approved)}</p>
          <p className="text-xs text-[var(--f-text-3)] mt-1">Ready for disbursement</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--f-ok)]/10">
              <DollarSign className="w-5 h-5 text-[var(--f-ok)]" />
            </div>
            <span className="text-sm font-medium text-[var(--f-text-3)]">Disbursed</span>
          </div>
          <p className="text-2xl font-bold text-[var(--f-text)]">{fmtUsd(disbursed)}</p>
          <p className="text-xs text-[var(--f-text-3)] mt-1">Paid this period</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--f-tint-color)]/10">
              <PiggyBank className="w-5 h-5 text-[var(--f-tint-color)]" />
            </div>
            <span className="text-sm font-medium text-[var(--f-text-3)]">EWA Float</span>
          </div>
          <p className="text-2xl font-bold text-[var(--f-text)]">{fmtUsd(ewaFloat)}</p>
          <p className="text-xs text-[var(--f-text-3)] mt-1">Early wage outstanding</p>
        </Card>
      </div>

      {/* Disbursement History */}
      {data?.disbursementHistory?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--f-text)]">Disbursement History</h3>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--f-line)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Recipients</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--f-text-3)]">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--f-text-3)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.disbursementHistory.map((d, i) => (
                  <tr key={d.id || i} className="border-b border-[var(--f-line)]/50">
                    <td className="py-2.5 px-4 text-[var(--f-text-3)]">{fmtDate(d.date || d.createdAt)}</td>
                    <td className="py-2.5 px-4 text-[var(--f-text)]">{d.recipientCount ?? d.count ?? '—'}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-[var(--f-text)]">{fmtUsd(d.amount ?? d.total ?? 0)}</td>
                    <td className="py-2.5 px-4">
                      <Tag color={d.status === 'COMPLETED' ? 'var(--f-ok)' : d.status === 'FAILED' ? 'var(--f-bad)' : 'var(--f-warn)'}>
                        {d.status || 'PENDING'}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Payout Settings Tab ───────────────────────────────────────────────────
const PAYOUT_TYPES = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'MOMO', label: 'Mobile Money' },
  { value: 'BINANCE_PAY', label: 'Binance Pay' },
  { value: 'TRC20', label: 'TRC20 (USDT)' },
  { value: 'ERC20', label: 'ERC20 (USDT)' },
];

function PayoutTab({ canManage }) {
    const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nickname: '', destinationType: 'BANK', destinationAddress: '', isExternalCrypto: false });

  const loadDestinations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request('/api/payout-destinations');
      setDestinations(data?.destinations || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payout destinations');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadDestinations(); }, [loadDestinations]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.nickname.trim() || !form.destinationAddress.trim()) {
      toast.error('Nickname and destination address are required');
      return;
    }
    try {
      setSubmitting(true);
      await request('/api/payout-destinations', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Payout destination added');
      setShowAdd(false);
      setForm({ nickname: '', destinationType: 'BANK', destinationAddress: '', isExternalCrypto: false });
      loadDestinations();
    } catch (err) {
      toast.error(err.message || 'Failed to add destination');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this payout destination?')) return;
    try {
      await request(`/api/payout-destinations/${id}`, { method: 'DELETE' });
      toast.success('Destination removed');
      loadDestinations();
    } catch (err) {
      toast.error(err.message || 'Failed to remove destination');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await request(`/api/payout-destinations/${id}/default`, { method: 'PATCH' });
      toast.success('Default destination updated');
      loadDestinations();
    } catch (err) {
      toast.error(err.message || 'Failed to set default');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--f-text)]">Payout Destination Settings</h2>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Manage where your business receives its funds. Changes require owner re-authentication.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(s => !s)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Destination
          </Button>
        )}
      </div>

      {/* Security Warning */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-warn bg-warn/10">
        <Shield className="w-5 h-5 text-warn flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[var(--f-text)]">High-value security action</p>
          <p className="text-xs text-[var(--f-text-3)] mt-0.5">
            Only the business owner can add or change payout destinations. All changes are audit-logged.
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && canManage && (
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm">New Payout Destination</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input
              placeholder="Nickname (e.g. 'Main Bank Account')"
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            />
            <Select
              value={form.destinationType}
              onChange={e => {
                const type = e.target.value;
                setForm(f => ({ ...f, destinationType: type, isExternalCrypto: ['TRC20','ERC20','BINANCE_PAY'].includes(type) }));
              }}
            >
              {PAYOUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Input
              placeholder="Destination address (account number, wallet address, phone number)"
              value={form.destinationAddress}
              onChange={e => setForm(f => ({ ...f, destinationAddress: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Destination'}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Destinations List */}
      {loading ? (
        <Card className="p-8 text-center">
          <Skel className="h-16 w-full" />
        </Card>
      ) : destinations.length === 0 ? (
        <Empty
          icon={Building2}
          title="No payout destinations yet"
          description="Add a bank account, mobile money, or on-chain wallet to receive your business payouts."
        />
      ) : (
        <div className="space-y-3">
          {destinations.map(dest => (
            <Card key={dest.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-tint/10">
                  {dest.isExternalCrypto
                    ? <Wallet className="w-5 h-5 text-tint" />
                    : <Building2 className="w-5 h-5 text-tint" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{dest.nickname}</p>
                    {dest.isDefault && <Tag variant="success" size="sm">Default</Tag>}
                  </div>
                  <p className="text-xs text-[var(--f-text-3)] font-mono mt-0.5">
                    {dest.destinationType} • {dest.destinationAddress?.substring(0, 20)}{dest.destinationAddress?.length > 20 ? '...' : ''}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  {!dest.isDefault && (
                    <Button variant="secondary" size="sm" onClick={() => handleSetDefault(dest.id)}>
                      Set Default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(dest.id)}>
                    <Trash2 className="w-4 h-4 text-bad" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />
        <div className="h-64 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />
      </div>
    </div>
  );
}

function PnLSkeleton() {
  return <div className="h-96 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />;
}

function ExpensesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-48 rounded-lg skeleton-sentry" />
      <div className="h-64 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />
      <div className="h-32 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />
    </div>
  );
}

function PayrollSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 rounded-2xl border border-[var(--f-line)] skeleton-sentry" />
      ))}
    </div>
  );
}

// ── Error State ────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <AlertTriangle className="w-10 h-10 text-[var(--f-bad)]" />
      <p className="text-sm text-[var(--f-text-3)]">Failed to load: {message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

// Retire FinanceV2 — re-export Finance
export { default as FinanceV2 } from './Finance';
