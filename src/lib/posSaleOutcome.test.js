import { describe, it, expect } from 'vitest';
import {
  shouldIssueReceipt, committedOrderId, isSettlementRefused,
  classifySyncFailure, itemsNeedingAttention, SETTLEMENT_DISABLED,
} from './posSaleOutcome';

describe('WP-K POS sale outcome', () => {
  it('issues a receipt only for a backend-returned order', () => {
    expect(shouldIssueReceipt({ order: { id: 'o1' } })).toBe(true);
    expect(shouldIssueReceipt({ id: 'o2' })).toBe(true);
    expect(shouldIssueReceipt({ offline: true })).toBe(false);
    expect(shouldIssueReceipt(null)).toBe(false);
    expect(committedOrderId({ offline: true })).toBeNull();
  });

  it('recognises the settlement refusal distinctly from a transient error', () => {
    expect(isSettlementRefused({ statusCode: 422, data: { code: SETTLEMENT_DISABLED } })).toBe(true);
    expect(isSettlementRefused({ statusCode: 422, code: SETTLEMENT_DISABLED })).toBe(true);
    expect(isSettlementRefused({ statusCode: 422, message: 'bad items' })).toBe(false);
    expect(isSettlementRefused({ statusCode: 500 })).toBe(false);
    expect(isSettlementRefused(undefined)).toBe(false);
  });

  it('never drops a queued sale, however many retries fail', () => {
    let item = { id: 'a', retryCount: 0 };
    for (let i = 0; i < 10; i++) {
      const next = classifySyncFailure(item);
      expect(next.id).toBe('a');
      item = next;
    }
    expect(item.retryCount).toBe(10);
    expect(item.status).toBe('NEEDS_ATTENTION');
    expect(itemsNeedingAttention([item])).toHaveLength(1);
  });

  it('parks after the attention threshold, not before', () => {
    expect(classifySyncFailure({ retryCount: 0 }).status).toBe('FAILED');
    expect(classifySyncFailure({ retryCount: 1 }).status).toBe('FAILED');
    expect(classifySyncFailure({ retryCount: 2 }).status).toBe('NEEDS_ATTENTION');
  });
});

// ── WP-K closure: the Azaman rail stays disabled; cash is the merchant's ─────
import {
    POS_AZAMAN_RAIL_ENABLED,
    isMethodAvailable,
    unavailableMethodReason,
    cashDisclosure,
    claimsAzamanHoldsCash,
} from './posSaleOutcome.js';

describe('POS Azaman rail authority', () => {
    it('the rail is disabled and only cash is selectable', () => {
        expect(POS_AZAMAN_RAIL_ENABLED).toBe(false);
        expect(isMethodAvailable('CASH')).toBe(true);
        expect(isMethodAvailable('AZM')).toBe(false);
        expect(isMethodAvailable('SPLIT')).toBe(false);
    });

    it('a disabled method carries an honest reason, never silence', () => {
        expect(unavailableMethodReason('AZM')).toMatch(/not enabled/i);
        expect(unavailableMethodReason('SPLIT')).toMatch(/not enabled/i);
        expect(unavailableMethodReason('CASH')).toBeNull();
    });

    it('the gate is a parameter, so enabling it later is one flag not a rewrite', () => {
        expect(isMethodAvailable('AZM', true)).toBe(true);
        expect(unavailableMethodReason('SPLIT', true)).toBeNull();
    });
});

describe('merchant cash is never described as Azaman-custodied money', () => {
    it('a cash sale carries the separation disclosure', () => {
        const text = cashDisclosure('CASH');
        expect(text).toMatch(/merchant/i);
        expect(text).toMatch(/does not hold/i);
        expect(claimsAzamanHoldsCash(text)).toBe(false);
    });

    it('no disclosure for non-cash methods', () => {
        expect(cashDisclosure('AZM')).toBeNull();
    });

    it('the guard catches a custody claim if one is ever introduced', () => {
        expect(claimsAzamanHoldsCash('Azaman holds this cash for the merchant')).toBe(true);
        expect(claimsAzamanHoldsCash('Cash received directly by the merchant.')).toBe(false);
    });
});
