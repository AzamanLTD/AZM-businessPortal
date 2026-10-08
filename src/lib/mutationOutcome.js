/**
 * mutationOutcome — honest outcome copy for portal mutations whose backend
 * contract carries more truth than the old toasts reported.
 *
 * Contract references (AZM-backend main, read-only):
 *  - POST /api/business-os/orders/bulk-status returns
 *    { success, updated, skipped }: `updated` counts the orders actually
 *    transitioned, `skipped` the ones whose current state does not allow it
 *    (escrow-owned, terminal, or mismatched statuses are never overwritten).
 *  - PATCH /api/reservations/:id/no-show returns { success, reservation }.
 *    A penalty is charged ONLY when the reservation has one configured and
 *    the escrow is in a refund-claimable state; otherwise the deposit is
 *    refunded in full (or there is no escrow at all). The backend decides —
 *    the portal reports what happened, it never asserts a penalty.
 *  - POST /api/business-os/restaurant/inventory/deduct/:orderId returns
 *    { success, message, deductions, replay }. replay:true means the order
 *    was ALREADY deducted and NO stock was changed — the route is exactly
 *    once per order by conditional claim.
 */

/**
 * Bulk order status outcome. Reports the backend's own updated/skipped
 * counts; never claims a count the response did not confirm.
 */
export function describeBulkStatusOutcome(response, requestedCount) {
  const updated = response && Number.isInteger(response.updated) ? response.updated : null;
  const skipped = response && Number.isInteger(response.skipped) ? response.skipped : null;
  if (updated === null) {
    // Shape drift: a 2xx arrived but no per-order counts. Say what is known.
    return {
      confirmed: false,
      message: `Status update accepted for ${requestedCount} orders`,
      description: 'The backend response did not include per-order counts — verify the list below before acting on it.',
    };
  }
  if (updated === 0) {
    return {
      confirmed: true,
      message: 'No orders changed — none were in a state that allows this transition',
      description: 'Escrow-owned and terminal statuses are never bulk-overwritten; check each order in the list.',
    };
  }
  if (skipped > 0) {
    return {
      confirmed: true,
      message: `Updated ${updated} of ${requestedCount} orders; ${skipped} skipped`,
      description: 'Skipped orders were not in a state that allows this transition — they are unchanged on the server.',
    };
  }
  return { confirmed: true, message: `Updated ${updated} orders`, description: null };
}

/**
 * Reservation no-show outcome. Claims a penalty ONLY when the backend
 * reservation record says one was charged.
 */
export function describeNoShowOutcome(response) {
  const penalized = !!(response && response.reservation && response.reservation.penaltyChargedAt);
  if (penalized) {
    return {
      message: 'Marked as No-Show. Penalty charged.',
      description: 'The reservation had a no-show penalty configured and the backend applied it to the deposit.',
    };
  }
  return {
    message: 'Marked as No-Show.',
    description: 'A penalty is charged only when the reservation has one configured; deposit handling follows the escrow state decided by the backend.',
  };
}

/**
 * Inventory deduct outcome. Surfaces the backend's replay flag instead of
 * claiming a fresh deduction that did not happen.
 */
export function describeDeductOutcome(response) {
  if (response && response.replay) {
    return {
      replayed: true,
      message: 'Inventory already deducted for this order',
      description: 'No stock was changed — the backend deducts exactly once per order. This confirms the earlier deduction.',
    };
  }
  return {
    replayed: false,
    message: 'Inventory deducted for order successfully!',
    description: 'Auto-deduction completed. Checked all recipe requirements against real-time stock levels.',
  };
}

/**
 * Bulk price adjustment outcome (a client-side loop of per-product PATCHes).
 * Reports failures to the operator instead of swallowing them in the console.
 */
export function describeBulkPriceOutcome(successCount, failCount) {
  if (failCount === 0) {
    return { tone: 'go', message: `Successfully adjusted prices for ${successCount} items!` };
  }
  if (successCount === 0) {
    return { tone: 'stop', message: `Price adjustment failed for all ${failCount} items — nothing was changed reliably. Check each product before retrying.` };
  }
  return {
    tone: 'neutral',
    message: `Adjusted ${successCount} prices; ${failCount} failed`,
    description: 'The failed products were not updated — review them individually before relisting.',
  };
}
