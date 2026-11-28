// src/lib/transitManifestModel.js
// What the Live Manifests page shows, from the backend's transit manifest
// (GET /api/business-os/transit/manifests/:tripId → transitBoardingService
// buildTripManifest): { trip, policy, boardingWindow, counts, passengers, seats }.
// Pure functions, so the numbers are tested apart from the page.

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** The headline numbers for a manifest. */
export function manifestSummary(manifest) {
  const counts = (manifest && manifest.counts) || {};
  const booked = num(counts.booked);
  const boarded = num(counts.boarded);
  const passengers = (manifest && Array.isArray(manifest.passengers)) ? manifest.passengers : [];
  // Fares paid in Azaman and still held until the trip is done.
  const heldUsdc = passengers
    .filter((p) => p.payment === 'HELD')
    .reduce((sum, p) => sum + num(p.amountUsdc), 0);
  return {
    booked,
    boarded,
    waiting: num(counts.waiting),
    noShow: num(counts.noShow),
    progressPct: booked > 0 ? Math.round((boarded / booked) * 100) : 0,
    heldUsdc,
  };
}

/** A passenger's name for the list: display name, then username, then the seat name. */
export function passengerName(p) {
  const card = (p && p.passenger) || {};
  const seatName = p && Array.isArray(p.seats) ? (p.seats.find((s) => s.passengerName) || {}).passengerName : null;
  return card.displayName || card.username || seatName || 'Passenger';
}

const STATUS_LABEL = {
  CONFIRMED: 'Waiting',
  IN_PROGRESS: 'Boarded',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
};
export const bookingStatusLabel = (status) => STATUS_LABEL[status] || status || '—';

/**
 * Trips worth a manifest: departing from a day ago onward, soonest first.
 * The trips endpoint returns the latest 100, newest first.
 */
export function manifestTrips(trips, now = Date.now()) {
  const list = Array.isArray(trips) ? trips : [];
  const from = now - 24 * 3600 * 1000;
  return list
    .filter((t) => t && t.departureAt && new Date(t.departureAt).getTime() >= from)
    .sort((a, b) => new Date(a.departureAt) - new Date(b.departureAt));
}

/** Cargo amounts arrive as decimal strings. */
export function cargoTotals(parcels) {
  const list = Array.isArray(parcels) ? parcels : [];
  return {
    weightKg: list.reduce((s, p) => s + num(p.weightKg), 0),
    revenueUsdc: list.reduce((s, p) => s + num(p.priceUsdc), 0),
  };
}

export const toNumber = num;
