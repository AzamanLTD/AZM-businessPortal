import { describe, it, expect } from 'vitest';
import {
  describeBulkStatusOutcome,
  describeNoShowOutcome,
  describeDeductOutcome,
  describeBulkPriceOutcome,
} from './mutationOutcome';

describe('describeBulkStatusOutcome — the backend counts what actually happened', () => {
  it('reports the confirmed count when every selected order transitioned', () => {
    const out = describeBulkStatusOutcome({ success: true, updated: 4, skipped: 0 }, 4);
    expect(out.confirmed).toBe(true);
    expect(out.message).toBe('Updated 4 orders');
  });

  it('reports partial skips instead of claiming all N updated', () => {
    const out = describeBulkStatusOutcome({ success: true, updated: 2, skipped: 3 }, 5);
    expect(out.confirmed).toBe(true);
    expect(out.message).toBe('Updated 2 of 5 orders; 3 skipped');
    expect(out.description).toContain('unchanged on the server');
  });

  it('is honest when nothing transitioned', () => {
    const out = describeBulkStatusOutcome({ success: true, updated: 0, skipped: 4 }, 4);
    expect(out.confirmed).toBe(true);
    expect(out.message).toContain('No orders changed');
  });

  it('refuses to claim a count when the response shape drifts', () => {
    const out = describeBulkStatusOutcome({ success: true }, 5);
    expect(out.confirmed).toBe(false);
    expect(out.message).toBe('Status update accepted for 5 orders');
    expect(out.description).toContain('verify');
  });
});

describe('describeNoShowOutcome — penalties are the backend decision, never a UI claim', () => {
  it('claims a penalty only when the reservation record says one was charged', () => {
    const out = describeNoShowOutcome({ success: true, reservation: { penaltyChargedAt: '2026-10-08T10:00:00.000Z' } });
    expect(out.message).toContain('Penalty charged');
  });

  it('does not claim penalties when none were charged (most reservations)', () => {
    const out = describeNoShowOutcome({ success: true, reservation: { penaltyChargedAt: null } });
    expect(out.message).toBe('Marked as No-Show.');
    expect(out.message).not.toContain('Penalty');
    expect(out.description).toContain('only when the reservation has one configured');
  });

  it('stays honest when the response carries no reservation payload', () => {
    const out = describeNoShowOutcome({ success: true });
    expect(out.message).toBe('Marked as No-Show.');
  });
});

describe('describeDeductOutcome — the backend deducts exactly once per order', () => {
  it('reports a fresh deduction when it really happened', () => {
    const out = describeDeductOutcome({ success: true, replay: false, deductions: [{ ingredient: 'Rice', deducted: 2 }] });
    expect(out.replayed).toBe(false);
    expect(out.message).toContain('successfully');
  });

  it('reports the replay honestly: stock was already deducted, nothing changed now', () => {
    const out = describeDeductOutcome({ success: true, replay: true, deductions: [{ ingredient: 'Rice', deducted: 2 }] });
    expect(out.replayed).toBe(true);
    expect(out.message).toContain('already deducted');
    expect(out.description).toContain('No stock was changed');
  });
});

describe('describeBulkPriceOutcome — failures are surfaced, not swallowed', () => {
  it('reports full success', () => {
    expect(describeBulkPriceOutcome(10, 0)).toEqual({ tone: 'go', message: 'Successfully adjusted prices for 10 items!' });
  });

  it('reports total failure as an error', () => {
    const out = describeBulkPriceOutcome(0, 8);
    expect(out.tone).toBe('stop');
    expect(out.message).toContain('all 8 items');
  });

  it('reports partial failure with both counts', () => {
    const out = describeBulkPriceOutcome(7, 3);
    expect(out.tone).toBe('neutral');
    expect(out.message).toBe('Adjusted 7 prices; 3 failed');
  });
});
