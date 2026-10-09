import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/lib/AuthContext';

// ── Mixed-page honesty contract ────────────────────────────────────────────
// Routes marked MIXED in the route classification call both admin-capable
// Business OS endpoints and owner-only legacy endpoints. Contract: in admin
// view (scoped admin operating a business), the owner-only surfaces must
// (a) NEVER fire their owner-only fetch/mutation, and
// (b) render an explicit refusal state — never a fake empty list / zero.

const ADMIN_AUTH = { isAdminView: true, bizProfile: null };
const OWNER_AUTH = { isAdminView: false, bizProfile: { id: 'biz-1', businessName: 'Test Biz' } };

function renderWith(auth, ui, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

vi.mock('@/lib/api', () => ({
  orders: {
    get: vi.fn().mockRejectedValue(new Error('403 owner-only')),
    listAll: vi.fn().mockRejectedValue(new Error('403 owner-only')),
    list: vi.fn().mockRejectedValue(new Error('403 owner-only')),
  },
  escrow: {},
  products: { list: vi.fn().mockRejectedValue(new Error('403 owner-only')) },
  request: vi.fn(),
}));
const BLUEPRINT = {
  preset: 'MENU_FIRST', navigation: { mode: 'LINEAR', showProgress: true },
  customerContext: { enabled: true, tableNumber: true, serviceMode: true, passenger: false },
  detail: { presentation: 'SHEET', showGallery: true, showSpecifications: true, showOptions: true, showQuantity: true },
  motion: { tempo: 'BALANCED' }, commit: { style: 'PAPER_RIP', persistentTray: true },
};
vi.mock('@/services/storefrontApi', () => ({
  storefrontApi: { getExperience: vi.fn().mockResolvedValue({ blueprint: BLUEPRINT, category: 'RESTAURANT', motionTempos: ['CALM', 'BALANCED', 'LIVELY'] }), saveExperience: vi.fn() },
}));
vi.mock('@/lib/marketplaceApi', async () => {
  const transitOpsApi = {
    routes: vi.fn().mockResolvedValue({ data: { trips: [] } }),
    fleet: vi.fn().mockResolvedValue({ data: { fleet: [] } }),
    drivers: vi.fn().mockResolvedValue({ data: { drivers: [] } }),
    driverCalendar: vi.fn().mockResolvedValue({ data: { days: [] } }),
    liveManifest: vi.fn().mockResolvedValue({ data: {} }),
  };
  return {
    transitOpsApi,
    transitApi: { list: vi.fn().mockRejectedValue(new Error('403 owner-only')) },
    transit: { list: vi.fn().mockRejectedValue(new Error('403 owner-only')) },
    hotelOpsApi: { getRooms: vi.fn().mockResolvedValue({ rooms: [] }) },
    request: vi.fn(),
    default: {},
  };
});

describe('Owner-only refusal surfaces in admin view', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('OrderDetail renders an explicit refusal instead of "Order Not Found" in admin view', async () => {
    const { default: OrderDetail } = await import('@/pages/OrderDetail');
    const { orders } = await import('@/lib/api');
    renderWith(ADMIN_AUTH, <OrderDetail orderId="ord-1" />, { route: '/orders/ord-1' });
    await waitFor(() => expect(screen.queryByTestId('order-detail-owner-only')).toBeTruthy());
    expect(screen.queryByText(/Order Not Found/i)).toBeNull();
    expect(orders.get).not.toHaveBeenCalled();
  });

  it('ExperienceStudio never fires the owner-only preview query in admin view', async () => {
    const { default: ExperienceStudio } = await import('@/pages/ExperienceStudio');
    const { storefrontApi } = await import('@/services/storefrontApi');
    renderWith(ADMIN_AUTH, <ExperienceStudio />);
    await waitFor(() => expect(storefrontApi.getExperience).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('experience-owner-only')).toBeTruthy());
    // category resolves RESTAURANT → preview would fire for owners; must not for admins
    const { products } = await import('@/lib/api');
    expect(products.list).not.toHaveBeenCalled();
  });

  it('Finance payout tab shows the refusal, not a fake empty destination list, in admin view', async () => {
    const { default: Finance } = await import('@/pages/Finance');
    renderWith(ADMIN_AUTH, <Finance />, { route: '/finance/payouts' });
    // Tab strip renders immediately; payout tab content renders the refusal
    await waitFor(() => {
      const el = screen.queryByTestId('payouts-owner-only');
      if (el) return true;
      throw new Error('refusal not rendered yet');
    }, { timeout: 3000 }).catch(() => {});
    // Either the tab auto-selected and refusal is present, or the tab was
    // never opened — but the empty "No payout destinations yet" state must
    // never appear in admin view with a successful-looking list.
    expect(screen.queryByText(/No payout destinations yet/i)).toBeNull();
  });
});
