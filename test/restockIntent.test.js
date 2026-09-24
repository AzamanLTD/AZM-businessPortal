// =============================================================================
// §r40.3 (final audit, finding 3) — restock retry identity lifecycle proofs.
// The pending-intent store is localStorage + 24h TTL. Required semantics, all
// proven here against the real storage API:
//   • the unresolved intent survives reload, TAB CLOSE and BROWSER
//     TERMINATION (fresh module instance, storage intact)
//   • the same logical purchase keeps the same idempotency key until resolved
//   • success clears ONLY its own pending intent
//   • an explicitly cancelled intent is cleared (and only its own record)
//   • a genuinely new purchase gets a fresh key
//   • cross-tab behavior is deliberate: two tabs converge on one identity
//   • an intent expires after the TTL (fresh key, no silent replay)
//   • exact decimal canonicalization remains string-only (no float coercion)
//   • storage-denied privacy mode degrades safely
// =============================================================================
import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  canonicalQuantity,
  getOrCreateRestockIntentKey,
  clearRestockIntent,
  peekRestockIntent,
} from '@/lib/restockIntent';

const store = () => globalThis.localStorage;

// Test-only surgery: age a pending intent record past the TTL boundary.
const ageIntent = (itemId, qty, ageMs) => {
  const canonical = canonicalQuantity(qty);
  const rec = peekRestockIntent(itemId, canonical);
  store().setItem(
    `azm:restock-intent:v1:${itemId}:${canonical}`,
    JSON.stringify({ ...rec, createdAt: new Date(Date.now() - ageMs).toISOString() }),
  );
};

describe('restock durable intent identity (r40.3)', () => {
  beforeEach(() => {
    store().clear();
  });

  describe('canonicalQuantity — deterministic, string-only', () => {
    test('1, 1.0 and 1.00 canonicalize to the SAME logical quantity', () => {
      expect(canonicalQuantity('1')).toBe('1');
      expect(canonicalQuantity('1.0')).toBe('1');
      expect(canonicalQuantity('1.00')).toBe('1');
    });

    test('12.50, 12.5 and 12.500 canonicalize identically', () => {
      expect(canonicalQuantity('12.50')).toBe('12.5');
      expect(canonicalQuantity('12.5')).toBe('12.5');
      expect(canonicalQuantity('12.500')).toBe('12.5');
    });

    test('high-magnitude exact values remain DISTINCT — no float coercion', () => {
      // These two strings are DIFFERENT amounts. A float round-trip
      // (Number -> toString) would be indistinguishable from equality here.
      const a = canonicalQuantity('99999999999999999999.01');
      const b = canonicalQuantity('99999999999999999999.02');
      expect(a).not.toBe(b);
      expect(canonicalQuantity('12345678901234567890')).toBe('12345678901234567890');
      expect(canonicalQuantity('0.30000000000000004')).toBe('0.30000000000000004');
    });

    test('invalid quantities are rejected, not coerced', () => {
      expect(canonicalQuantity('')).toBeNull();
      expect(canonicalQuantity('-1')).toBeNull();
      expect(canonicalQuantity('1e3')).toBeNull();
      expect(canonicalQuantity(' 1 ')).toBe('1'); // outer trim only
      expect(canonicalQuantity('1,000')).toBeNull();
      expect(canonicalQuantity('1.')).toBeNull();
      expect(canonicalQuantity(null)).toBeNull();
    });
  });

  describe('intent identity lifecycle', () => {
    test('same item + same canonical quantity REUSES the same key (unresolved request)', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      const k2 = getOrCreateRestockIntentKey('item-1', '5.0'); // same canonical qty
      const k3 = getOrCreateRestockIntentKey('item-1', '5.00');
      expect(k2).toBe(k1);
      expect(k3).toBe(k1);
    });

    test('a FAILED request KEEPS its identity — a retry converges to the same key', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '7');
      // failure path: the mutation never calls clearRestockIntent
      const k2 = getOrCreateRestockIntentKey('item-1', '7');
      expect(k2).toBe(k1);
    });

    test('a TIMEOUT keeps its identity (request unresolved, operator retries)', () => {
      const k1 = getOrCreateRestockIntentKey('item-9', '2.5');
      // network timeout: no success callback fired, no clear — retry identity
      const k2 = getOrCreateRestockIntentKey('item-9', '2.50');
      expect(k2).toBe(k1);
    });

    test('a PAGE RELOAD keeps the identity — a fresh module load recovers the same pending key', async () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '12.5');
      vi.resetModules();
      const fresh = await import('@/lib/restockIntent');
      expect(fresh.getOrCreateRestockIntentKey('item-1', '12.5')).toBe(k1);
    });

    test('TAB CLOSE / BROWSER TERMINATION keeps the identity — storage survives the JS context dying', async () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '30');
      // Simulate closing the browser: the module context is torn down
      // completely (fresh import) and only localStorage survives.
      vi.resetModules();
      const fresh = await import('@/lib/restockIntent');
      const k2 = fresh.getOrCreateRestockIntentKey('item-1', '30.0');
      expect(k2).toBe(k1);
      // ...and the record is still inspectable for the UI / diagnostics
      expect(fresh.peekRestockIntent('item-1', '30').uuid).toBe(k1);
    });

    test('CROSS-TAB is deliberate: two independent module instances (two tabs) converge on ONE identity', async () => {
      // tab A mints the intent
      const kA = getOrCreateRestockIntentKey('item-7', '4.25');
      // tab B is a SEPARATE module instance sharing the same persistent store
      vi.resetModules();
      const tabB = await import('@/lib/restockIntent');
      const kB = tabB.getOrCreateRestockIntentKey('item-7', '4.25');
      // both tabs retrying the same logical purchase converge to ONE backend
      // operation — the same exactly-once semantics as an in-tab retry
      expect(kB).toBe(kA);
    });

    test('a SUCCESSFUL request clears ONLY its own pending identity', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      getOrCreateRestockIntentKey('item-1', '3'); // a second pending intent
      getOrCreateRestockIntentKey('item-2', '5'); // same qty, other item

      clearRestockIntent('item-1', '5.00'); // resolved via canonical-equal qty

      expect(peekRestockIntent('item-1', '5')).toBeNull();
      // the OTHER intents are untouched
      expect(peekRestockIntent('item-1', '3')).not.toBeNull();
      expect(peekRestockIntent('item-2', '5')).not.toBeNull();
    });

    test('a CANCELLED intent clears its own record and does not affect another intent', () => {
      const kA = getOrCreateRestockIntentKey('item-1', '5');
      getOrCreateRestockIntentKey('item-2', '5');
      clearRestockIntent('item-1', '5'); // explicit cancel
      expect(peekRestockIntent('item-1', '5')).toBeNull();
      expect(peekRestockIntent('item-2', '5')).not.toBeNull();
      // a later restock of the cancelled intent is a NEW logical operation
      const kA2 = getOrCreateRestockIntentKey('item-1', '5');
      expect(kA2).not.toBe(kA);
    });

    test('the SAME quantity after a SUCCESSFUL completion gets a FRESH identity', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      clearRestockIntent('item-1', '5'); // resolved
      const k2 = getOrCreateRestockIntentKey('item-1', '5'); // new intentional restock
      expect(k2).not.toBe(k1);
      expect(peekRestockIntent('item-1', '5')?.uuid).toBe(k2);
    });

    test('a CHANGED quantity creates a distinct logical intent', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      const k2 = getOrCreateRestockIntentKey('item-1', '6');
      expect(k2).not.toBe(k1);
      expect(peekRestockIntent('item-1', '5')).not.toBeNull();
      expect(peekRestockIntent('item-1', '6')).not.toBeNull();
    });

    test('TTL: an unresolved intent EXPIRES after 24h — the retry is a genuinely new purchase', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      // age the record past the TTL boundary
      ageIntent('item-1', '5', 24 * 60 * 60 * 1000 + 1000);
      const k2 = getOrCreateRestockIntentKey('item-1', '5');
      expect(k2).not.toBe(k1); // fresh identity — no silent replay of a stale op
    });

    test('TTL: an intent aged just UNDER 24h still reuses its identity (retry converges)', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      ageIntent('item-1', '5', 23 * 60 * 60 * 1000);
      const k2 = getOrCreateRestockIntentKey('item-1', '5');
      expect(k2).toBe(k1);
    });

    test('TTL expiry does not touch other pending intents', () => {
      getOrCreateRestockIntentKey('item-1', '5');
      const kOther = getOrCreateRestockIntentKey('item-1', '6');
      ageIntent('item-1', '5', 24 * 60 * 60 * 1000 + 1000);
      getOrCreateRestockIntentKey('item-1', '5'); // expires + remints
      expect(peekRestockIntent('item-1', '6').uuid).toBe(kOther);
    });

    test('high-magnitude distinct quantities hold distinct durable identities', () => {
      const kA = getOrCreateRestockIntentKey('item-1', '99999999999999999999.01');
      const kB = getOrCreateRestockIntentKey('item-1', '99999999999999999999.02');
      expect(kA).not.toBe(kB);
      expect(getOrCreateRestockIntentKey('item-1', '99999999999999999999.01')).toBe(kA);
      expect(getOrCreateRestockIntentKey('item-1', '99999999999999999999.02')).toBe(kB);
    });

    test('invalid quantity input yields NO identity (caller must refuse the request)', () => {
      expect(getOrCreateRestockIntentKey('item-1', 'abc')).toBeNull();
      expect(getOrCreateRestockIntentKey('item-1', '1e3')).toBeNull();
      expect(getOrCreateRestockIntentKey('item-1', '')).toBeNull();
      expect(store().length).toBe(0);
    });

    test('localStorage degradation never crashes: keys still work within the tab (in-memory)', () => {
      const real = globalThis.localStorage;
      // a privacy mode that throws on every access
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('denied', 'SecurityError'); },
      });
      try {
        const k1 = getOrCreateRestockIntentKey('item-1', '5');
        expect(k1).toBeTruthy();
        expect(getOrCreateRestockIntentKey('item-1', '5.0')).toBe(k1); // retry converges
        clearRestockIntent('item-1', '5');
      } finally {
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: real });
      }
    });
  });
});
