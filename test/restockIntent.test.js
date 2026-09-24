// =============================================================================
// §r40.2 (audit finding 2) — durable restock retry identity.
// Targeted proofs that the restock idempotency key survives reloads and
// resolution boundaries EXACTLY:
//   • success clears ONLY the resolved intent
//   • failure / timeout keep the identity (retry converges to the same op)
//   • a simulated reload keeps the identity
//   • same item + same canonical quantity reuses the identity
//   • a changed quantity is a different logical intent
//   • a new restock after success gets a FRESH identity
//   • high-magnitude exact values stay distinct (no float coercion)
//   • 1 / 1.0 / 1.00 canonicalize deterministically
//   • cancelling one intent never touches another
// These are NEW tests on top of the existing 198-test suite.
// =============================================================================
import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  canonicalQuantity,
  getOrCreateRestockIntentKey,
  clearRestockIntent,
  peekRestockIntent,
} from '@/lib/restockIntent';

const store = () => globalThis.sessionStorage;

describe('restock durable intent identity (r40.2)', () => {
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

    test('a SIMULATED RELOAD keeps the identity — a fresh module load recovers the same pending key from sessionStorage', async () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '12.5');
      // Simulate a browser reload: the JS context is torn down and re-created;
      // sessionStorage (browser-durable) is what survives.
      vi.resetModules();
      const fresh = await import('@/lib/restockIntent');
      const k2 = fresh.getOrCreateRestockIntentKey('item-1', '12.5');
      expect(k2).toBe(k1);
    });

    test('a CHANGED quantity creates a distinct logical intent', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      const k2 = getOrCreateRestockIntentKey('item-1', '6');
      expect(k2).not.toBe(k1);
      // both are pending independently
      expect(peekRestockIntent('item-1', '5')).not.toBeNull();
      expect(peekRestockIntent('item-1', '6')).not.toBeNull();
    });

    test('the SAME quantity after a SUCCESSFUL completion gets a FRESH identity', () => {
      const k1 = getOrCreateRestockIntentKey('item-1', '5');
      clearRestockIntent('item-1', '5'); // resolved
      const k2 = getOrCreateRestockIntentKey('item-1', '5'); // new intentional restock
      expect(k2).not.toBe(k1);
      expect(peekRestockIntent('item-1', '5')?.uuid).toBe(k2);
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

    test('high-magnitude distinct quantities hold distinct durable identities', () => {
      const kA = getOrCreateRestockIntentKey('item-1', '99999999999999999999.01');
      const kB = getOrCreateRestockIntentKey('item-1', '99999999999999999999.02');
      expect(kA).not.toBe(kB);
      // and each is stable across a "retry"
      expect(getOrCreateRestockIntentKey('item-1', '99999999999999999999.01')).toBe(kA);
      expect(getOrCreateRestockIntentKey('item-1', '99999999999999999999.02')).toBe(kB);
    });

    test('invalid quantity input yields NO identity (caller must refuse the request)', () => {
      expect(getOrCreateRestockIntentKey('item-1', 'abc')).toBeNull();
      expect(getOrCreateRestockIntentKey('item-1', '1e3')).toBeNull();
      expect(getOrCreateRestockIntentKey('item-1', '')).toBeNull();
      // and nothing was persisted for the invalid attempts
      expect(store().length).toBe(0);
    });

    test('sessionStorage degradation never crashes: keys still work (in-memory)', () => {
      const real = globalThis.sessionStorage;
      // a privacy mode that throws on every access
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        get() { throw new DOMException('denied', 'SecurityError'); },
      });
      try {
        const k1 = getOrCreateRestockIntentKey('item-1', '5');
        expect(k1).toBeTruthy();
        expect(getOrCreateRestockIntentKey('item-1', '5.0')).toBe(k1); // retry still converges
        clearRestockIntent('item-1', '5');
      } finally {
        Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: real });
      }
    });
  });
});
