import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/lib/AuthContext';

// ── Mixed-page honesty contract (table-driven regression suite) ─────────────
// Routes marked MIXED in the admin route classification call both
// admin-capable Business OS endpoints and owner-only legacy endpoints.
// Contract for EVERY owner-only surface below, in admin view (a scoped
// admin operating someone's business):
//   (1) the explicit owner-only REFUSAL is rendered (not merely "the fake
//       empty message is absent"),
//   (2) the refused owner-only request/mutation is NEVER issued, and
//   (3) no misleading empty-success state is shown.
// The server remains the enforcement authority; this is presentation
// honesty only.

const ADMIN_AUTH = { isAdminView: true, isAdmin: true, bizProfile: { id: 'biz-1', businessName: 'Scoped Biz', category: 'RESTAURANT' }, user: { id: 'admin-1', role: 'ADMIN' } };
const OWNER_AUTH = { isAdminView: false, isAdmin: false, bizProfile: { id: 'biz-1', businessName: 'Test Biz', category: 'RESTAURANT' }, user: { id: 'owner-1' } };

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

// ── Observable API mocks: owner-only fns reject (server would 403), and
// every call is recorded so "never issued" is a hard assertion. ─────────────
const { mockRequest, mockCoreRequest, OWNER_ONLY_ERR } = vi.hoisted(() => ({
  mockRequest: vi.fn(async () => ({})),
  mockCoreRequest: vi.fn(async () => ({})),
  OWNER_ONLY_ERR: new Error('403 owner-only'),
}));

vi.mock('@/lib/api', () => ({
  orders: {
    get: vi.fn().mockRejectedValue(OWNER_ONLY_ERR),
    listAll: vi.fn().mockRejectedValue(OWNER_ONLY_ERR),
    list: vi.fn().mockRejectedValue(OWNER_ONLY_ERR),
    stats: vi.fn().mockRejectedValue(OWNER_ONLY_ERR),
  },
  escrow: {},
  products: { list: vi.fn().mockRejectedValue(OWNER_ONLY_ERR) },
  invoices: { list: vi.fn().mockRejectedValue(OWNER_ONLY_ERR) },
  locations: { list: vi.fn().mockRejectedValue(OWNER_ONLY_ERR) },
  reservations: { stats: vi.fn().mockRejectedValue(OWNER_ONLY_ERR) },
  business: { me: vi.fn().mockResolvedValue({ business: { id: 'biz-1', businessName: 'Scoped Biz' } }) },
  request: mockRequest,
}));
vi.mock('@/lib/apiCore', () => ({ request: mockCoreRequest, setAccessToken: vi.fn() }));
vi.mock('@/lib/marketplaceApi', () => ({
  transitApi: { list: vi.fn().mockRejectedValue(OWNER_ONLY_ERR) },
  transit: { list: vi.fn().mockRejectedValue(OWNER_ONLY_ERR) },
  cargoApi: {
    list: vi.fn().mockResolvedValue({ data: { cargo: [] } }),
    create: vi.fn(), updateStatus: vi.fn(),
  },
  hotelOpsApi: {
    getRooms: vi.fn().mockResolvedValue({ rooms: [] }),
    // Front desk reads are admin-viewable; the legacy mutations are not.
    getFrontDesk: vi.fn().mockResolvedValue({ data: { arrivalList: [{ id: 'res-1', customerName: 'Test Guest', amountUsdc: 120 }], inHouseList: [], departureList: [] } }),
    getRoomRack: vi.fn().mockResolvedValue({ data: [] }),
  },
  bookingOpsApi: {
    bookingDashboard: vi.fn().mockResolvedValue({ data: {} }),
    invoiceStats: vi.fn().mockResolvedValue({ data: {} }),
    bulkOrderStatus: vi.fn(),
  },
  restaurantOpsApi: { get86edItems: vi.fn().mockResolvedValue({ data: { items: [] } }) },
  inventoryApi: {
    listItems: vi.fn().mockResolvedValue({ data: { items: [] } }),
  },
  retailApi: {
    lowStock: vi.fn().mockResolvedValue({ data: { items: [] } }),
    listSuppliers: vi.fn().mockResolvedValue({ data: { suppliers: [] } }),
    listPurchaseOrders: vi.fn().mockResolvedValue({ data: { orders: [] } }),
    listStockCounts: vi.fn().mockResolvedValue({ data: { counts: [] } }),
  },
  reservations: {
    checkIn: vi.fn().mockRejectedValue(OWNER_ONLY_ERR),
    checkOut: vi.fn().mockRejectedValue(OWNER_ONLY_ERR),
  },
  request: mockRequest,
  default: {},
}));

const BLUEPRINT = {
  preset: 'MENU_FIRST', navigation: { mode: 'LINEAR', showProgress: true },
  customerContext: { enabled: true, tableNumber: true, serviceMode: true, passenger: false },
  detail: { presentation: 'SHEET', showGallery: true, showSpecifications: true, showOptions: true, showQuantity: true },
  motion: { tempo: 'BALANCED' }, commit: { style: 'PAPER_RIP', persistentTray: true },
};
vi.mock('@/services/storefrontApi', () => ({
  storefrontApi: {
    getExperience: vi.fn().mockResolvedValue({ blueprint: BLUEPRINT, category: 'RESTAURANT', motionTempos: ['CALM', 'BALANCED', 'LIVELY'] }),
    saveExperience: vi.fn(),
    getPublishedLayout: vi.fn().mockResolvedValue({}),
    listThemes: vi.fn().mockResolvedValue([]),
    getPublicTheme: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn() }, ToastHost: () => null }));
vi.mock('@/lib/cloudinary', () => ({
  uploadImageToCloudinary: vi.fn(),
  isCloudinaryConfigured: () => false,
  validateImageFile: () => null,
}));
vi.mock('@/lib/invoicePdf', () => ({ generateInvoicePDF: vi.fn() }));
vi.mock('@/lib/mutationOutcome', () => ({
  describeBulkStatusOutcome: () => 'updated',
  describeNoShowOutcome: () => 'applied',
  describeBulkPriceOutcome: () => 'updated',
}));
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ hasPermission: () => true }) }));
vi.mock('@/hooks/useBizNotifications', () => ({ useBizNotifications: () => ({ data: null }) }));
vi.mock('@/lib/keys', () => ({ useSequence: vi.fn() }));
vi.mock('@/lib/command', () => ({ useCommandPalette: () => ({ open: vi.fn() }) }));
vi.mock('@/components/instrument/ProductTour', () => ({ ProductTour: () => null, shouldShowTour: () => false }));
vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }) => children,
  SectionBoundary: ({ children }) => children,
}));

// ── Page table ──────────────────────────────────────────────────────────────
// Each case asserts: refusal testid rendered, owner-only fn never issued,
// and (where a fake-empty message exists) that it is absent.
const PAGES = [
  {
    name: 'Orders — feed and KPIs',
    importPage: () => import('@/pages/Orders'),
    route: '/orders',
    refusals: ['orders-owner-only-kpis'],
    notCalled: [['@/lib/api', (m) => m.orders.listAll], ['@/lib/api', (m) => m.orders.stats]],
    noFakeEmpty: /No orders/i,
  },
  {
    name: 'Reservations — the reservations feed',
    importPage: () => import('@/pages/Reservations'),
    route: '/reservations',
    refusals: ['reservations-owner-only'],
    notCalled: [['@/lib/api', (m) => m.reservations.stats]],
  },
  {
    name: 'Invoices — the legacy invoice feed',
    importPage: () => import('@/pages/Invoices'),
    route: '/invoices',
    refusals: ['invoices-owner-only'],
    notCalled: [['@/lib/api', (m) => m.invoices.list]],
  },
  {
    name: 'Products — the product catalog',
    importPage: () => import('@/pages/Products'),
    route: '/products',
    refusals: ['products-owner-only'],
    notCalled: [['@/lib/api', (m) => m.products.list], ['@/lib/api', (m) => m.locations.list]],
  },
  {
    name: 'Marketing — ad campaigns',
    importPage: () => import('@/pages/Marketing'),
    route: '/marketing',
    clickTab: /Ads Campaigns/i,
    refusals: ['marketing-owner-only-ads'],
    notCalled: [],
    noFakeEmpty: /No active ad campaigns/i,
  },
  {
    name: 'POS — product catalog for checkout',
    importPage: () => import('@/pages/POS'),
    route: '/pos',
    refusals: ['pos-owner-only-products'],
    notCalled: [['@/lib/api', (m) => m.products.list]],
  },
  {
    name: 'RetailInventory — product catalog',
    importPage: () => import('@/pages/RetailInventory'),
    route: '/retail-inventory',
    refusals: ['retail-owner-only-products'],
    notCalled: [['@/lib/api', (m) => m.products.list]],
  },
  {
    name: 'RestaurantTables — locations and tables',
    importPage: () => import('@/pages/RestaurantTables'),
    route: '/restaurant-tables',
    refusals: ['tables-owner-only'],
    notCalled: [['@/lib/api', (m) => m.locations.list]],
  },
  {
    name: 'TransitTrips — KPIs and the legacy trip feed',
    importPage: () => import('@/pages/TransitTrips'),
    route: '/transit',
    refusals: ['transit-kpis-owner-only', 'transit-trips-owner-only'],
    notCalled: [['@/lib/marketplaceApi', (m) => m.transit.list]],
  },
  {
    name: 'TransitCargo — legacy trip feed for filters',
    importPage: () => import('@/pages/TransitCargo'),
    route: '/transit-cargo',
    refusals: ['transit-cargo-owner-only'],
    notCalled: [['@/lib/marketplaceApi', (m) => m.transit.list]],
  },
  {
    name: 'RestaurantInventory — product catalog for recipes',
    importPage: () => import('@/pages/RestaurantInventory'),
    route: '/restaurant-inventory',
    clickTab: /Recipe Cost Matrices/i,
    refusals: ['restaurant-inventory-owner-only'],
    notCalled: [['@/lib/api', (m) => m.products.list]],
  },
  {
    name: 'WebOrdering — the owner business profile',
    importPage: () => import('@/pages/marketing/WebOrdering'),
    route: '/marketing/web-ordering',
    refusals: ['webordering-owner-only'],
    notCalled: [],
  },
];

describe('Mixed pages: owner-only surfaces refuse honestly in admin view', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it.each(PAGES.map(p => [p.name, p]))('%s: refusal rendered, owner-only request never issued', async (_n, page) => {
    const { default: Page } = await page.importPage();
    renderWith(ADMIN_AUTH, <Page />, { route: page.route });
    if (page.clickTab) {
      const tab = await screen.findByRole('button', { name: page.clickTab });
      fireEvent.click(tab);
    }

    // (1) The explicit refusal IS rendered — a hard requirement, never
    // inferred from "the fake empty state is absent".
    for (const testid of page.refusals) {
      await waitFor(() => expect(screen.getByTestId(testid)).toBeTruthy(), { timeout: 3000 });
    }
    // Give any wrongly-wired query a moment to (not) fire.
    await new Promise(r => setTimeout(r, 120));
    for (const testid of page.refusals) {
      expect(screen.getByTestId(testid).textContent).toMatch(/owner-only/i);
      expect(screen.getByTestId(testid).textContent).toMatch(/server refusal/i);
    }
    // (2) The refused owner-only fn was NEVER issued.
    for (const [mod, pick] of page.notCalled) {
      const m = await import(mod);
      expect(pick(m)).not.toHaveBeenCalled();
    }
    // (3) No misleading empty-success message.
    if (page.noFakeEmpty) {
      expect(screen.queryByText(page.noFakeEmpty)).toBeNull();
    }
  });

  it('OrderDetail renders an explicit refusal instead of "Order Not Found" in admin view', async () => {
    const { default: OrderDetail } = await import('@/pages/OrderDetail');
    const { orders } = await import('@/lib/api');
    renderWith(ADMIN_AUTH, <OrderDetail orderId="ord-1" />, { route: '/orders/ord-1' });
    await waitFor(() => expect(screen.getByTestId('order-detail-owner-only')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByTestId('order-detail-owner-only').textContent).toMatch(/owner-only/i);
    expect(screen.queryByText(/Order Not Found/i)).toBeNull();
    expect(orders.get).not.toHaveBeenCalled();
  });

  it('ExperienceStudio never fires the owner-only preview query in admin view', async () => {
    const { default: ExperienceStudio } = await import('@/pages/ExperienceStudio');
    const { storefrontApi } = await import('@/services/storefrontApi');
    renderWith(ADMIN_AUTH, <ExperienceStudio />, { route: '/storefront/experience' });
    await waitFor(() => expect(screen.getByTestId('experience-owner-only')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByTestId('experience-owner-only').textContent).toMatch(/owner-only/i);
    // The category resolves RESTAURANT → the live preview would fire for an
    // owner; for an admin it must NEVER be issued.
    const { products } = await import('@/lib/api');
    await new Promise(r => setTimeout(r, 150));
    expect(products.list).not.toHaveBeenCalled();
    expect(storefrontApi.getExperience).not.toHaveBeenCalled();
  });

  it('Finance payout tab: refusal REQUIRED (no swallowed timeout), destinations request never issued, no fake empty list', async () => {
    const { default: Finance } = await import('@/pages/Finance');
    renderWith(ADMIN_AUTH, <Finance />, { route: '/finance/payouts' });

    // The refusal is REQUIRED — waitFor failure FAILS the test, it is never
    // swallowed.
    await waitFor(() => expect(screen.getByTestId('payouts-owner-only')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByTestId('payouts-owner-only').textContent).toMatch(/owner-only/i);
    expect(screen.getByTestId('payouts-owner-only').textContent).toMatch(/server refusal/i);

    // The owner-only payout-destinations request is NEVER issued (loading
    // settles immediately instead of firing the guarded fetch).
    await new Promise(r => setTimeout(r, 150));
    const payoutCalls = mockCoreRequest.mock.calls.filter(([url]) => String(url).includes('payout-destinations'));
    expect(payoutCalls).toEqual([]);
    const marketplaceCalls = mockRequest.mock.calls.filter(([url]) => String(url).includes('payout-destinations'));
    expect(marketplaceCalls).toEqual([]);

    // No misleading empty-success state.
    expect(screen.queryByText(/No payout destinations yet/i)).toBeNull();
  });

  it('HotelFrontDesk: legacy check-in mutation refuses honestly and never reaches the owner-only API', async () => {
    const { default: HotelFrontDesk } = await import('@/pages/HotelFrontDesk');
    const { reservations: resApi } = await import('@/lib/marketplaceApi');
    const { toast } = await import('@/lib/toast');
    renderWith(ADMIN_AUTH, <HotelFrontDesk />, { route: '/hotel-front-desk' });

    // Every check-in control on the page must either be absent/disabled or
    // refuse honestly. Firing a checkIn for any rendered control is the
    // observable proof: the guard fires before the API is reached.
    // The arrivals list loads async — wait for the first check-in control.
    await screen.findByText('Check In', {}, { timeout: 3000 });
    const buttons = screen.queryAllByRole('button');
    for (const btn of buttons) {
      if (/check[- ]?in/i.test(btn.textContent) && !btn.disabled) {
        fireEvent.click(btn);
        // If the click reached a confirm flow, confirm it too.
        const confirm = screen.queryAllByRole('button').find(b => /confirm/i.test(b.textContent) && !b.disabled);
        if (confirm) fireEvent.click(confirm);
      }
    }
    await waitFor(() => {
      expect(toast.stop).toHaveBeenCalledWith(expect.stringContaining('owner-only'));
    }, { timeout: 3000 });
    expect(resApi.checkIn).not.toHaveBeenCalled();
    expect(resApi.checkOut).not.toHaveBeenCalled();
  });

  it('contrast: the same surfaces behave normally in owner view (no refusal shown)', async () => {
    const { default: Orders } = await import('@/pages/Orders');
    const { orders } = await import('@/lib/api');
    orders.listAll.mockResolvedValueOnce({ orders: [] });
    orders.stats.mockResolvedValueOnce({ totalOrders: 0 });
    renderWith(OWNER_AUTH, <Orders />, { route: '/orders' });
    // Owner view: no refusal — the owner IS authorized to call the feed.
    await new Promise(r => setTimeout(r, 150));
    expect(screen.queryByTestId('orders-owner-only-kpis')).toBeNull();
    expect(orders.listAll).toHaveBeenCalled();
  });
});
