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

function invoiceIdFrom(payload) {
  const data = asObject(payload);
  return data.invoiceId ?? data.invoice_id ?? data.invoice?.id ?? data.id ?? null;
}

function invalidateOrder(queryClient, orderId) {
  if (orderId != null && String(orderId).length > 0) {
    queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  }
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['orders-stats'] });
}

function invalidateInvoices(queryClient, invoiceId) {
  if (invoiceId != null && String(invoiceId).length > 0) {
    queryClient.invalidateQueries({ queryKey: ['biz-invoice', String(invoiceId)] });
    queryClient.invalidateQueries({ queryKey: ['biz-invoice', invoiceId] });
  }
  queryClient.invalidateQueries({ queryKey: ['biz-invoices'] });
  queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
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
  ]);

  if (orderEvents.has(event) || escrowEvents.has(event)) {
    invalidateOrder(queryClient, orderIdFrom(payload));
  }

  // Expiry/manual refund has a dedicated convergence signal. Its payload
  // carries escrow/ticket identity rather than an order id, so invalidate the
  // complete order projection instead of treating escrowId as an orderId.
  // The persisted ORDER_REFUNDED notification will also provide a second,
  // durable convergence edge when the business notification write completes.
  if (event === 'escrow_refunded') {
    invalidateOrder(queryClient, null);
  }

  // invoice_paid and invoice_voided change the business invoice resource, not
  // the order resource. Keep them on their own convergence path so invoice
  // list/detail/statistics reflect the backend immediately without coupling
  // unrelated order queries to invoice lifecycle events.
  if (event === 'invoice_paid' || event === 'invoice_voided') {
    invalidateInvoices(queryClient, invoiceIdFrom(payload));
  }

  if (event === 'biz_notification' || event === 'biz_notifications_updated' || event === 'new_notification' || event === 'notifications_updated') {
    invalidateNotifications(queryClient);

    // Escrow lifecycle notifications are persisted BusinessNotification rows
    // and now arrive over the canonical `biz_notification` signal. The
    // notification feed and the order projection are both affected by these
    // events, so converge both surfaces from the authoritative APIs. Other
    // notification types should not cause broad order invalidation.
    const data = asObject(payload);
    if (event === 'biz_notification' && String(data.type || '').startsWith('ORDER_')) {
      invalidateOrder(queryClient, orderIdFrom(data));
    }
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
    'escrow_refunded',
    'invoice_paid',
    'invoice_voided',
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
