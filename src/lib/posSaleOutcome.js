// WP-K — pure decision helpers for POS sale outcomes.
//
// While the backend refuses every new POS sale (422 POS_SETTLEMENT_NOT_ENABLED)
// the portal must never present a refusal as a completed Azaman sale, and must
// never discard an unresolved queued sale. These helpers are the single
// authority for those two rules and are unit-tested directly.

export const SETTLEMENT_DISABLED = 'POS_SETTLEMENT_NOT_ENABLED';

/** A receipt is authoritative ONLY for an order the backend returned. */
export function committedOrderId(data) {
  if (!data || typeof data !== 'object') return null;
  return data?.order?.id || data?.id || null;
}

export function shouldIssueReceipt(data) {
  return committedOrderId(data) !== null;
}

/** The backend refused settlement rather than failing transiently. */
export function isSettlementRefused(err) {
  if (!err) return false;
  const code = err?.data?.code || err?.code || err?.body?.code;
  return err?.statusCode === 422 && code === SETTLEMENT_DISABLED;
}

export const SYNC_ATTENTION_THRESHOLD = 3;

/**
 * A queued sale is a financial record: it is parked for attention, never
 * dropped, no matter how many times syncing fails.
 */
export function classifySyncFailure(item) {
  const retries = (item?.retryCount || 0) + 1;
  return {
    ...item,
    retryCount: retries,
    status: retries >= SYNC_ATTENTION_THRESHOLD ? 'NEEDS_ATTENTION' : 'FAILED',
  };
}

/** Items a cashier must resolve explicitly; never auto-removed. */
export function itemsNeedingAttention(items) {
  return (items || []).filter((i) => i.status === 'NEEDS_ATTENTION');
}
