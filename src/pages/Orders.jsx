/**
 * Orders — Forge rebuild.
 * DataTable + Segmented view toggle. Kanban uses --f-surface-sunken (fixes B8).
 * Bulk bar = sticky footer, not floating glass panel.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orders as ordersApi } from '@/lib/api';
import { bookingOpsApi } from '@/lib/marketplaceApi';
import { fmtUSDC, relativeTime, formatDateTime, ORDER_STATUS_META, cn } from '@/lib/utils';
import {
  ShoppingBag, Search, ChevronRight, Truck, X, Grid, List,
  CheckSquare, Square, RefreshCw, DollarSign, AlertCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, KpiCard, Card, CardHead, CardTitle, CardBody, Tag,
  Button, Segmented, EmptyState, Skel, DataTable, Field,
} from '@/components/forge';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'AWAITING_PAYMENT', label: 'Awaiting Payment' },
  { value: 'PAID',             label: 'Paid' },
  { value: 'DELIVERED',        label: 'Delivered' },
  { value: 'COMPLETED',        label: 'Completed' },
  { value: 'CANCELLED',        label: 'Cancelled' },
];

const KANBAN_COLUMNS = ['AWAITING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

// Tag variant mapping for order statuses
const STATUS_TAG_VARIANT = {
  AWAITING_PAYMENT: 'warn',
  PAID: 'info',
  DELIVERED: 'accent',
  COMPLETED: 'ok',
  CANCELLED: 'bad',
  DISPUTED: 'bad',
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

  const handleSelectAll = (filtered) => {
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(o => o.id));
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

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'select', label: '',
      render: (row) => (
        <button onClick={(e) => { e.stopPropagation(); handleSelectOne(row.id); }}
                className="p-1 rounded:bg-surface-sunken transition-colors">
          {selectedIds.includes(row.id)
            ? <CheckSquare className="h-3.5 w-3.5 text-tint" />
            : <Square className="h-3.5 w-3.5 text-ink-3" />}
        </button>
      ),
    },
    {
      key: 'orderRef', label: 'Order Ref', sortable: true, sortValue: r => r.orderRef,
      render: (row) => (
        <span className="f-mono text-sm font-medium text-tint cursor-pointer:underline"
              onClick={() => navigate(`/orders/${row.id}`)}>
          {row.orderRef || `#${row.id.substring(0, 8)}`}
        </span>
      ),
    },
    {
      key: 'customer', label: 'Customer', sortable: true,
      sortValue: r => r.customer?.name || r.customerName || '',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.customer?.name || row.customerName || 'Anonymous'}</p>
          <p className="text-[11px] text-ink-3">{row.customer?.azamanId || '—'}</p>
        </div>
      ),
    },
    {
      key: 'amount', label: 'Amount', sortable: true, sortValue: r => r.amount,
      render: (row) => <span className="f-mono text-sm font-semibold text-ink">{fmtUSDC(row.amount)}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (row) => <Tag variant={STATUS_TAG_VARIANT[row.status] || 'neutral'}>{ORDER_STATUS_META[row.status]?.label || row.status}</Tag>,
    },
    {
      key: 'date', label: 'Created', sortable: true,
      sortValue: r => new Date(r.created_date || r.createdAt).getTime(),
      render: (row) => (
        <span className="text-[11px] text-ink-3" title={formatDateTime(row.created_date || row.createdAt)}>
          {relativeTime(row.created_date || row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${row.id}`)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="f-content">
      <PageHeader title="Orders Console"
        subtitle="Manage orders, escrows, and fulfillment."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>Refresh</Button>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'kanban', label: 'Kanban', icon: Grid },
                { value: 'table', label: 'Table', icon: List },
              ]}
            />
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <KpiCard label="Total Orders" value={String(stats.totalCount)} icon={ShoppingBag} />
        <KpiCard label="Pending Payment" value={String(stats.awaitingPayment)} icon={Clock} deltaTone="down" />
        <KpiCard label="In Transit" value={String(stats.inTransit)} icon={Truck} />
        <KpiCard label="Completed" value={String(stats.completed)} icon={CheckSquare} deltaTone="up" />
        <KpiCard label="Revenue" value={fmtUSDC(stats.totalRevenue)} icon={DollarSign} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order ref or customer…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="f-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
          className="f-input w-full sm:w-48"
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skel key={i} h={300} />)}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Connection error"
          description="We couldn't fetch orders. Check your connection and retry."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={searchTerm || statusFilter ? "No matching orders" : "No orders yet"}
          description={searchTerm || statusFilter ? "Adjust your filters to see more." : "Orders from customers will appear here."}
          action={(searchTerm || statusFilter) ? <Button variant="ghost" onClick={() => { setSearchTerm(''); setSearchParams({}); }}>Clear filters</Button> : null}
        />
      ) : viewMode === 'table' ? (
        /* Table view */
        <Card>
          <DataTable data={filteredOrders} columns={columns} pageSize={20} />
        </Card>
      ) : (
        /* Kanban view — uses --f-surface-sunken (fixes B8) */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {KANBAN_COLUMNS.map(col => {
            const colOrders = filteredOrders.filter(o => o.status === col);
            const meta = ORDER_STATUS_META[col] || { label: col };
            return (
              <div key={col} className="flex flex-col rounded-md bg-surface-sunken p-3 min-h-[400px]">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full',
                      col === 'AWAITING_PAYMENT' && 'bg-warn',
                      col === 'PAID' && 'bg-info',
                      col === 'DELIVERED' && 'bg-tint',
                      col === 'COMPLETED' && 'bg-ok',
                      col === 'CANCELLED' && 'bg-bad',
                    )} />
                    <span className="f-eyebrow">{meta.label}</span>
                  </div>
                  <Tag variant="neutral">{colOrders.length}</Tag>
                </div>

                {/* Column cards */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colOrders.map(order => {
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'f-card p-3 cursor-pointer transition-all',
                          isSelected ? 'border-tint shadow-sm' : 'hover:border-line-strong:shadow-sm',
                        )}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="f-mono text-xs font-medium text-tint">{order.orderRef || `#${order.id.substring(0, 8)}`}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectOne(order.id); }}
                            className="p-0.5 rounded:bg-surface-raised transition-colors"
                          >
                            {isSelected
                              ? <CheckSquare className="h-3.5 w-3.5 text-tint" />
                              : <Square className="h-3.5 w-3.5 text-ink-3" />}
                          </button>
                        </div>
                        <p className="text-sm font-medium text-ink mb-1">{order.customer?.name || order.customerName || 'Anonymous'}</p>
                        <p className="text-xs text-ink-3 mb-2">{order.product?.title || order.productTitle || '—'}</p>
                        <div className="flex items-center justify-between">
                          <span className="f-mono text-sm font-semibold text-ink">{fmtUSDC(order.amount)}</span>
                          <span className="text-[10px] text-ink-3">{relativeTime(order.created_date || order.createdAt)}</span>
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

      {/* Bulk action bar — sticky footer, not floating glass */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-0 mt-4 -mx-4 px-4 py-3 border-t border-line bg-surface flex items-center gap-3">
          <span className="f-mono text-xs font-semibold text-ink">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-line" />
          <Button size="sm" variant="primary"
                  onClick={() => handleBulkAction('DELIVERED')} icon={Truck}>
            Mark Delivered
          </Button>
          <Button size="sm" variant="ghost"
                  onClick={() => handleBulkAction('CANCELLED')} icon={X}
                  className="text-bad border border-bad">
            Cancel
          </Button>
          <button onClick={() => setSelectedIds([])} className="ml-auto p-1.5 rounded:bg-surface-sunken transition-colors">
            <X className="h-4 w-4 text-ink-3" />
          </button>
        </div>
      )}
    </div>
  );
}
