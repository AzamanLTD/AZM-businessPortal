/**
 * Business Portal realtime/query convergence boundary.
 *
 * Socket payloads are notifications, not a second source of truth. Every
 * relevant domain event invalidates the canonical HTTP queries so the portal
 * renders the backend's authoritative representation after the event arrives.
 *
 * This module is deliberately singleton-per-socket: reconnects replace the
 * listener set instead of accumulating duplicate handlers.
 */
import { queryClient } from './query-client';
import { getSocket } from './socket';

let boundSocket = null;
let handlers = [];

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function orderIdFrom(payload) {
  const data = asObject(payload);
  return data.orderId ?? data.order_id ?? data.order?.id ?? data.id ?? null;
}

function invalidateOrder(orderId) {
  if (orderId != null && String(orderId).length > 0) {
    queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  }
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
}

function invalidateNotifications() {
  queryClient.invalidateQueries({ queryKey: ['business-notifications'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['business-notifications-unread'] });
}

function invalidateEvent(event, payload) {
  const orderEvents = new Set(['order_location', 'order_status', 'order_eta', 'business_order_delivered']);
  const escrowEvents = new Set([
    'escrow_funded',
    'escrow_settled',
    'escrow_pending_settlement',
    'escrow_disputed',
    'escrow_resolved',
    'escrow_terms_updated',
  ]);

  if (orderEvents.has(event) || escrowEvents.has(event)) {
    invalidateOrder(orderIdFrom(payload));
  }

  if (event === 'biz_notification' || event === 'biz_notifications_updated' || event === 'new_notification' || event === 'notifications_updated') {
    invalidateNotifications();
  }
}

export function installRealtimeQueryBridge() {
  const socket = getSocket();
  if (!socket) return () => {};

  if (boundSocket === socket) return () => uninstallRealtimeQueryBridge(socket);

  uninstallRealtimeQueryBridge(boundSocket);
  boundSocket = socket;

  const events = [
    'order_location',
    'order_status',
    'order_eta',
    'business_order_delivered',
    'escrow_funded',
    'escrow_settled',
    'escrow_pending_settlement',
    'escrow_disputed',
    'escrow_resolved',
    'escrow_terms_updated',
    'biz_notification',
    'biz_notifications_updated',
    'new_notification',
    'notifications_updated',
  ];

  handlers = events.map((event) => {
    const handler = (payload) => invalidateEvent(event, payload);
    socket.on(event, handler);
    return [event, handler];
  });

  return () => uninstallRealtimeQueryBridge(socket);
}

export function uninstallRealtimeQueryBridge(socket = boundSocket) {
  if (!socket) return;
  for (const [event, handler] of handlers) socket.off(event, handler);
  if (socket === boundSocket) {
    handlers = [];
    boundSocket = null;
  }
}
