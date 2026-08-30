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
import { getSocket } from './socket';

let boundSocket = null;
let boundQueryClient = null;
let handlers = [];

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function orderIdFrom(payload) {
  const data = asObject(payload);
  return data.orderId ?? data.order_id ?? data.order?.id ?? data.id ?? null;
}

function invalidateOrder(queryClient, orderId) {
  if (orderId != null && String(orderId).length > 0) {
    queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  }
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
}

function invalidateNotifications(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['business-notifications'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['business-notifications-unread'] });
}

function invalidateEvent(queryClient, event, payload) {
  // The backend's canonical tracking contract uses colon-delimited names.
  // Keep underscore aliases temporarily so older deployed backends do not
  // silently lose invalidation during a rolling deployment.
  const orderEvents = new Set([
    'order:location',
    'order:status',
    'order:eta',
    'order_location',
    'order_status',
    'order_eta',
    'business_order_delivered',
  ]);
  const escrowEvents = new Set([
    'escrow_funded',
    'escrow_settled',
    'escrow_pending_settlement',
    'escrow_disputed',
    'escrow_resolved',
    'escrow_terms_updated',
    'invoice_paid',
  ]);

  if (orderEvents.has(event) || escrowEvents.has(event)) {
    invalidateOrder(queryClient, orderIdFrom(payload));
  }

  if (event === 'biz_notification' || event === 'biz_notifications_updated' || event === 'new_notification' || event === 'notifications_updated') {
    invalidateNotifications(queryClient);
  }
}

export function installRealtimeQueryBridge(queryClient) {
  const socket = getSocket();
  if (!socket || !queryClient) return false;

  if (boundSocket === socket && boundQueryClient === queryClient) return true;

  uninstallRealtimeQueryBridge(boundSocket);
  boundSocket = socket;
  boundQueryClient = queryClient;

  const events = [
    'order:location',
    'order:status',
    'order:eta',
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
    'invoice_paid',
    'biz_notification',
    'biz_notifications_updated',
    'new_notification',
    'notifications_updated',
  ];

  handlers = events.map((event) => {
    const handler = (payload) => invalidateEvent(queryClient, event, payload);
    socket.on(event, handler);
    return [event, handler];
  });

  return true;
}

export function uninstallRealtimeQueryBridge(socket = boundSocket) {
  if (!socket) return;
  for (const [event, handler] of handlers) socket.off(event, handler);
  if (socket === boundSocket) {
    handlers = [];
    boundSocket = null;
    boundQueryClient = null;
  }
}
