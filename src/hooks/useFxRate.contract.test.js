import { describe, expect, it } from 'vitest';
import { unwrapRatePayload } from './useFxRate';

describe('unwrapRatePayload', () => {
  it('prefers the canonical liveRetailRate and preserves the explicit rail semantics', () => {
    const result = unwrapRatePayload({
      success: true,
      data: {
        pair: 'USDC/GHS',
        settlementCurrency: 'USDC',
        displayCurrency: 'GHS',
        liveRetailRate: 13.42,
        liveUsdToGhs: 13.10,
        rateSource: 'KOTANI_PAY',
        refreshIntervalSeconds: 600,
        lastSync: '2026-09-04T11:30:00.000Z',
      },
    });

    expect(result).toMatchObject({
      pair: 'USDC/GHS',
      settlementCurrency: 'USDC',
      displayCurrency: 'GHS',
      ghsPerUsdc: 13.42,
      source: 'KOTANI_PAY',
      refreshSeconds: 600,
    });
    expect(result.lastSync).toEqual(new Date('2026-09-04T11:30:00.000Z'));
  });

  it('uses the contract default refresh cadence when older payloads omit it', () => {
    expect(unwrapRatePayload({
      data: {
        liveRetailRate: 12.9,
      },
    })).toMatchObject({
      pair: 'USDC/GHS',
      settlementCurrency: 'USDC',
      displayCurrency: 'GHS',
      ghsPerUsdc: 12.9,
      refreshSeconds: 600,
    });
  });

  it('retains the legacy USD/GHS field only as a compatibility rate fallback', () => {
    expect(unwrapRatePayload({
      data: {
        liveUsdToGhs: 12.75,
      },
    }).ghsPerUsdc).toBe(12.75);
  });

  it('rejects non-positive rates instead of manufacturing a GHS equivalent', () => {
    expect(unwrapRatePayload({
      data: {
        pair: 'USDC/GHS',
        settlementCurrency: 'USDC',
        displayCurrency: 'GHS',
        liveRetailRate: 0,
      },
    }).ghsPerUsdc).toBe(0);
  });
});
