import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─────────────────────────────────────────────────────────────────────────────
// Stays & check-in (/settings/stays): a hotel's cancellation and no-show terms
// for stays paid in the app, within the limits Azaman sets (AZM-backend
// feat/stay-penalties): GET/PUT /api/reservations/policy/penalties.
// ─────────────────────────────────────────────────────────────────────────────

const state = vi.hoisted(() => ({ puts: [], canEdit: true }));

vi.mock('@/lib/api', () => ({
  request: vi.fn(async (path, opts = {}) => {
    if (opts.method === 'PUT') { state.puts.push([path, JSON.parse(opts.body)]); return { success: true }; }
    if (path === '/api/reservations/policy/penalties') {
      return { success: true, terms: { lateCancelHours: 48, lateCancelBps: 1500, noShowBps: 1000 }, limits: { maxLateCancelBps: 2000, maxNoShowBps: 1000 }, maxLateCancelHours: 168 };
    }
    return { success: true, policy: { allowIdCheck: true } };
  }),
}));
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ hasPermission: () => state.canEdit }) }));
vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn() } }));

const { default: StayTerms, percentToBps, bpsToPercent } = await import('@/pages/settings/StayTerms');

const renderPage = () => render(createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, createElement(StayTerms)));

beforeEach(() => { state.puts = []; state.canEdit = true; });

describe('stay terms', () => {
  it('converts percentages and basis points exactly', () => {
    expect(percentToBps('20')).toBe(2000);
    expect(percentToBps('12.5')).toBe(1250);
    expect(percentToBps('abc')).toBeNull();
    expect(percentToBps('101')).toBeNull();
    expect(bpsToPercent(1250)).toBe('12.50');
    expect(bpsToPercent(2000)).toBe('20');
  });

  it('shows the saved terms and the limits; saving sends basis points', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('15')).toBeTruthy());
    expect(screen.getByText('At most 20%, set by Azaman.')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('15'), { target: { value: '18' } });
    fireEvent.click(screen.getByText('Save terms'));
    await waitFor(() => expect(state.puts).toHaveLength(1));
    expect(state.puts[0]).toEqual(['/api/reservations/policy/penalties', { lateCancelHours: 48, lateCancelBps: 1800, noShowBps: 1000 }]);
  });

  it('a share above the limit cannot be saved', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('10')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '25' } });
    expect(screen.getByText('Save terms').closest('button').disabled).toBe(true);
  });

  it('staff without settings rights read the terms but cannot save', async () => {
    state.canEdit = false;
    renderPage();
    await waitFor(() => expect(screen.getByText('Only the owner or a manager with settings rights can change these.')).toBeTruthy());
    expect(screen.queryByText('Save terms')).toBeNull();
  });
});
