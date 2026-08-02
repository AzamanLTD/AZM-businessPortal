import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { notifications as notifApi } from '@/lib/api';

/**
 * Subscribes to real-time business notification events and keeps React Query
 * caches fresh. The backend emits two events to `user_<id>`:
 *
 *   • biz_notification          → a new notification was created. Payload is a
 *                                 light nudge: { type } (e.g. 'NEW_ORDER').
 *   • biz_notifications_updated → read-state changed elsewhere (multi-device).
 *                                 Payload: { type: 'MARKED_READ' | ... }.
 *
 * Neither event carries the authoritative unread count, so we treat both as
 * "refetch" signals and let the server-backed queries reconcile. Order-shaped
 * events additionally refresh the orders/stats views.
 *
 * Listeners are torn down on unmount (and re-bound if the socket instance
 * changes) so re-renders never stack duplicate handlers.
 *
 * Returns { data } where data contains the unread notification count,
 * so the sidebar badge can render correctly.
 */
const ORDER_EVENTS = new Set([
  'NEW_ORDER', 'ORDER_FUNDED', 'ORDER_SATISFIED',
  'ORDER_SETTLED', 'ORDER_DISPUTED', 'ORDER_REFUNDED', 'ORDER_CANCELLED',
]);

export function useBizNotifications() {
  const qc = useQueryClient();
  const socket = getSocket();

  // Fetch unread notification count for sidebar badge
  const { data } = useQuery({
    queryKey: ['biz-notifications-count'],
    queryFn: () => notifApi.unreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!socket) return;

    const refreshNotifs = () => {
      qc.invalidateQueries({ queryKey: ['biz-notifications'] });
      qc.invalidateQueries({ queryKey: ['biz-notifications-count'] });
    };

    const handleBizNotif = (data) => {
      refreshNotifs();
      if (ORDER_EVENTS.has(data?.type)) {
        qc.invalidateQueries({ queryKey: ['orders'] });
        qc.invalidateQueries({ queryKey: ['recent-orders'] });
        qc.invalidateQueries({ queryKey: ['biz-stats'] });
      }
    };

    socket.on('biz_notification', handleBizNotif);
    socket.on('biz_notifications_updated', refreshNotifs);

    return () => {
      socket.off('biz_notification', handleBizNotif);
      socket.off('biz_notifications_updated', refreshNotifs);
    };
  }, [qc, socket]);

  return { data };
}
