import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orders as ordersApi } from '@/lib/api';
import { bookingOpsApi } from '@/lib/marketplaceApi';
import { Card, Badge, Button, Empty, Skeleton, Modal, Textarea, Input, Select } from '@/components/ui';
import { Widget, WidgetStat } from '@/components/ui/Widget';
import { DataTable } from '@/components/ui/DataTable';
import { fmtUSDC, relativeTime, formatDateTime, ORDER_STATUS_META } from '@/lib/utils';
import { 
  ShoppingBag, Search, ChevronRight, Truck, X, Grid, List, CheckSquare, Square, 
  RefreshCw, TrendingUp, DollarSign, Package, AlertCircle, Sparkles, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'AWAITING_PAYMENT', label: 'Awaiting Payment' },
  { value: 'PAID',             label: 'Paid' },
  { value: 'DELIVERED',        label: 'Delivered' },
  { value: 'COMPLETED',        label: 'Completed' },
  { value: 'CANCELLED',        label: 'Cancelled' },
];

const KANBAN_COLUMNS = ['AWAITING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const statusFilter = searchParams.get('status') || '';

  // Get orders list
  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => ordersApi.list({ ...(statusFilter ? { status: statusFilter } : {}), limit: 200 }),
    refetchInterval: 30_000,
  });

  // Get stats from existing orders endpoint (or falls back to aggregated client-side calculations if API doesn't return full details)
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: () => ordersApi.stats(),
    refetchInterval: 30_000,
  });

  const ordersList = ordersData?.orders || [];

  // Bulk status mutation
  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }) => bookingOpsApi.bulkOrderStatus(ids, status),
    onSuccess: (_, variables) => {
      toast.success(`Successfully updated ${variables.ids.length} orders to ${variables.status}`);
      qc.invalidateQueries(['orders']);
      qc.invalidateQueries(['orders-stats']);
      setSelectedIds([]);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update orders');
    },
  });

  const handleBulkAction = async (status) => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      await bulkStatusMutation.mutateAsync({ ids: selectedIds, status });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectAll = (filteredOrders) => {
    if (selectedIds.length === filteredOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map(o => o.id));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filter & Search computation
  const filteredOrders = ordersList.filter(order => {
    const orderRef = (order.orderRef || '').toLowerCase();
    const customerName = (order.customer?.name || order.customerName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = orderRef.includes(search) || customerName.includes(search);
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Safe client-side stats fallback if stats API isn't detailed enough
  const clientStats = {
    totalCount: ordersList.length,
    awaitingPayment: ordersList.filter(o => o.status === 'AWAITING_PAYMENT').length,
    inTransit: ordersList.filter(o => o.status === 'DELIVERED').length,
    completed: ordersList.filter(o => o.status === 'COMPLETED').length,
    totalRevenue: ordersList.reduce((acc, curr) => curr.status !== 'CANCELLED' ? acc + (curr.amount || 0) : acc, 0),
  };

  const stats = {
    totalCount: statsData?.totalCount ?? clientStats.totalCount,
    awaitingPayment: statsData?.awaitingPayment ?? clientStats.awaitingPayment,
    inTransit: statsData?.inTransit ?? clientStats.inTransit,
    completed: statsData?.completed ?? clientStats.completed,
    totalRevenue: statsData?.totalRevenue ?? clientStats.totalRevenue,
  };

  const getStatusBadge = (status) => {
    const meta = ORDER_STATUS_META[status] || { label: status, color: 'var(--az-accent)' };
    return <Badge color={meta.color}>{meta.label}</Badge>;
  };

  // Table View columns definition
  const columns = [
    {
      key: 'select',
      label: (
        <button 
          onClick={() => handleSelectAll(filteredOrders)} 
          className="p-1 rounded hover:bg-[var(--az-border)] text-[var(--az-text-muted)] hover:text-[var(--az-text)]"
        >
          {selectedIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-[var(--az-accent)]" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
      width: '40px',
      render: (row) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSelectOne(row.id);
          }} 
          className="p-1 rounded hover:bg-[var(--az-border)] text-[var(--az-text-muted)] hover:text-[var(--az-text)]"
        >
          {selectedIds.includes(row.id) ? (
            <CheckSquare className="w-4 h-4 text-[var(--az-accent)]" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      )
    },
    {
      key: 'orderRef',
      label: 'Order Ref',
      sortable: true,
      sortValue: (row) => row.orderRef,
      render: (row) => (
        <span className="font-bold az-mono text-[var(--az-accent)] hover:underline cursor-pointer" onClick={() => navigate(`/orders/${row.id}`)}>
          {row.orderRef || `#${row.id.substring(0, 8)}`}
        </span>
      )
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      sortValue: (row) => row.customer?.name || row.customerName || '',
      render: (row) => (
        <div>
          <div className="font-medium text-[var(--az-text)]">{row.customer?.name || row.customerName || 'Anonymous'}</div>
          <div className="text-[10px] text-[var(--az-text-muted)]">{row.customer?.azamanId || 'No ID'}</div>
        </div>
      )
    },
    {
      key: 'product',
      label: 'Product',
      render: (row) => (
        <span className="truncate max-w-[200px] block text-[var(--az-text-muted)]">
          {row.product?.title || row.productTitle || 'N/A'}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      sortValue: (row) => row.amount,
      render: (row) => <span className="font-bold az-mono text-[var(--az-text)]">{fmtUSDC(row.amount)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'date',
      label: 'Created',
      sortable: true,
      sortValue: (row) => new Date(row.created_date || row.createdAt).getTime(),
      render: (row) => (
        <span className="text-[11px] text-[var(--az-text-muted)]" title={formatDateTime(row.created_date || row.createdAt)}>
          {relativeTime(row.created_date || row.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <Button size="sm" variant="ghost" onClick={() => navigate(`/orders/${row.id}`)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--az-text)] flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[var(--az-accent)]" />
            Orders Console
          </h1>
          <p className="text-sm text-[var(--az-text-muted)]">Manage customer orders, track escrows, fulfillment, and process bulk updates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} title="Refresh Data">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="flex rounded-xl bg-[var(--az-surface)] p-0.5 border border-[var(--az-border)]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${viewMode === 'kanban' ? 'bg-[var(--az-accent)] text-[var(--az-black)]' : 'text-[var(--az-text-muted)] hover:text-[var(--az-text)]'}`}
            >
              <Grid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${viewMode === 'table' ? 'bg-[var(--az-accent)] text-[var(--az-black)]' : 'text-[var(--az-text-muted)] hover:text-[var(--az-text)]'}`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Widget title="Total Orders" icon={ShoppingBag} iconColor="var(--az-info)" loading={isLoadingStats || isLoading}>
          <WidgetStat value={stats.totalCount} label="All marketplace bookings" />
        </Widget>
        <Widget title="Pending Payment" icon={Clock} iconColor="var(--az-warning)" loading={isLoadingStats || isLoading}>
          <WidgetStat value={stats.awaitingPayment} label="Awaiting user settlement" />
        </Widget>
        <Widget title="In Transit" icon={Truck} iconColor="var(--az-accent)" loading={isLoadingStats || isLoading}>
          <WidgetStat value={stats.inTransit} label="Dispatched / Delivered" />
        </Widget>
        <Widget title="Completed" icon={CheckSquare} iconColor="var(--az-success)" loading={isLoadingStats || isLoading}>
          <WidgetStat value={stats.completed} label="Escrow satisfied & released" />
        </Widget>
        <Widget title="Total Revenue" icon={DollarSign} iconColor="var(--az-accent)" loading={isLoadingStats || isLoading}>
          <WidgetStat value={fmtUSDC(stats.totalRevenue)} label="Excluding cancellations" />
        </Widget>
      </div>

      {/* Filter and Bulk Action Controls */}
      <div data-tour="orders-filter" className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--az-border)]" style={{ background: 'var(--az-card)' }}>
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--az-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order ref or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--az-black)] border border-[var(--az-border)] rounded-xl text-[var(--az-text)] placeholder:text-[var(--az-text-muted)] outline-none focus:border-[var(--az-accent)] transition-colors"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setSearchParams({ status: e.target.value })}
              options={STATUSES}
            />
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-[var(--az-border)] px-4 py-2 rounded-xl animate-fade-in border border-[var(--az-accent)]/30">
            <span className="text-xs font-bold text-[var(--az-text)] az-mono">
              {selectedIds.length} SELECTED
            </span>
            <div className="h-4 w-px bg-[var(--az-border)]" />
            <Button
              size="sm"
              variant="primary"
              loading={bulkActionLoading}
              onClick={() => handleBulkAction('DELIVERED')}
              className="bg-[var(--az-accent)] hover:bg-[var(--az-accent)]/80 text-[var(--az-black)] py-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              Mark Delivered
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={bulkActionLoading}
              onClick={() => handleBulkAction('CANCELLED')}
              className="bg-transparent text-[var(--az-danger)] border-[var(--az-danger)] hover:bg-[var(--az-danger)]/10 py-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancel Orders
            </Button>
            <button 
              onClick={() => setSelectedIds([])} 
              className="text-[var(--az-text-muted)] hover:text-[var(--az-text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Loader */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <Empty
          icon={AlertCircle}
          title="Failed to Load Orders"
          description="We encountered an error fetching orders. Please try again."
          action={<Button onClick={() => refetch()}>Retry Connection</Button>}
        />
      ) : filteredOrders.length === 0 ? (
        <Empty
          icon={ShoppingBag}
          title="No Orders Found"
          description={searchTerm || statusFilter ? "Adjust your filters to see more orders." : "You don't have any customer orders placed yet."}
          action={(searchTerm || statusFilter) && <Button variant="secondary" onClick={() => { setSearchTerm(''); setSearchParams({ status: '' }); }}>Clear Filters</Button>}
        />
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div data-tour="orders-kanban" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {KANBAN_COLUMNS.map(column => {
            const columnOrders = filteredOrders.filter(o => o.status === column);
            const columnMeta = ORDER_STATUS_META[column] || { label: column, color: 'var(--az-accent)' };
            
            return (
              <div 
                key={column} 
                className="flex flex-col rounded-2xl border border-[var(--az-border)]/50 p-3 min-h-[400px]"
                style={{ background: 'rgba(20,20,30,0.4)' }}
              >
                {/* Column Title */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--az-border)]/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: columnMeta.color }} />
                    <span className="text-xs font-black text-[var(--az-text)] uppercase tracking-wider">{columnMeta.label}</span>
                  </div>
                  <span className="text-xs bg-[var(--az-surface)] border border-[var(--az-border)] text-[var(--az-text-muted)] font-bold px-2 py-0.5 rounded-full az-mono">
                    {columnOrders.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {columnOrders.map(order => {
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-150 select-none ${isSelected ? 'border-[var(--az-accent)] bg-[var(--az-surface)] shadow-lg shadow-[var(--az-accent)]/5' : 'border-[var(--az-border)] hover:border-[var(--az-accent)] bg-[var(--az-surface)] hover:translate-y-[-2px]'}`}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        {/* Checkbox overlay button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOne(order.id);
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-[var(--az-border)] text-[var(--az-text-muted)] transition-opacity"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--az-accent)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold az-mono text-[var(--az-accent)]">
                              {order.orderRef || `#${order.id.substring(0, 8)}`}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-[var(--az-text)] line-clamp-1">
                              {order.customer?.name || order.customerName || 'Anonymous'}
                            </p>
                            <p className="text-[11px] text-[var(--az-text-muted)] line-clamp-1 mt-0.5">
                              {order.product?.title || order.productTitle || 'N/A'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[var(--az-border)]/30">
                            <span className="text-xs font-bold text-[var(--az-text)] az-mono">
                              {fmtUSDC(order.amount)}
                            </span>
                            <span className="text-[10px] text-[var(--az-text-muted)]">
                              {relativeTime(order.created_date || order.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {columnOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--az-border)]/40 rounded-xl text-center">
                      <Package className="w-5 h-5 text-[var(--az-text-muted)]/30 mb-2" />
                      <span className="text-[10px] text-[var(--az-text-muted)] font-medium">Empty Column</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-[var(--az-border)] overflow-hidden" style={{ background: 'var(--az-card)' }}>
          <DataTable
            columns={columns}
            data={filteredOrders}
            pageSize={15}
            rowKey="id"
            onRowClick={(row) => navigate(`/orders/${row.id}`)}
          />
        </div>
      )}
    </div>
  );
}
