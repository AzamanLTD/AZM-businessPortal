import { describe, it, expect } from 'vitest';
import {
  cartFingerprint,
  checkoutIntentFingerprint,
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

describe('checkoutIntentFingerprint — one identity per economic intent', () => {
  // The backend POS fingerprint covers business, items, payment method,
  // money fields and source. The client intent fingerprint must cover every
  // client-controlled input that feeds it, or a legitimately changed
  // checkout would reuse a key the backend rejects as a fingerprint conflict.
  const base = {
    cart: [{ id: 'p1', qty: 2 }, { id: 'p2', qty: 1 }],
    paymentMethod: 'CASH',
    cashGiven: 50,
    azmAmount: undefined,
    source: 'POS',
    businessProfileId: 'biz1',
  };
  const clone = (o) => ({ ...o, cart: o.cart.map(c => ({ ...c })) });

  it('1. exact same cart + payment method + money → same fingerprint', () => {
    expect(checkoutIntentFingerprint(base)).toBe(checkoutIntentFingerprint(clone(base)));
  });

  it('2. cashGiven change → NEW intent', () => {
    expect(checkoutIntentFingerprint({ ...clone(base), cashGiven: 60 }))
      .not.toBe(checkoutIntentFingerprint(base));
  });

  it('3. CASH → AZM payment-method change → NEW intent', () => {
    expect(checkoutIntentFingerprint({ ...clone(base), paymentMethod: 'AZM', cashGiven: undefined, azmAmount: 10.5 }))
      .not.toBe(checkoutIntentFingerprint(base));
  });

  it('4. AZM amount change → NEW intent (split payments)', () => {
    const a = { ...clone(base), paymentMethod: 'SPLIT', cashGiven: 5, azmAmount: 10 };
    const b = { ...clone(base), paymentMethod: 'SPLIT', cashGiven: 5, azmAmount: 12 };
    expect(checkoutIntentFingerprint(a)).not.toBe(checkoutIntentFingerprint(b));
  });

  it('5. item/qty change → NEW intent', () => {
    expect(checkoutIntentFingerprint({ ...clone(base), cart: [{ id: 'p1', qty: 3 }, { id: 'p2', qty: 1 }] }))
      .not.toBe(checkoutIntentFingerprint(base));
  });

  it('6. item-order permutation does not change identity', () => {
    expect(checkoutIntentFingerprint({ ...clone(base), cart: [{ id: 'p2', qty: 1 }, { id: 'p1', qty: 2 }] }))
      .toBe(checkoutIntentFingerprint(base));
  });

  it('normalizes undefined/null money fields deterministically, without inventing values', () => {
    expect(checkoutIntentFingerprint({ ...clone(base), cashGiven: undefined }))
      .toBe(checkoutIntentFingerprint({ ...clone(base), cashGiven: null }));
    expect(checkoutIntentFingerprint({ ...clone(base), azmAmount: undefined }))
      .toBe(checkoutIntentFingerprint({ ...clone(base), azmAmount: null }));
  });

  it('business identity is part of the intent — a different business is a different intent', () => {
    expect(checkoutIntentFingerprint({ ...clone(base), businessProfileId: 'biz2' }))
      .not.toBe(checkoutIntentFingerprint(base));
  });
});

describe('resolveIntentKey — reuse across retries, remint on economic change', () => {
  const base = {
    cart: [{ id: 'p1', qty: 2 }, { id: 'p2', qty: 1 }],
    paymentMethod: 'CASH',
    cashGiven: 50,
    azmAmount: undefined,
    source: 'POS',
    businessProfileId: 'biz1',
  };
  const clone = (o) => ({ ...o, cart: o.cart.map(c => ({ ...c })) });

  it('7. lost-response retry of the EXACT same economic intent reuses the key', () => {
    const intent = { key: 'intent-1', fingerprint: checkoutIntentFingerprint(base) };
    expect(resolveIntentKey(intent, clone(base))).toBe('intent-1');
  });

  it('refuses the key after any economic input changes — a new intent mints a new key', () => {
    const intent = { key: 'intent-1', fingerprint: checkoutIntentFingerprint(base) };
    expect(resolveIntentKey(intent, { ...clone(base), cashGiven: 60 })).toBeNull();
    expect(resolveIntentKey(intent, { ...clone(base), paymentMethod: 'AZM', cashGiven: undefined, azmAmount: 50 })).toBeNull();
    expect(resolveIntentKey(intent, { ...clone(base), azmAmount: 7 })).toBeNull();
    expect(resolveIntentKey(intent, { ...clone(base), cart: [{ id: 'p1', qty: 3 }, { id: 'p2', qty: 1 }] })).toBeNull();
    expect(resolveIntentKey(intent, { ...clone(base), businessProfileId: 'biz2' })).toBeNull();
  });

  it('returns null for a missing or malformed intent (caller mints a fresh key)', () => {
    expect(resolveIntentKey(null, clone(base))).toBeNull();
    expect(resolveIntentKey({}, clone(base))).toBeNull();
    expect(resolveIntentKey({ key: 'k' }, clone(base))).toBeNull();
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
