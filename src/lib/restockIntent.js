// src/lib/restockIntent.js
// =============================================================================
// §r40.2 (audit finding 2, r40.3 lifecycle fix) — durable retry identity for
// restock operations.
//
// The backend fingerprints each restock by (inventoryItem, exact decimal
// quantity string, idempotencyKey) and replays it exactly once per key. The
// portal must therefore keep the SAME idempotency key for the SAME logical
// restock until the operation is RESOLVED — including across a page reload
// AND across browser/tab termination:
//
//   request committed → response lost → browser closed → operator returns
//   later → retry MUST carry the ORIGINAL key, or the backend executes the
//   restock a SECOND time.
//
// EXPLICIT LIFECYCLE DECISION (r40.3, per audit):
//   • The pending-intent store is localStorage, NOT sessionStorage. An
//     unresolved intent SURVIVES page reload, tab close and full browser
//     termination. (sessionStorage only covered the reload case.)
//   • An unresolved intent EXPIRES after PENDING_INTENT_TTL_MS (24h). The
//     committed-but-unconfirmed ambiguity window is short (the backend
//     commits in seconds); beyond 24h the operator has observed stock state
//     and a same-quantity restock is a genuinely NEW purchase, which must
//     get a FRESH key rather than silently replay the old operation.
//   • CROSS-TAB BEHAVIOR IS DELIBERATE: identity is keyed by (item, canonical
//     quantity) in shared storage, so two tabs (or a reopened window)
//     retrying the same logical purchase converge to the SAME key and thus
//     ONE backend operation — exactly-once, the same semantics as an
//     in-tab retry. Two tabs intentionally making DIFFERENT purchases use
//     different quantities and never collide.
//   • If localStorage is unavailable (denied privacy mode), keys degrade to
//     an in-memory Map: the flow keeps working within the tab, reload
//     durability is lost, and nothing crashes.
//
// Quantity canonicalization is pure STRING manipulation: "1", "1.0" and
// "1.00" are the same logical quantity, so they must resolve to the same
// intent record. No Number()/parseFloat()/float arithmetic — that is the
// exact-decimal rule the backend already enforces (fingerprint v2), and the
// browser must not disagree about identity.
// =============================================================================

// 24 hours — see lifecycle decision above.
const PENDING_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

// Plain decimal only — the same grammar the backend's DECIMAL_STRING guard
// accepts. No sign, no exponent, no whitespace, no thousands separators.
const DECIMAL_STRING_RE = /^\d+(?:\.\d+)?$/;

// Canonical form of a valid decimal string: strip trailing fractional zeros
// and a bare trailing dot, so 1 / 1.0 / 1.00 all canonicalize to "1".
// Pure string ops — never Number()/parseFloat().
export function canonicalQuantity(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!DECIMAL_STRING_RE.test(s)) return null;
    if (s.includes('.')) {
        const [int, frac] = s.split('.');
        const trimmedFrac = frac.replace(/0+$/, '');
        return trimmedFrac ? `${int}.${trimmedFrac}` : int;
    }
    return s;
}

const STORAGE_PREFIX = 'azm:restock-intent:v1:';
const intentStorageKey = (itemId, canonicalQty) => `${STORAGE_PREFIX}${itemId}:${canonicalQty}`;

// localStorage throws in some privacy modes — degrade to in-memory keys so
// the flow keeps working (loses cross-restart durability, never crashes).
const memoryFallback = new Map();

function storageGet(key) {
    try {
        const raw = globalThis.localStorage?.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return memoryFallback.get(key) || null;
    }
}

function storageSet(key, value) {
    try {
        globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
        memoryFallback.set(key, value);
    }
}

function storageRemove(key) {
    try {
        globalThis.localStorage?.removeItem(key);
    } catch {
        /* ignore */
    }
    memoryFallback.delete(key);
}

function mintUuid() {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    // RFC4122 v4 fallback (non-crypto-grade contexts only)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// Get-or-create the durable idempotency key for the logical restock
// (itemId, canonical quantity). The same unresolved intent returns the SAME
// UUID across reloads, tab closes and browser restarts until it is cleared
// by success/explicit cancel or expires via TTL.
export function getOrCreateRestockIntentKey(itemId, qty) {
    const canonical = canonicalQuantity(qty);
    if (!canonical) return null; // caller must re-validate and surface an error
    const key = intentStorageKey(itemId, canonical);
    const existing = storageGet(key);
    if (existing && existing.uuid) {
        // TTL: an expired unresolved intent is treated as resolved — the
        // ambiguity window has closed, and this request is a genuinely new
        // purchase that must not silently replay the old operation.
        const age = Date.now() - Date.parse(existing.createdAt || 0);
        if (Number.isFinite(age) && age >= 0 && age < PENDING_INTENT_TTL_MS) {
            return existing.uuid;
        }
        // fall through: expired record is replaced with a fresh identity
    }
    const uuid = mintUuid();
    storageSet(key, { v: 1, uuid, qty: canonical, createdAt: new Date().toISOString() });
    return uuid;
}

// Resolve ONE pending intent: the successful (or explicitly cancelled) restock
// for (itemId, qty) clears only its own record — never another intent's.
export function clearRestockIntent(itemId, qty) {
    const canonical = canonicalQuantity(qty);
    if (!canonical) return;
    storageRemove(intentStorageKey(itemId, canonical));
}

// Introspection helper for the UI/tests: the stored record for this
// item/quantity, or null. Exposes createdAt so tests can age the record.
export function peekRestockIntent(itemId, qty) {
    const canonical = canonicalQuantity(qty);
    if (!canonical) return null;
    return storageGet(intentStorageKey(itemId, canonical));
}
