import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Showcase page (/showcase).
//
// Backend (AZM-backend#414): GET /api/showcases/:businessProfileId answers
// { success, items }; changes need marketing.publish, showcase.manage or
// storefront.manage. The page used to store the whole response as the slide
// list, seed invented "curated items" and "highlights" that were never saved,
// and show canned phone screens as "how customers see your storefront".
// ─────────────────────────────────────────────────────────────────────────────

const state = { perms: [], calls: [] };

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (key) => [].concat(key).some((k) => state.perms.includes('*') || state.perms.includes(k)),
  }),
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ bizProfile: { id: 'bp-1', businessName: 'Osu Suites' } }) }));
vi.mock('@/lib/api', () => ({
  request: vi.fn(async (path) => {
    state.calls.push(path);
    if (path === '/api/showcases/bp-1') {
      return { success: true, items: [
        { id: 's1', mediaUrl: 'https://cdn.example/lobby.jpg', caption: 'The lobby', displayOrder: 0 },
        { id: 's2', mediaUrl: 'https://cdn.example/pool.jpg', caption: null, displayOrder: 1 },
      ] };
    }
    return { success: true, versions: [] };
  }),
}));
vi.mock('@/lib/cloudinary', () => ({ uploadImageToCloudinary: vi.fn() }));
vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn(), neutral: vi.fn() } }));

const { default: Showcase } = await import('@/pages/Showcase');

beforeEach(() => { state.calls = []; });

describe('Showcase page', () => {
  it('lists the saved slides from { items } and invents nothing', async () => {
    state.perms = ['showcase.manage'];
    render(createElement(Showcase));
    await waitFor(() => expect(screen.getByText('Slide 2')).toBeTruthy());
    expect(screen.getByText('Slide 1')).toBeTruthy();
    expect(screen.queryByText(/VIP Oceanside Suite/)).toBeNull();
    expect(screen.queryByText(/Michelin/)).toBeNull();
    expect(screen.queryByText(/Curated/i)).toBeNull();
    // The preview shows the real first slide.
    expect(screen.getAllByAltText('The lobby').length).toBeGreaterThan(0);
  });

  it('opens for showcase.manage alone, and shows editing controls', async () => {
    state.perms = ['showcase.manage'];
    render(createElement(Showcase));
    await waitFor(() => expect(screen.getByText('Slide 1')).toBeTruthy());
    expect(screen.getByText('Publish Version')).toBeTruthy();
  });

  it('marketing.view alone reads the slides without editing controls', async () => {
    state.perms = ['marketing.view'];
    render(createElement(Showcase));
    await waitFor(() => expect(screen.getByText('Slide 1')).toBeTruthy());
    expect(screen.queryByText('Publish Version')).toBeNull();
  });

  it('without any showcase right, nothing is fetched', async () => {
    state.perms = ['orders.view'];
    render(createElement(Showcase));
    expect(screen.getByText('Access Denied')).toBeTruthy();
    expect(state.calls).toEqual([]);
  });
});
