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

// -----------------------------------------------------------------------------
// WP-K closure — payment-rail authority and merchant-cash separation.
// -----------------------------------------------------------------------------

/**
 * The Azaman POS payment rail stays DISABLED until the backend supports a
 * complete GHS-native settlement AND refund/reconciliation path. The backend
 * refuses every new POS sale with 422 POS_SETTLEMENT_NOT_ENABLED, so offering
 * "AZM Balance" or "Split" as live choices would invite a payment the platform
 * cannot settle or refund. Cash is NOT an Azaman rail: it is the merchant's own
 * money, received in the merchant's hand.
 */
export const POS_AZAMAN_RAIL_ENABLED = false;

/** Only cash can be taken while the Azaman rail is disabled. */
export function isMethodAvailable(method, railEnabled = POS_AZAMAN_RAIL_ENABLED) {
    const m = String(method || '').toUpperCase();
    if (m === 'CASH') return true;
    if (m === 'AZM' || m === 'SPLIT') return railEnabled;
    return false;
}

/** Why a method cannot be chosen, in operator words. Null when it can. */
export function unavailableMethodReason(method, railEnabled = POS_AZAMAN_RAIL_ENABLED) {
    if (isMethodAvailable(method, railEnabled)) return null;
    return 'Azaman POS settlement is not enabled yet, so Azaman balance and split payments cannot be taken. '
        + 'Take cash, or record the sale outside Azaman.';
}

/**
 * Merchant-cash separation. A cash sale is money the MERCHANT received; Azaman
 * never held it, so no surface may describe it as Azaman-custodied, held,
 * settled by Azaman, or part of an Azaman balance.
 */
export function cashDisclosure(paymentMethod) {
    const m = String(paymentMethod || '').toUpperCase();
    if (m !== 'CASH') return null;
    return 'Cash received directly by the merchant. Azaman does not hold or settle this cash.';
}

/** True when a sentence wrongly attributes merchant cash to Azaman custody. */
export function claimsAzamanHoldsCash(text) {
    const s = String(text || '');
    return /(azaman (holds|is holding|settles|settled|custod\w*)|held by azaman|custodied by azaman)/i.test(s);
}
