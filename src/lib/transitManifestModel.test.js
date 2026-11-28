import { describe, expect, it } from 'vitest';
import { manifestSummary, passengerName, bookingStatusLabel, manifestTrips, cargoTotals } from './transitManifestModel';

describe('manifestSummary', () => {
  it('reads the backend counts and the fares still held', () => {
    const s = manifestSummary({
      counts: { booked: 4, boarded: 1, waiting: 3, noShow: 0 },
      passengers: [
        { payment: 'HELD', amountUsdc: 12.5 },
        { payment: 'HELD', amountUsdc: '7.5' },
        { payment: 'PAID_OUT', amountUsdc: 10 },
        { payment: 'UNPAID', amountUsdc: 10 },
      ],
    });
    expect(s).toEqual({ booked: 4, boarded: 1, waiting: 3, noShow: 0, progressPct: 25, heldUsdc: 20 });
  });

  it('is all zeros for an empty or missing manifest', () => {
    expect(manifestSummary(null)).toEqual({ booked: 0, boarded: 0, waiting: 0, noShow: 0, progressPct: 0, heldUsdc: 0 });
  });
});

describe('passengerName', () => {
  it('prefers the display name, then username, then the name on the seat', () => {
    expect(passengerName({ passenger: { displayName: 'Ama Owusu', username: 'ama' } })).toBe('Ama Owusu');
    expect(passengerName({ passenger: { username: 'ama' } })).toBe('ama');
    expect(passengerName({ passenger: null, seats: [{ seatId: '1A', passengerName: 'Kofi' }] })).toBe('Kofi');
    expect(passengerName({})).toBe('Passenger');
  });
});

it('labels booking states for staff', () => {
  expect(bookingStatusLabel('CONFIRMED')).toBe('Waiting');
  expect(bookingStatusLabel('IN_PROGRESS')).toBe('Boarded');
  expect(bookingStatusLabel('NO_SHOW')).toBe('No-show');
});

it('lists trips from a day ago onward, soonest first', () => {
  const now = Date.parse('2026-11-28T12:00:00Z');
  const trips = [
    { id: 'late', departureAt: '2026-11-30T08:00:00Z' },
    { id: 'old', departureAt: '2026-11-20T08:00:00Z' },
    { id: 'soon', departureAt: '2026-11-28T15:00:00Z' },
    { id: 'today-early', departureAt: '2026-11-28T06:00:00Z' },
  ];
  expect(manifestTrips(trips, now).map((t) => t.id)).toEqual(['today-early', 'soon', 'late']);
});

it('adds cargo amounts sent as decimal strings', () => {
  expect(cargoTotals([{ weightKg: '2.5', priceUsdc: '3.00' }, { weightKg: 1, priceUsdc: null }])).toEqual({ weightKg: 3.5, revenueUsdc: 3 });
});
