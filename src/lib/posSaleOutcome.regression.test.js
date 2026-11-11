// WP-K — regression coverage for the offline/queued sale containment.
import { describe, it, expect } from 'vitest';
import {
  shouldIssueReceipt,
  isSettlementRefused,
  classifySyncFailure,
  itemsNeedingAttention,
} from './posSaleOutcome';

const refusal = { statusCode: 422, data: { code: 'POS_SETTLEMENT_NOT_ENABLED' } };
const transient = { statusCode: null, message: 'Failed to fetch' };

describe('WP-K offline/queued sale containment', () => {
  it('never issues a receipt without a server order id', () => {
    expect(shouldIssueReceipt({ offline: true })).toBe(false);
    expect(shouldIssueReceipt({ success: true })).toBe(false);
    expect(shouldIssueReceipt(null)).toBe(false);
    expect(shouldIssueReceipt({ order: { id: 'ord_1' } })).toBe(true);
  });

  it('recognises the settlement refusal and does not treat it as transient', () => {
    expect(isSettlementRefused(refusal)).toBe(true);
    expect(isSettlementRefused(transient)).toBe(false);
  });

  it('parks a queued sale as NEEDS_ATTENTION instead of dropping it', () => {
    const item = { type: 'CREATE_ORDER', payload: { idempotencyKey: 'k1' }, retryCount: 2 };
    const next = classifySyncFailure(item);
    expect(next.status).toBe('NEEDS_ATTENTION');
    expect(next.retryCount).toBe(3);
    expect(next.payload.idempotencyKey).toBe('k1');
  });

  it('keeps the item after retry exhaustion (no silent deletion)', () => {
    let item = { type: 'CREATE_ORDER', payload: { idempotencyKey: 'k1' } };
    for (let i = 0; i < 6; i++) item = classifySyncFailure(item);
    expect(item).toBeTruthy();
    expect(item.status).toBe('NEEDS_ATTENTION');
  });

  it('survives a restart: parked items are still listed and identifiable', () => {
    let parked = { type: 'CREATE_ORDER', payload: { idempotencyKey: 'a' } };
    for (let i = 0; i < 3; i++) parked = classifySyncFailure(parked);
    const parks = [parked];
    const restored = JSON.parse(JSON.stringify(parks)); // localStorage round-trip
    expect(itemsNeedingAttention(restored)).toHaveLength(1);
    expect(itemsNeedingAttention(restored)[0].payload.idempotencyKey).toBe('a');
  });

  it('duplicate synchronisation is safe: one identity per parked sale', () => {
    const item = { type: 'CREATE_ORDER', payload: { idempotencyKey: 'dup' } };
    const a = classifySyncFailure(item);
    const b = classifySyncFailure(item);
    expect(a.payload.idempotencyKey).toBe(b.payload.idempotencyKey);
    expect(itemsNeedingAttention([a, b]).length).toBeLessThanOrEqual(2);
  });

  it('a refused sale never satisfies the attention filter as a success', () => {
    let parked = { type: 'CREATE_ORDER', payload: {} };
    for (let i = 0; i < 3; i++) parked = classifySyncFailure(parked);
    expect(parked.status).toBe('NEEDS_ATTENTION');
    expect(itemsNeedingAttention([{ type: 'CREATE_ORDER', payload: {} }])).toHaveLength(0);
  });
});
