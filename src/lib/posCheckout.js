/**
 * posCheckout — pure checkout-integrity helpers for the POS surface.
 *
 * Contract references (AZM-backend main, read-only):
 *  - POST /api/business-os/pos/order dedupes on (idempotencyKey, fingerprint)
 *    and replays the ORIGINAL order for a safe retry (duplicate: true, HTTP
 *    200). The fingerprint is computed server-side from business, items,
 *    payment method, money fields and source — an idempotency key can never
 *    be replayed with a different payload.
 *  - The 200/201 response carries the SERVER-computed money truth:
 *    { computedSubtotal, computedTax, computedGrand, change } (exact-decimal
 *    strings on the wire). For a duplicate replay, computedSubtotal and
 *    computedTax are null and computedGrand/change reflect the original
 *    order's settled amounts.
 *  - Tax is computed by the backend from the business's DEFAULT tax preset
 *    (BusinessTaxPreset.isDefault, types FLAT | PERCENTAGE). The portal only
 *    ever shows it as a PRE-CHARGE ESTIMATE; the receipt shows the
 *    server-computed truth.
 */

/** Stable identity of a cart's contents: id:qty pairs, order-independent. */
export function cartFingerprint(cart) {
  return (cart || [])
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map(i => `${i.id}:${i.qty}`)
    .join('|');
}

/**
 * Deterministic identity of a checkout's ECONOMIC intent. It covers every
 * client-controlled input the backend folds into its POS idempotency
 * fingerprint (business, items, payment method, money fields, source): the
 * same cart with a changed payment method or amount is a NEW intent and must
 * mint a NEW key, not reuse one the backend would refuse as a fingerprint
 * conflict. Values are canonically stringified as given — no floating-point
 * normalization, no invented defaults.
 */
export function checkoutIntentFingerprint(checkout) {
  const { cart, paymentMethod, cashGiven, azmAmount, source, businessProfileId } = checkout || {};
  const items = (cart || [])
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map(i => `${i.id}:${i.qty}`)
    .join('|');
  return [
    `biz:${businessProfileId == null ? '' : businessProfileId}`,
    `items:${items}`,
    `pm:${String(paymentMethod ?? '').toUpperCase()}`,
    `cash:${cashGiven == null ? '' : cashGiven}`,
    `azm:${azmAmount == null ? '' : azmAmount}`,
    `src:${source == null ? '' : source}`,
  ].join('::');
}

/**
 * The idempotency key for the CURRENT checkout intent, if the intent is still
 * economically the same. Returns null when there is no reusable intent (first
 * charge, or any economic input changed since the last attempt) — the caller
 * must then mint a fresh key. Keeping one key per economic intent is what
 * makes a retry after a lost response replay the original order instead of
 * creating a second one.
 */
export function resolveIntentKey(intent, checkout) {
  if (!intent || !intent.key || !intent.fingerprint) return null;
  return intent.fingerprint === checkoutIntentFingerprint(checkout) ? intent.key : null;
}

/**
 * Pre-charge tax estimate from the business's DEFAULT tax preset. Returns
 * null when the preset is unknown/invalid — the UI must then say "applied at
 * checkout" rather than invent a rate. This never decides money; the backend
 * computes the authoritative tax.
 */
export function estimateTax(subtotal, defaultPreset) {
  if (!defaultPreset) return null;
  const value = Number(defaultPreset.value);
  if (!Number.isFinite(value) || value < 0) return null;
  if (defaultPreset.type === 'FLAT') return value;
  if (defaultPreset.type === 'PERCENTAGE') return (subtotal * value) / 100;
  return null;
}

/** Honest label for the cart's tax row. Never claims authority. */
export function taxRowLabel(defaultPreset) {
  if (!defaultPreset) return 'Tax — applied at checkout';
  const value = Number(defaultPreset.value);
  if (!Number.isFinite(value) || value < 0) return 'Tax — applied at checkout';
  if (defaultPreset.type === 'PERCENTAGE') return `Tax (${value}% est. — confirmed on charge)`;
  if (defaultPreset.type === 'FLAT') return `Tax (flat ${value} est. — confirmed on charge)`;
  return 'Tax — applied at checkout';
}

/**
 * Receipt money amounts. Prefers the server-computed truth; falls back to the
 * pre-charge client estimate only for offline-enqueued sales, which have no
 * server response yet. `authoritative` tells the receipt whether it may
 * present the numbers as settled truth or must label them as an estimate.
 */
export function receiptAmounts(server, estimate) {
  const authoritative = !!(server && server.computedGrand != null);
  const total = authoritative
    ? Number(server.computedGrand)
    : (estimate && Number.isFinite(estimate.total) ? estimate.total : 0);
  const sub = server && server.computedSubtotal != null
    ? Number(server.computedSubtotal)
    : (estimate && Number.isFinite(estimate.subtotal) ? estimate.subtotal : null);
  const tax = server && server.computedTax != null
    ? Number(server.computedTax)
    : (estimate && Number.isFinite(estimate.tax) ? estimate.tax : null);
  const change = server && server.change != null
    ? Number(server.change)
    : (estimate && Number.isFinite(estimate.cashGiven)
      ? Math.max(0, estimate.cashGiven - total)
      : null);
  return { subtotal: sub, tax, total, change, authoritative };
}

/**
 * Unknown-outcome classification. Errors from the transport that carry a
 * statusCode are DEFINITIVE server answers (the order did NOT go through).
 * A request that never got an HTTP answer (network drop, timeout, aborted
 * fetch) has no statusCode — the order may have been created and the UI must
 * never tell the operator it "failed".
 */
export function isUnknownOutcome(err) {
  return !err || err.statusCode == null;
}
