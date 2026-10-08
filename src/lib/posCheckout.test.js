import { describe, it, expect } from 'vitest';
import {
  cartFingerprint,
  resolveIntentKey,
  estimateTax,
  taxRowLabel,
  receiptAmounts,
  isUnknownOutcome,
} from './posCheckout';

describe('cartFingerprint', () => {
  it('is stable for the same cart regardless of item order', () => {
    const a = [{ id: 1, qty: 2 }, { id: 2, qty: 1 }];
    const b = [{ id: 2, qty: 1 }, { id: 1, qty: 2 }];
    expect(cartFingerprint(a)).toBe(cartFingerprint(b));
  });

  it('changes when the cart contents change', () => {
    expect(cartFingerprint([{ id: 1, qty: 2 }])).not.toBe(cartFingerprint([{ id: 1, qty: 3 }]));
    expect(cartFingerprint([{ id: 1, qty: 2 }])).not.toBe(cartFingerprint([{ id: 1, qty: 2 }, { id: 9, qty: 1 }]));
  });

  it('tolerates empty and malformed carts', () => {
    expect(cartFingerprint([])).toBe('');
    expect(cartFingerprint(null)).toBe('');
    expect(cartFingerprint(undefined)).toBe('');
  });
});

describe('resolveIntentKey — one idempotency key per checkout intent', () => {
  const cart = [{ id: 'p1', qty: 2 }, { id: 'p2', qty: 1 }];

  it('returns null for a missing or malformed intent (caller mints a fresh key)', () => {
    expect(resolveIntentKey(null, cart)).toBeNull();
    expect(resolveIntentKey({}, cart)).toBeNull();
    expect(resolveIntentKey({ key: 'k', fingerprint: 'stale' }, cart)).toBeNull();
  });

  it('reuses the SAME key while the cart is unchanged — a lost-response retry replays the original order', () => {
    const intent = { key: 'intent-1', fingerprint: cartFingerprint(cart) };
    expect(resolveIntentKey(intent, cart)).toBe('intent-1');
  });

  it('refuses the key once the cart changes — a different cart is a different order intent', () => {
    const intent = { key: 'intent-1', fingerprint: cartFingerprint(cart) };
    const edited = [...cart, { id: 'p3', qty: 1 }];
    expect(resolveIntentKey(intent, edited)).toBeNull();
  });
});

describe('estimateTax — pre-charge estimate from the DEFAULT tax preset', () => {
  it('computes a PERCENTAGE estimate from the default preset', () => {
    expect(estimateTax(100, { type: 'PERCENTAGE', value: 5 })).toBe(5);
  });

  it('computes a FLAT estimate from the default preset', () => {
    expect(estimateTax(100, { type: 'FLAT', value: 2.5 })).toBe(2.5);
  });

  it('returns null when the preset is unknown — the UI must say "applied at checkout", never invent a rate', () => {
    expect(estimateTax(100, null)).toBeNull();
    expect(estimateTax(100, undefined)).toBeNull();
  });

  it('returns null for malformed presets instead of NaN', () => {
    expect(estimateTax(100, { type: 'PERCENTAGE', value: 'not-a-number' })).toBeNull();
    expect(estimateTax(100, { type: 'PERCENTAGE', value: -3 })).toBeNull();
    expect(estimateTax(100, { type: 'WEIRD', value: 5 })).toBeNull();
  });
});

describe('taxRowLabel', () => {
  it('labels a percentage preset honestly as an estimate confirmed on charge', () => {
    expect(taxRowLabel({ type: 'PERCENTAGE', value: 5 })).toContain('est.');
  });

  it('labels a flat preset honestly', () => {
    expect(taxRowLabel({ type: 'FLAT', value: 2.5 })).toContain('flat');
  });

  it('never claims a rate when the preset is unknown', () => {
    expect(taxRowLabel(null)).toContain('applied at checkout');
    expect(taxRowLabel({ type: 'GHOST', value: 5 })).toContain('applied at checkout');
  });
});

describe('receiptAmounts — server truth beats the client estimate', () => {
  it('uses the server-computed amounts when the response carries them', () => {
    const out = receiptAmounts(
      { computedSubtotal: '10', computedTax: '0.5', computedGrand: '10.5', change: '4.5' },
      { subtotal: 10, tax: 0.25, total: 10.25, cashGiven: 15 },
    );
    expect(out).toEqual({ subtotal: 10, tax: 0.5, total: 10.5, change: 4.5, authoritative: true });
  });

  it('treats a duplicate replay response (null subtotal/tax) as authoritative for the settled total', () => {
    const out = receiptAmounts(
      { computedSubtotal: null, computedTax: null, computedGrand: '12', change: '0' },
      { subtotal: 11, tax: 0, total: 11, cashGiven: 12 },
    );
    expect(out.authoritative).toBe(true);
    expect(out.total).toBe(12);
    expect(out.change).toBe(0);
    expect(out.subtotal).toBe(11); // estimate fallback, receipt only shows the settled total
    expect(out.tax).toBe(0);
  });

  it('falls back to the pre-charge estimate ONLY for offline sales (no server response)', () => {
    const out = receiptAmounts(null, { subtotal: 10, tax: 0.5, total: 10.5, cashGiven: 12 });
    expect(out).toEqual({ subtotal: 10, tax: 0.5, total: 10.5, change: 1.5, authoritative: false });
  });

  it('never reports a negative change', () => {
    const out = receiptAmounts(null, { subtotal: 10, tax: 0, total: 10, cashGiven: 5 });
    expect(out.change).toBe(0);
  });
});

describe('isUnknownOutcome — a request with no HTTP answer is not a failure', () => {
  it('classifies network/timeouts as unknown outcome (no statusCode)', () => {
    expect(isUnknownOutcome(new TypeError('Failed to fetch'))).toBe(true);
    expect(isUnknownOutcome(new Error('signal is aborted without reason'))).toBe(true);
    expect(isUnknownOutcome(null)).toBe(true);
  });

  it('classifies definitive server answers by their statusCode', () => {
    const e = new Error('Each item requires a valid productId');
    e.statusCode = 400;
    expect(isUnknownOutcome(e)).toBe(false);
  });
});
