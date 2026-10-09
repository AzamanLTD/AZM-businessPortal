/**
 * ewaWithdraw — pure withdrawal-integrity helpers for the EWA surface.
 *
 * Contract references (AZM-backend main, read-only):
 *  - POST /api/business-os/ewa/withdraw accepts `idempotencyKey` in the body
 *    (or clientRequestId / X-Idempotency-Key) and forwards it as the
 *    service's idempotency identity. WITH a key, a retry of the same
 *    committed request replays the committed outcome and moves no money;
 *    the same key reused with materially different parameters fails closed
 *    with EWA_IDEMPOTENCY_CONFLICT. WITHOUT a key the request has NO
 *    identity — a retry after a timeout or lost response is evaluated as a
 *    genuinely new withdrawal and can mint a second payout. The key is
 *    optional only for legacy callers; this portal is not one.
 *  - The 200 response is { success: true, result: { replayed, grossAmount,
 *    fee, netToEmployee, remainingWithdrawable, ... } } — the server-computed
 *    money truth. The UI must report THAT, not the amount the operator
 *    typed, and must never claim success without this response.
 *  - Amounts are exact decimals end to end: the backend re-parses the wire
 *    value with an exact-decimal constructor (max 8 dp), so the portal sends
 *    the operator's input as a plain decimal STRING — never a JS float.
 */

/** The operator's input, as an exact decimal string, or null if unusable.
 * Accepts only plain decimal notation ("25", "25.5", "25.5050") so the wire
 * value is byte-exact — no float normalization, no scientific notation, no
 * silent rounding. The backend allows at most 8 decimal places; anything
 * else is refused here with an honest message rather than mangled. */
export function normalizeAmountInput(raw) {
  const s = String(raw ?? '').trim();
  if (!/^\d+(\.\d{1,8})?$/.test(s)) return null;
  return s;
}

/** UI-side hint only. The backend re-validates the cap with exact-decimal
 * math; this guard exists to catch obvious over-cap input early, not to
 * decide money. Float comparison is acceptable because it is advisory. */
export function exceedsCapHint(amountStr, maxWithdrawal) {
  const max = Number(maxWithdrawal);
  if (!Number.isFinite(max) || max <= 0) return false;
  return Number(amountStr) > max;
}

/**
 * Deterministic identity of a withdrawal's ECONOMIC intent: which employee
 * gets advanced which exact amount. The amount is the canonical string — the
 * same intent always has the same fingerprint, so a changed amount (or a
 * different employee) is a NEW intent and mints a NEW idempotency key, never
 * a conflicting reuse of the old one.
 */
export function withdrawIntentFingerprint({ employeeId, amount } = {}) {
  return `emp:${employeeId ?? ''}::amt:${amount ?? ''}`;
}

/**
 * The idempotency key for the CURRENT withdrawal intent, if the intent is
 * still economically the same as the last attempt. Returns null when there is
 * no reusable intent (first attempt, or any economic input changed) — the
 * caller must then mint a fresh key. Keeping one key per economic intent is
 * what makes a retry after a lost response replay the committed withdrawal
 * instead of creating a second payout.
 */
export function resolveWithdrawIntentKey(intent, input) {
  if (!intent || !intent.key || !intent.fingerprint) return null;
  return intent.fingerprint === withdrawIntentFingerprint(input) ? intent.key : null;
}

/** Exact decimal string for display — no rounding, no invented precision. */
function money(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

/**
 * Honest success text for a withdrawal response. Reports the server-computed
 * truth (gross, fee, net) instead of the typed amount, distinguishes a
 * committed withdrawal from a replayed one, and refuses to invent an outcome
 * when the envelope carries no result.
 */
export function describeWithdrawResult(res) {
  const result = res && typeof res === 'object' ? res.result : null;
  if (!result || typeof result !== 'object') {
    return 'Server acknowledged the withdrawal but returned no outcome — check the EWA history before acting on it.';
  }
  const gross = money(result.grossAmount);
  const fee = money(result.fee);
  const net = money(result.netToEmployee);
  if (result.replayed) {
    return `Retry confirmed — the original withdrawal was replayed, no new funds moved. Gross ${gross}, fee ${fee}, net to employee ${net} USDC.`;
  }
  return `Withdrawal processed per the server. Gross ${gross}, fee ${fee}, net to employee ${net} USDC.`;
}

/**
 * A request with no HTTP answer is not a failure: the withdrawal may have
 * committed. Reusing (not clearing) the intent key after such an outcome is
 * what makes the retry safe — the backend replays the committed withdrawal
 * instead of minting a second payout. Same definition as the POS surface.
 */
export function isUnknownOutcome(err) {
  return !err || err.statusCode == null;
}
