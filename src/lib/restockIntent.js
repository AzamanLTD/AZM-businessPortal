// src/lib/restockIntent.js
// =============================================================================
// §r40.2 (audit finding 2) — durable retry identity for restock operations.
//
// The backend fingerprints each restock by (inventoryItem, exact decimal
// quantity string, idempotencyKey) and replays it exactly once per key. The
// portal must therefore keep the SAME idempotency key for the SAME logical
// restock until the operation is RESOLVED — including across a page reload:
//
//   request sent -> network dies mid-response -> browser reloads -> operator
//   retries the same purchase -> the retry MUST carry the ORIGINAL key, or
//   the backend executes the restock a SECOND time.
//
// A React useRef/useState key dies with the component (and with the page).
// This module stores pending intents in sessionStorage — which survives
// reloads within the browsing session — keyed by (item, canonical quantity):
//
//   getOrCreateRestockIntentKey(itemId, qty) — get-or-create the durable key
//   clearRestockIntent(itemId, qty)          — resolve/cancel ONE intent
//
// Quantity canonicalization is pure STRING manipulation: "1", "1.0" and
// "1.00" are the same logical quantity, so they must resolve to the same
// intent record. No Number()/parseFloat()/float arithmetic — that is the
// exact-decimal rule the backend already enforces (fingerprint v2), and the
// browser must not disagree about identity.
// =============================================================================

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

const STORAGE_PREFIX = 'azm:restock-intent:';
const intentStorageKey = (itemId, canonicalQty) => `${STORAGE_PREFIX}${itemId}:${canonicalQty}`;

// sessionStorage throws in some privacy modes — degrade to in-memory keys so
// the flow keeps working (loses reload durability, never crashes the page).
const memoryFallback = new Map();

function storageGet(key) {
    try {
        const raw = globalThis.sessionStorage?.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return memoryFallback.get(key) || null;
    }
}

function storageSet(key, value) {
    try {
        globalThis.sessionStorage?.setItem(key, JSON.stringify(value));
    } catch {
        memoryFallback.set(key, value);
    }
}

function storageRemove(key) {
    try {
        globalThis.sessionStorage?.removeItem(key);
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
// UUID across reloads until it is cleared by success or explicit cancel.
export function getOrCreateRestockIntentKey(itemId, qty) {
    const canonical = canonicalQuantity(qty);
    if (!canonical) return null; // caller must re-validate and surface an error
    const key = intentStorageKey(itemId, canonical);
    const existing = storageGet(key);
    if (existing && existing.uuid) return existing.uuid;
    const uuid = mintUuid();
    storageSet(key, { uuid, qty: canonical, createdAt: new Date().toISOString() });
    return uuid;
}

// Resolve ONE pending intent: the successful (or explicitly cancelled) restock
// for (itemId, qty) clears only its own record — never another intent's.
export function clearRestockIntent(itemId, qty) {
    const canonical = canonicalQuantity(qty);
    if (!canonical) return;
    storageRemove(intentStorageKey(itemId, canonical));
}

// Introspection helper for the UI: is there an unresolved intent for this
// item/quantity? (Not used by the mutation path — useful for tests/debug.)
export function peekRestockIntent(itemId, qty) {
    const canonical = canonicalQuantity(qty);
    if (!canonical) return null;
    return storageGet(intentStorageKey(itemId, canonical));
}
