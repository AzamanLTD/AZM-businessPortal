/**
 * Orders — INSTRUMENT design system (Phase 2 cutover, screen 2).
 *
 * All Forge components replaced with Instrument equivalents.
 * Kanban + table views, bulk actions, and filter bar preserved.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orders as ordersApi } from '@/lib/api';
import { bookingOpsApi } from '@/lib/marketplaceApi';
import { fmtUSDC, relativeTime, formatDateTime, ORDER_STATUS_META } from '@/lib/utils';
import {
  ShoppingBag, Search, ChevronRight, Truck, X, Grid, List,
  CheckSquare, Square, RefreshCw, DollarSign, AlertCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, Tag, Button, Skel, Empty, DataTable, BulkBar } from '@/components/instrument';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'AWAITING_PAYMENT', label: 'Awaiting Payment' },
  { value: 'PAID',             label: 'Paid' },
  { value: 'DELIVERED',        label: 'Delivered' },
  { value: 'COMPLETED',        label: 'Completed' },
  { value: 'CANCELLED',        label: 'Cancelled' },
];

const KANBAN_COLUMNS = ['AWAITING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

// Map Forge tag variants to Instrument tones
const STATUS_TONE = {
  AWAITING_PAYMENT: 'hold',
  PAID: 'info',
  DELIVERED: 'neutral',
  COMPLETED: 'go',
  CANCELLED: 'stop',
  DISPUTED: 'stop',
};

// Column dot colors
const COL_DOT = {
  AWAITING_PAYMENT: 'var(--hold)',
  PAID: 'var(--info)',
  DELIVERED: 'var(--accent)',
  COMPLETED: 'var(--go)',
  CANCELLED: 'var(--stop)',
};

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const statusFilter = searchParams.get('status') || '';

  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => ordersApi.list({ ...(statusFilter ? { status: statusFilter } : {}), limit: 200 }),
    refetchInterval: 30_000,
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: () => ordersApi.stats(),
    refetchInterval: 30_000,
  });

  const ordersList = ordersData?.orders || [];

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }) => bookingOpsApi.bulkOrderStatus(ids, status),
    onSuccess: (_, variables) => {
      toast.success(`Updated ${variables.ids.length} orders to ${variables.status}`);
      qc.invalidateQueries(['orders']);
      qc.invalidateQueries(['orders-stats']);
      setSelectedIds([]);
    },
    onError: (err) => toast.error(err.message || 'Failed to update orders'),
  });

  const handleBulkAction = async (status) => {
    if (!selectedIds.length) return;
    setBulkActionLoading(true);
    try {
      await bulkStatusMutation.mutateAsync({ ids: selectedIds, status });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredOrders = ordersList.filter(order => {
    const orderRef = (order.orderRef || '').toLowerCase();
    const customerName = (order.customer?.name || order.customerName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return orderRef.includes(search) || customerName.includes(search);
  });

  const clientStats = {
    totalCount: ordersList.length,
    awaitingPayment: ordersList.filter(o => o.status === 'AWAITING_PAYMENT').length,
    inTransit: ordersList.filter(o => o.status === 'DELIVERED').length,
    completed: ordersList.filter(o => o.status === 'COMPLETED').length,
    totalRevenue: ordersList.reduce((acc, o) => o.status !== 'CANCELLED' ? acc + (o.amount || 0) : acc, 0),
  };

  const stats = {
    totalCount: statsData?.totalCount ?? clientStats.totalCount,
    awaitingPayment: statsData?.awaitingPayment ?? clientStats.awaitingPayment,
    inTransit: statsData?.inTransit ?? clientStats.inTransit,
    completed: statsData?.completed ?? clientStats.completed,
    totalRevenue: statsData?.totalRevenue ?? clientStats.totalRevenue,
  };

  // ── KPI card helper ─────────────────────────────────────────────────────────
  const Kpi = ({ label, value, icon: Icon }) => (
    <Card style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        {Icon && <Icon size={11} strokeWidth={1.75} color="var(--text-3)" />}
        <span className="i-eyebrow">{label}</span>
      </div>
      <div className="i-num i-num--metric">{value}</div>
    </Card>
  );

  // ── Table columns for Instrument DataTable ─────────────────────────────────
  const tableColumns = [
    {
      key: 'orderRef', header: 'Order Ref', sortable: true,
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--accent)', cursor: 'pointer' }}
          onClick={() => navigate(`/orders/${row.id}`)}>
          {row.orderRef || `#${row.id.substring(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.customer?.name || row.customerName || 'Anonymous'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.customer?.azamanId || '—'}</div>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Amount', numeric: true,
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmtUSDC(row.amount)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Tag tone={STATUS_TONE[row.status] || 'neutral'}>{ORDER_STATUS_META[row.status]?.label || row.status}</Tag>,
    },
    {
      key: 'date', header: 'Created',
      render: (row) => (
        <span style={{ fontSize: 11, color: 'var(--text-3)' }} title={formatDateTime(row.created_date || row.createdAt)}>
          {relativeTime(row.created_date || row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <Button variant="ghost" size="xs" onClick={() => navigate(`/orders/${row.id}`)}>
          <ChevronRight size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ height: 2, width: 40, borderRadius: 2, background: 'var(--accent)', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.022em', margin: 0 }}>Orders Console</h1>
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>Manage orders, escrows, and fulfillment.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>Refresh</Button>
            {/* Inline segmented control */}
            <div style={{ display: 'flex', borderRadius: 'var(--r2)', border: '1px solid var(--line)', overflow: 'hidden' }}>
              <button onClick={() => setViewMode('kanban')}
                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  background: viewMode === 'kanban' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'kanban' ? 'var(--accent-text)' : 'var(--text-3)',
                  border: 0, fontSize: 12, fontWeight: 500, transition: 'all 0.12s' }}>
                <Grid size={13} /> Kanban
              </button>
              <button onClick={() => setViewMode('table')}
                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  background: viewMode === 'table' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--accent-text)' : 'var(--text-3)',
                  border: 0, fontSize: 12, fontWeight: 500, transition: 'all 0.12s' }}>
                <List size={13} /> Table
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Total Orders" value={String(stats.totalCount)} icon={ShoppingBag} />
        <Kpi label="Pending Payment" value={String(stats.awaitingPayment)} icon={Clock} />
        <Kpi label="In Transit" value={String(stats.inTransit)} icon={Truck} />
        <Kpi label="Completed" value={String(stats.completed)} icon={CheckSquare} />
        <Kpi label="Revenue" value={fmtUSDC(stats.totalRevenue)} icon={DollarSign} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by order ref or customer…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 'var(--r2)',
              border: '1px solid var(--line)', background: 'var(--surface)',
              font: '500 var(--t-sm)/1.4 var(--font)', color: 'var(--text)',
              outline: 'none', transition: 'border-color 0.12s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--line)'}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
          style={{
            padding: '8px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--line)', background: 'var(--surface)',
            font: '500 var(--t-sm)/1.4 var(--font)', color: 'var(--text)',
            cursor: 'pointer', outline: 'none',
          }}
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Content area */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => <Skel key={i} h={300} />)}
        </div>
      ) : isError ? (
        <Empty title="Connection error" body="We couldn't fetch orders. Check your connection and retry."
          action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : filteredOrders.length === 0 ? (
        <Empty
          title={searchTerm || statusFilter ? 'No matching orders' : 'No orders yet'}
          body={searchTerm || statusFilter ? 'Adjust your filters to see more.' : 'Orders from customers will appear here.'}
          action={(searchTerm || statusFilter) ? <Button variant="ghost" onClick={() => { setSearchTerm(''); setSearchParams({}); }}>Clear filters</Button> : null}
        />
      ) : viewMode === 'table' ? (
        <Card>
          <DataTable
            columns={tableColumns}
            rows={filteredOrders}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/orders/${row.id}`)}
            selected={new Set(selectedIds)}
            onSelectionChange={(newSet) => setSelectedIds([...newSet])}
            emptyState={<Empty title="No orders" body="No orders match the current filters." />}
          />
        </Card>
      ) : (
        /* Kanban view */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-start' }}>
          {KANBAN_COLUMNS.map(col => {
            const colOrders = filteredOrders.filter(o => o.status === col);
            const meta = ORDER_STATUS_META[col] || { label: col };
            return (
              <div key={col} style={{
                display: 'flex', flexDirection: 'column', borderRadius: 'var(--r3)',
                background: 'var(--surface-sunk)', padding: 12, minHeight: 400,
              }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--line)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ height: 8, width: 8, borderRadius: '50%', background: COL_DOT[col] }} />
                    <span className="i-eyebrow">{meta.label}</span>
                  </div>
                  <Tag tone="neutral">{colOrders.length}</Tag>
                </div>

                {/* Column cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', maxHeight: 600, paddingRight: 4 }}>
                  {colOrders.map(order => {
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        style={{
                          padding: 12, borderRadius: 'var(--r2)', cursor: 'pointer',
                          background: 'var(--surface)', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                          transition: 'border-color 0.12s, box-shadow 0.12s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line-firm)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--line)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>
                            {order.orderRef || `#${order.id.substring(0, 8)}`}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectOne(order.id); }}
                            style={{ padding: 2, background: 'transparent', border: 0, cursor: 'pointer' }}
                          >
                            {isSelected
                              ? <CheckSquare size={14} color="var(--accent)" />
                              : <Square size={14} color="var(--text-3)" />}
                          </button>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                          {order.customer?.name || order.customerName || 'Anonymous'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                          {order.product?.title || order.productTitle || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {fmtUSDC(order.amount)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                            {relativeTime(order.created_date || order.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkBar
        count={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={
          <>
            <Button size="sm" variant="primary" onClick={() => handleBulkAction('DELIVERED')} icon={Truck} disabled={bulkActionLoading}>
              Mark Delivered
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleBulkAction('CANCELLED')} icon={X} disabled={bulkActionLoading}>
              Cancel
            </Button>
          </>
        }
      />
    </div>
  );
}
