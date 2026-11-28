import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─────────────────────────────────────────────────────────────────────────────
// Check-in page: the AZM-ID search and the ID check for paid stays.
//
// Backend: GET /api/marketplace/checkin/search answers
// { customer: { username, azamanId, profilePictureUrl }, reservations:
// [{ id, reservationRef, startDatetime, status, paid }], idCheckAllowed }.
// The page read customerName / azamanId at the top level (always "Unknown")
// and offered a plain check-in for paid stays, which the server refuses.
// POST /api/reservations/:id/checkin-by-id { azamanId } checks a paid stay in
// by ID; the payment stays held until the guest confirms.
// ─────────────────────────────────────────────────────────────────────────────

const api = vi.hoisted(() => ({ calls: [], search: null }));

vi.mock('@/lib/marketplaceApi', () => ({
  checkIn: {
    todayStats: vi.fn(async () => ({ stats: {} })),
    recentCheckIns: vi.fn(async () => ({ checkIns: [] })),
    verifyToken: vi.fn(),
    searchByAzamanId: vi.fn(async (id) => { api.calls.push(['search', id]); return api.search; }),
    directCheckIn: vi.fn(async (id) => { api.calls.push(['direct', id]); return { reservation: { reservationRef: 'RES-2' } }; }),
    byIdCheck: vi.fn(async (id, azm) => { api.calls.push(['byId', id, azm]); return { reservation: { reservationRef: 'RES-1' }, paymentHeld: true }; }),
  },
}));
vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn(), neutral: vi.fn() } }));

const { default: CheckIn, searchView } = await import('@/pages/CheckIn');

const SEARCH = {
  customer: { id: 10, username: 'ama', azamanId: 'AZM-000000010', profilePictureUrl: 'https://cdn.example/ama.jpg' },
  reservations: [
    { id: 'r-paid', reservationRef: 'RES-1', startDatetime: '2026-12-01T12:00:00Z', status: 'CONFIRMED', paid: true },
    { id: 'r-cash', reservationRef: 'RES-2', startDatetime: '2026-12-02T12:00:00Z', status: 'CONFIRMED', paid: false },
  ],
  idCheckAllowed: true,
};

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: qc }, createElement(CheckIn)));
};

const searchFor = async (id) => {
  fireEvent.click(screen.getByText('AZM-ID'));
  fireEvent.change(screen.getByPlaceholderText('e.g. AZM-1234...'), { target: { value: id } });
  fireEvent.click(screen.getByText('Search Customer'));
  await waitFor(() => expect(screen.getByText('Guest found')).toBeTruthy());
};

beforeEach(() => { api.calls = []; api.search = SEARCH; });

describe('check-in search', () => {
  it('maps the real answer: name, AZM-ID, photo, references and paid stays', () => {
    const v = searchView(SEARCH);
    expect(v).toMatchObject({ name: 'ama', azamanId: 'AZM-000000010', photoUrl: 'https://cdn.example/ama.jpg', idCheckAllowed: true });
    expect(v.reservations.map((r) => [r.ref, r.paid])).toEqual([['RES-1', true], ['RES-2', false]]);
  });

  it('shows the guest, a plain check-in for an unpaid stay and an ID check for a paid one', async () => {
    renderPage();
    await searchFor('AZM-000000010');
    expect(screen.getByText('ama')).toBeTruthy();
    expect(screen.queryByText('Unknown')).toBeNull();
    expect(screen.getByText('Check in by ID')).toBeTruthy();
    fireEvent.click(screen.getByText('Check in'));
    await waitFor(() => expect(api.calls).toContainEqual(['direct', 'r-cash']));
  });

  it('the ID check needs the staff member to confirm the match, then sends the AZM-ID', async () => {
    renderPage();
    await searchFor('AZM-000000010');
    fireEvent.click(screen.getByText('Check in by ID'));
    const confirm = screen.getByRole('button', { name: /^Check in$/ });
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("I checked the guest's photo ID and it matches."));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(api.calls).toContainEqual(['byId', 'r-paid', 'AZM-000000010']));
    await waitFor(() => expect(screen.getByText(/payment is held until the guest confirms/)).toBeTruthy());
  });

  it('a business that turned ID checks off sends paid stays to the QR', async () => {
    api.search = { ...SEARCH, idCheckAllowed: false };
    renderPage();
    await searchFor('AZM-000000010');
    expect(screen.queryByText('Check in by ID')).toBeNull();
    expect(screen.getByText("Scan the guest's QR in their app to check in.")).toBeTruthy();
  });
});
