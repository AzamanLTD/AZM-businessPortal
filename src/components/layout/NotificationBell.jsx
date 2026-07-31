import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ShoppingBag, Wallet, AlertTriangle, CheckCircle2, XCircle, RotateCcw, ShieldCheck, ChevronRight, Package, User, DollarSign } from 'lucide-react';
import { notifications as notifApi } from '@/lib/api';
import { cn, relativeTime } from '@/lib/utils';


// Visual treatment per BizNotifType.
const TYPE_META = {
  NEW_ORDER:          { icon: ShoppingBag,  color: 'var(--az-accent)',   label: 'New Order' },
  ORDER_FUNDED:       { icon: Wallet,       color: 'var(--az-info)',    label: 'Escrow Funded' },
  ORDER_SATISFIED:    { icon: CheckCircle2, color: 'var(--az-accent)',  label: 'Order Complete' },
  ORDER_DISPUTED:     { icon: AlertTriangle,color: 'var(--az-warning)', label: 'Dispute Opened' },
  ORDER_SETTLED:      { icon: CheckCircle2, color: 'var(--az-accent)',  label: 'Settled' },
  ORDER_REFUNDED:     { icon: RotateCcw,    color: 'var(--az-accent)',   label: 'Refunded' },
  ORDER_CANCELLED:    { icon: XCircle,      color: 'var(--az-danger)',  label: 'Cancelled' },
  KYB_STATUS_CHANGED: { icon: ShieldCheck,  color: 'var(--az-info)',    label: 'KYB Update' },
};

const ORDER_TYPES = new Set([
  'NEW_ORDER', 'ORDER_FUNDED', 'ORDER_SATISFIED', 'ORDER_DISPUTED',
  'ORDER_SETTLED', 'ORDER_REFUNDED', 'ORDER_CANCELLED',
]);

// Grouping helper — Today / Yesterday / This Week / Earlier
function groupByDate(items) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups = { today: [], yesterday: [], week: [], earlier: [] };
  for (const item of items) {
    const d = new Date(item.createdAt);
    if (d >= today) groups.today.push(item);
    else if (d >= yesterday) groups.yesterday.push(item);
    else if (d >= weekAgo) groups.week.push(item);
    else groups.earlier.push(item);
  }
  return groups;
}

const GROUP_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  earlier: 'Earlier',
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await notifApi.unreadCount();
      setUnread(count || 0);
    } catch { /* transient */ }
  }, []);

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notifApi.list({ limit: 30 });
      setItems(data.notifications || []);
      setUnread(data.unreadCount ?? 0);
    } catch { /* transient */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Initial load (once, on mount)
    refreshCount();
    if (open) refreshFeed();

    // Real-time updates via socket — no more 30s polling
    const sock = window.__azSocket;
    if (!sock?.on) return;

    const onNudge = () => { refreshCount(); if (open) refreshFeed(); };
    const onNewNotif = (notification) => {
      // Optimistic insert at top of feed
      setItems(prev => [notification, ...prev].slice(0, 30));
      setUnread(prev => prev + 1);
    };

    sock.on('biz_notification', onNudge);
    sock.on('biz_notifications_updated', onNudge);
    sock.on('biz_notification:new', onNewNotif);
    sock.on('order:new', onNudge);
    sock.on('review:new', onNudge);

    return () => {
      sock.off('biz_notification', onNudge);
      sock.off('biz_notifications_updated', onNudge);
      sock.off('biz_notification:new', onNewNotif);
      sock.off('order:new', onNudge);
      sock.off('review:new', onNudge);
    };
  }, [refreshCount, refreshFeed, open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) refreshFeed();
  };

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      notifApi.markRead(n.id).catch(() => refreshFeed());
    }
    setOpen(false);
    if (ORDER_TYPES.has(n.type)) navigate('/orders');
    else if (n.type === 'KYB_STATUS_CHANGED') navigate('/kyb');
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try { await notifApi.markAllRead(); }
    catch { refreshFeed(); }
  };

  const grouped = useMemo(() => groupByDate(items), [items]);

  const renderNotifItem = (n) => {
    const meta = TYPE_META[n.type] || { icon: Bell, color: 'var(--az-text-muted)', label: 'Notification' };
    const Icon = meta.icon;
    // Extract order amount from metadata if available
    const amount = n.metadata?.amount || n.metadata?.total;
    const customerName = n.metadata?.customerName || n.metadata?.userName;
    const orderId = n.metadata?.orderId || n.metadata?.orderRef;

    return (
      <div
        key={n.id}
        onClick={() => handleItemClick(n)}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer transition-all group hover:bg-[var(--az-surface)] relative',
          !n.isRead && 'bg-[var(--az-accent-subtle)]'
        )}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${meta.color}1a`, border: `1px solid ${meta.color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color: meta.color }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[var(--az-text)] truncate">{n.title}</p>
            {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--az-accent)] flex-shrink-0" />}
          </div>
          <p className="text-xs text-[var(--az-text-muted)] mt-0.5 line-clamp-2">{n.body}</p>

          {/* Rich metadata row */}
          {(amount || customerName || orderId) && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {amount && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: 'var(--az-accent-subtle)', color: 'var(--az-accent)' }}>
                  <DollarSign className="w-2.5 h-2.5 inline -mt-0.5" /> {amount}
                </span>
              )}
              {customerName && (
                <span className="text-[10px] flex items-center gap-1 text-[var(--az-text-muted)]">
                  <User className="w-2.5 h-2.5" /> {customerName}
                </span>
              )}
              {orderId && (
                <span className="text-[10px] font-mono text-[var(--az-text-muted)]">
                  {orderId}
                </span>
              )}
            </div>
          )}

          <p className="text-[10px] text-[var(--az-text-muted)] mt-1">{relativeTime(n.createdAt)}</p>
        </div>

        {/* Action arrow */}
        <ChevronRight className="w-3.5 h-3.5 text-[var(--az-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" />
      </div>
    );
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-xl hover:bg-[var(--az-surface)] transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-[var(--az-text-muted)]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--az-danger)] text-[10px] font-bold text-[var(--az-text)] flex items-center justify-center leading-none animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[32rem] flex flex-col rounded-2xl border border-[var(--az-border)] shadow-2xl z-50 overflow-hidden"
          style={{ background: 'var(--az-surface)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--az-border)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--az-text)]">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--az-danger)', color: 'white' }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-[var(--az-info)] hover:text-[#6ba3f8] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List with date grouping */}
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                  style={{ borderColor: 'var(--az-accent)', borderTopColor: 'transparent' }} />
                <p className="text-xs text-[var(--az-text-muted)]">Loading…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--az-bg-alt)' }}>
                  <Bell className="w-5 h-5 text-[var(--az-border)]" />
                </div>
                <p className="text-sm font-medium text-[var(--az-text-muted)]">All caught up!</p>
                <p className="text-xs text-[var(--az-text-muted)] mt-1 opacity-60">No unread notifications</p>
              </div>
            ) : (
              ['today', 'yesterday', 'week', 'earlier'].map((groupKey) => {
                const groupItems = grouped[groupKey];
                if (!groupItems.length) return null;
                return (
                  <div key={groupKey}>
                    {/* Group label */}
                    <div className="px-4 py-1.5 sticky top-0 z-10"
                      style={{ background: 'var(--az-surface)', borderBottom: '1px solid var(--az-border)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--az-text-muted)]">
                        {GROUP_LABELS[groupKey]}
                        <span className="ml-1.5 normal-case opacity-50">({groupItems.length})</span>
                      </p>
                    </div>
                    {groupItems.map(renderNotifItem)}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — full feed */}
          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="flex-shrink-0 w-full px-4 py-3 border-t border-[var(--az-border)] text-xs font-semibold text-[var(--az-accent)] hover:bg-[var(--az-surface)] transition-colors flex items-center justify-center gap-1.5"
          >
            View all notifications
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
