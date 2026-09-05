import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { notifications as notifApi } from '@/lib/api';

/**
 * Subscribes to the canonical business notification stream and turns events
 * into cache invalidations. Socket payloads are never treated as authoritative
 * business state; the next query always refetches from the backend.
 *
 * Some older screens still use legacy query roots (biz-invoices, orders,
 * reservations, etc.) while newer screens use the qk factory. We invalidate
 * both roots during the migration so realtime remains seamless across the
 * portal instead of silently depending on which screen was opened first.
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
  dineIn: new Set([
    'DINE_IN_TAB_OPENED', 'DINE_IN_TAB_ITEM_ADDED', 'DINE_IN_TAB_ITEM_REMOVED',
    'DINE_IN_TAB_FINALIZED', 'DINE_IN_TAB_PAID', 'DINE_IN_TAB_CANCELLED',
  ]),
  trust: new Set(['TRUST_LEVEL_CHANGED', 'PENALTY_CHARGED', 'PENALTY_REFUNDED']),
  businessProfile: new Set(['KYB_STATUS_CHANGED', 'FOLLOWED_BUSINESS']),
  marketing: new Set(['AD_POST_CREATED']),
};

/**
 * Apply a business notification to the appropriate read-model cache roots.
 * The callbacks are injected so this routing contract is independently
 * executable without mounting React or a live Socket.IO connection.
 */
export function handleBusinessNotificationProjection(payload, { refreshNotifs, invalidateRoots }) {
  const type = payload?.type;
  refreshNotifs();

  if (PROJECTION_EVENTS.order.has(type)) {
    invalidateRoots('orders', 'recent-orders', 'biz-stats');
  }
  if (PROJECTION_EVENTS.invoice.has(type)) {
    invalidateRoots('invoices', 'biz-invoices', 'biz-invoice', 'invoice-stats');
  }
  if (PROJECTION_EVENTS.reservation.has(type)) {
    invalidateRoots('reservations', 'reservation-stats');
  }
  if (PROJECTION_EVENTS.transit.has(type)) {
    invalidateRoots('transit', 'transit-bookings', 'transit-trips');
  }
  if (PROJECTION_EVENTS.dineIn.has(type)) {
    invalidateRoots('dine-in', 'dine-in-tabs', 'openTabs', 'dineInTab');
  }
  if (PROJECTION_EVENTS.trust.has(type)) {
    invalidateRoots('business-profile', 'biz-profile', 'biz-stats');
  }
  if (PROJECTION_EVENTS.businessProfile.has(type)) {
    invalidateRoots('business-profile', 'biz-profile', 'business');
  }
  if (PROJECTION_EVENTS.marketing.has(type)) {
    invalidateRoots('marketing', 'ads', 'business-ads');
  }
}

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
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    const invalidateRoots = (...roots) => {
      roots.forEach((root) => qc.invalidateQueries({ queryKey: [root] }));
    };

    const handleBizNotif = (payload) => handleBusinessNotificationProjection(payload, { refreshNotifs, invalidateRoots });

    socket.on('biz_notification', handleBizNotif);
    socket.on('biz_notifications_updated', refreshNotifs);

    return () => {
      socket.off('biz_notification', handleBizNotif);
      socket.off('biz_notifications_updated', refreshNotifs);
    };
  }, [qc, socket]);

  return { data };
}
