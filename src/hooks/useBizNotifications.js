import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { notifications as notifApi } from '@/lib/api';

/**
 * Subscribes to the canonical business notification stream and turns events
 * into cache invalidations. Socket payloads are never treated as authoritative
 * business state; the next query always refetches from the backend.
 */
const PROJECTION_EVENTS = {
  order: new Set([
    'NEW_ORDER', 'ORDER_FUNDED', 'ORDER_SATISFIED',
    'ORDER_SETTLED', 'ORDER_DISPUTED', 'ORDER_REFUNDED', 'ORDER_CANCELLED',
  ]),
  invoice: new Set(['INVOICE_SENT', 'INVOICE_PAID']),
  reservation: new Set([
    'RESERVATION_NEW', 'RESERVATION_CONFIRMED', 'RESERVATION_CHECKED_IN',
    'RESERVATION_NO_SHOW',
  ]),
  transit: new Set(['TRANSIT_BOOKING_NEW', 'TRANSIT_NO_SHOW', 'TRANSIT_REMINDER']),
  dineIn: new Set(['DINE_IN_TAB_OPENED', 'DINE_IN_TAB_FINALIZED', 'DINE_IN_TAB_PAID']),
  trust: new Set(['TRUST_LEVEL_CHANGED', 'PENALTY_CHARGED', 'PENALTY_REFUNDED']),
};

export function useBizNotifications() {
  const qc = useQueryClient();
  const socket = getSocket();

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

    const invalidate = (key) => qc.invalidateQueries({ queryKey: key });

    const handleBizNotif = (payload) => {
      const type = payload?.type;
      refreshNotifs();

      if (PROJECTION_EVENTS.order.has(type)) {
        invalidate(['orders']);
        invalidate(['recent-orders']);
        invalidate(['biz-stats']);
      }
      if (PROJECTION_EVENTS.invoice.has(type)) {
        invalidate(['biz-invoices']);
        invalidate(['biz-invoice']);
        invalidate(['invoice-stats']);
      }
      if (PROJECTION_EVENTS.reservation.has(type)) {
        invalidate(['reservations']);
        invalidate(['reservation-stats']);
      }
      if (PROJECTION_EVENTS.transit.has(type)) {
        invalidate(['transit']);
        invalidate(['transit-bookings']);
        invalidate(['transit-trips']);
      }
      if (PROJECTION_EVENTS.dineIn.has(type)) {
        invalidate(['dine-in']);
        invalidate(['dine-in-tabs']);
      }
      if (PROJECTION_EVENTS.trust.has(type)) {
        invalidate(['business-profile']);
        invalidate(['biz-stats']);
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
