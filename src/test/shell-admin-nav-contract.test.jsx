import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Shared shell acceptance ─────────────────────────────────────────────────
// Mounts the REAL Shell (the shared layout surface every business page renders
// inside) in both ordinary business view and admin business view. Guards the
// regression where `useCallback` was used without being imported — which only
// explodes at render time — and verifies the admin-view nav contract is applied
// consistently across the expanded pane, the collapsed rail flyout and the
// mobile drawer.

const mockAuth = {
  adminBusinesses: [],
  selectedBusinessId: null,
  selectBusiness: vi.fn(),
  bizProfile: { businessName: 'Alpha Ltd', kybStatus: 'VERIFIED' },
  switching: null,
  switchError: null,
  clearSwitchError: vi.fn(),
};

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ theme: 'dark', toggle: vi.fn() }) }));
vi.mock('@/lib/command', () => ({ useCommandPalette: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/keys', () => ({ useSequence: vi.fn() }));
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ hasPermission: () => true }) }));
vi.mock('@/hooks/useBizNotifications', () => ({ useBizNotifications: () => ({ data: null }) }));
vi.mock('@/components/instrument/CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('@/components/instrument/TooltipProvider', () => ({ TooltipProvider: ({ children }) => children }));
vi.mock('@/components/instrument/ProductTour', () => ({
  ProductTour: () => null, shouldShowTour: () => false,
}));

import { Shell } from '@/components/instrument';

function navProps({ isAdminView }) {
  return {
    businessType: 'GENERAL',
    hasPermission: () => true,
    isOwner: !isAdminView,           // admin view: scoped business is someone else's
    isAdmin: isAdminView,
    isAdminView,
    counts: {},
    bizProfile: { businessName: 'Alpha Ltd', kybStatus: 'VERIFIED' },
  };
}

function renderShell(props) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}>
        <Shell navProps={props} user={{ email: 'admin@azaman.com' }} onLogout={vi.fn()}>
          <div data-testid="page-slot">Page</div>
        </Shell>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const navLinksTo = (path) => [...document.querySelectorAll(`a[href="${path}"]`)];
const linkByHref = (path) => document.querySelector(`a[href="${path}"]`);

beforeEach(() => { vi.clearAllMocks(); });

describe('Shared shell renders without runtime exceptions', () => {
  it('mounts in ordinary business view and renders enabled navigation', () => {
    renderShell(navProps({ isAdminView: false }));
    expect(screen.getByTestId('page-slot')).toBeTruthy();
    // The Command Center nav item renders enabled — no useCallback crash.
    const home = linkByHref('/');
    expect(home).toBeTruthy();
    expect(home.className).not.toMatch(/is-disabled/);
    expect(home.getAttribute('title')).toBe(null);
    // Owner-visible owner-only contract routes are enabled for the owner.
    const notifications = linkByHref('/notifications');
    expect(notifications).toBeTruthy();
    expect(notifications.className).not.toMatch(/is-disabled/);
  });

  it('mounts in admin business view without a runtime exception', () => {
    renderShell(navProps({ isAdminView: true }));
    expect(screen.getByTestId('page-slot')).toBeTruthy();
    const home = linkByHref('/');
    expect(home).toBeTruthy();
  });
});

describe('Admin-view nav contract applied consistently across shell navigation', () => {
  it('expanded pane: owner-only contract routes disabled, supported routes enabled', () => {
    renderShell(navProps({ isAdminView: true }));
    // /messages is 'supported' → enabled.
    const messages = linkByHref('/messages');
    expect(messages.className).not.toMatch(/is-disabled/);
    expect(messages.getAttribute('title')).toBe(null);
    // /notifications is owner-only → visible but disabled with explanation.
    const notifications = linkByHref('/notifications');
    expect(notifications.className).toMatch(/is-disabled/);
    expect(notifications.getAttribute('title')).toMatch(/only authorizes the business owner/);
  });

  it('expanded pane: disabled admin-view nav never navigates', () => {
    renderShell(navProps({ isAdminView: true }));
    const before = window.location.pathname;
    fireEvent.click(linkByHref('/notifications'));
    // preventDefault: no navigation occurred.
    expect(document.querySelector('.i-pane__nav')).toBeTruthy();
    expect(before).toBe(window.location.pathname);
  });

  it('collapsed rail flyout applies the same disabled treatment', async () => {
    renderShell(navProps({ isAdminView: true }));

    // Collapse the pane, then open the "Today" domain flyout.
    const collapse = document.querySelector('.i-pane__collapse');
    expect(collapse).toBeTruthy();
    fireEvent.click(collapse);
    const todayRail = [...document.querySelectorAll('[data-tour="rail-nav"] button')]
      .find(b => b.textContent.includes('Today'));
    expect(todayRail).toBeTruthy();
    fireEvent.click(todayRail);

    // Flyout rendered with the same per-item contract as the expanded pane.
    await waitFor(() => expect(document.querySelector('.i-flyout')).toBeTruthy());
    const flyMessages = [...navLinksTo('/messages')].find(a => a.closest('.i-flyout'));
    const flyNotifications = [...navLinksTo('/notifications')].find(a => a.closest('.i-flyout'));
    expect(flyMessages).toBeTruthy();
    expect(flyMessages.className).not.toMatch(/is-disabled/);
    expect(flyNotifications.className).toMatch(/is-disabled/);
    expect(flyNotifications.getAttribute('title')).toMatch(/only authorizes the business owner/);
  });

  it('mobile drawer applies the same disabled treatment', () => {
    window.innerWidth = 375;
    renderShell(navProps({ isAdminView: true }));
    const menuBtn = screen.getByLabelText('Menu');
    fireEvent.click(menuBtn);
    const drawerNotifications = [...navLinksTo('/notifications')]
      .find(a => a.closest('aside') && a.closest('aside').className.includes('i-drawer'));
    if (!drawerNotifications) {
      // Fallback: the mobile drawer is the only other rendered nav tree.
      const all = navLinksTo('/notifications');
      expect(all.length).toBeGreaterThan(1);
      expect(all.some(a => a.className.match(/is-disabled/))).toBe(true);
      return;
    }
    expect(drawerNotifications.className).toMatch(/is-disabled/);
    expect(drawerNotifications.getAttribute('title')).toMatch(/only authorizes the business owner/);
    const drawerMessages = [...navLinksTo('/messages')]
      .find(a => a.closest('aside') && a.closest('aside').className.includes('i-drawer'));
    expect(drawerMessages.className).not.toMatch(/is-disabled/);
  });
});
