import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notifications as notifApi } from '@/lib/api';
import { Card, Button, Tag, Skel, Empty } from '@/components/instrument';
import { useBizNotifications } from '@/hooks/useBizNotifications';
import { cn, relativeTime } from '@/lib/utils';
import {
  Bell, CheckCheck, ShoppingBag, Wallet, AlertTriangle,
  CheckCircle2, XCircle, RotateCcw, ShieldCheck, CalendarCheck, Clock, Check, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

const FILTER_CHIPS = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW_ORDER', label: 'Orders' },
  { key: 'ORDER_FUNDED', label: 'Payments' },
  { key: 'ORDER_DISPUTED', label: 'Disputes' },
  { key: 'INVENTORY_LOW', label: 'Inventory' },
  { key: 'SHIFT_ALERT', label: 'Shifts' },
  { key: 'REVIEW_NEW', label: 'Reviews' },
  { key: 'RESERVATION_PENDING', label: 'Reservations' },
  { key: 'MAINTENANCE', label: 'Maintenance' }
];

const TYPE_META = {
  NEW_ORDER: { icon: ShoppingBag, color: 'var(--accent)', label: 'Order' },
  ORDER_FUNDED: { icon: Wallet, color: 'var(--info)', label: 'Payment' },
  ORDER_SATISFIED: { icon: CheckCircle2, color: 'var(--accent)', label: 'Settlement' },
  ORDER_DISPUTED: { icon: AlertTriangle, color: 'var(--stop)', label: 'Dispute' },
  ORDER_SETTLED: { icon: CheckCircle2, color: 'var(--accent)', label: 'Settled' },
  ORDER_REFUNDED: { icon: RotateCcw, color: 'var(--info)', label: 'Refund' },
  ORDER_CANCELLED: { icon: XCircle, color: 'var(--text-3)', label: 'Cancelled' },
  KYB_STATUS_CHANGED: { icon: ShieldCheck, color: 'var(--info)', label: 'Verification' },
  INVENTORY_LOW: { icon: AlertTriangle, color: 'var(--hold)', label: 'Inventory' },
  SHIFT_ALERT: { icon: Clock, color: 'var(--info)', label: 'Shift' },
  REVIEW_NEW: { icon: HelpCircle, color: 'var(--accent)', label: 'Review' },
  RESERVATION_PENDING: { icon: CalendarCheck, color: 'var(--info)', label: 'Reservation' },
  MAINTENANCE: { icon: AlertTriangle, color: 'var(--stop)', label: 'Maintenance' },
};

export default function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
    const [filter, setFilter] = useState('ALL');

  // Activate Real-time notifications
  useBizNotifications();

  // Load notifications from Backend API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['biz-notifications', filter],
    queryFn: async () => {
      const params = {};
      if (filter !== 'ALL') {
        params.type = filter;
      }
      return notifApi.list(params);
    }
  });

  const { data: unreadCountData } = useQuery({
    queryKey: ['biz-notifications-unread-count'],
    queryFn: () => notifApi.unreadCount()
  });

  const notificationsList = data?.notifications || data || [];
  const unreadCount = unreadCountData?.count ?? data?.unreadCount ?? 0;

  // Mark single notification read
  const markOne = useMutation({
    mutationFn: (id) => notifApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-notifications'] });
      qc.invalidateQueries({ queryKey: ['biz-notifications-unread-count'] });
      toast.success('Notification marked as read');
    },
    onError: () => {
      toast.error('Failed to mark read');
    }
  });

  // Mark all read
  const markAll = useMutation({
    mutationFn: () => notifApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biz-notifications'] });
      qc.invalidateQueries({ queryKey: ['biz-notifications-unread-count'] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all read');
    }
  });

  // Date grouping helper
  const groupedNotifications = useMemo(() => {
    const today = [];
    const yesterday = [];
    const older = [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    notificationsList.forEach((n) => {
      const d = new Date(n.createdAt || n.created_date || Date.now());
      const dStr = d.toDateString();

      if (dStr === todayStr) {
        today.push(n);
      } else if (dStr === yesterdayStr) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    return [
      { title: 'Today', items: today },
      { title: 'Yesterday', items: yesterday },
      { title: 'Older', items: older }
    ].filter(group => group.items.length > 0);
  }, [notificationsList]);

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markOne.mutate(n.id);
    }

    // deep-links using metadata (orderId → /orders/:id, reservationId → /reservations, employeeId → /employees, vehicleId → /transit-fleet)
    const m = n.metadata || {};
    if (m.orderId) {
      navigate(`/orders/${m.orderId}`);
    } else if (m.reservationId) {
      navigate('/reservations');
    } else if (m.employeeId) {
      navigate('/employees');
    } else if (m.vehicleId) {
      navigate('/transit-fleet');
    } else if (n.type === 'KYB_STATUS_CHANGED') {
      navigate('/kyb');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Notifications Center</h1>
            {unreadCount > 0 && (
              <Tag tone="neutral" bg="var(--surface-sunk)">
                {unreadCount} Unread
              </Tag>
            )}
          </div>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Real-time feed of your business events, alerts, and operational signals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--line)]">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                active
                  ? 'bg-[var(--surface-sunk)] text-[var(--accent)] border-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--text-3)] border-[var(--line)]:text-[var(--text)]'
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Notifications feed */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skel className="h-5 w-24" />
              <div className="space-y-2">
                <Skel className="h-20 w-full" />
                <Skel className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-[var(--stop)]">
          <AlertTriangle className="w-12 h-12 text-[var(--stop)] mb-4" />
          <h3 className="text-lg font-bold">Failed to load notifications</h3>
          <p className="text-sm text-[var(--text-3)] mt-1 max-w-sm">
            We couldn't retrieve your notifications from the backend API.
          </p>
          <Button className="mt-4" onClick={() => refetch()}>
            Retry Connection
          </Button>
        </Card>
      ) : groupedNotifications.length === 0 ? (
        <Card className="flex items-center justify-center p-16">
          <Empty
            icon={Bell}
            title="All quiet here"
            description="You don't have any notifications matching the current filter right now."
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedNotifications.map((group) => (
            <div key={group.title} className="space-y-3 animate-slide-in">
              <h3 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider pl-1">
                {group.title}
              </h3>
              <div className="rounded-2xl border border-[var(--line)] overflow-hidden divide-y divide-[var(--line)] bg-[var(--surface)]">
                {group.items.map((n) => {
                  const meta = TYPE_META[n.type] || { icon: Bell, color: 'var(--text-3)', label: 'Alert' };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        'flex items-start gap-4 p-5:bg-[var(--surface-sunk)] cursor-pointer transition-all relative',
                        !n.isRead && 'bg-[var(--surface-sunk)]/30'
                      )}
                    >
                      {/* Left border indicator for unread */}
                      {!n.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />
                      )}

                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}35` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-[var(--text-3)]">
                            {relativeTime(n.createdAt || n.created_date)}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--text)] mt-1">
                          {n.title || 'Notification Alert'}
                        </h4>
                        <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">
                          {n.body || n.description}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markOne.mutate(n.id);
                            }}
                            className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--text-3)]:text-[var(--accent)]:border-[var(--accent)] transition-all bg-[var(--surface)]"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
