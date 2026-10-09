import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PermissionGate } from '@/components/PermissionGate';
import { lazy, Suspense } from 'react';

// Route-level access mirrors of the backend contract (current AZM-backend
// main). Keys are exactly what requirePermission() enforces on each surface;
// ownerOnly marks surfaces the backend scopes by business ownership
// (controllers resolve the business via _ownedProfile). The gate renders a
// clear refusal on direct URL access; unknown permission state renders the
// page (the server still refuses every mutation it must).
export const ROUTE_GATES = [
  { path: '/finance',             permission: 'finance.view' },
  { path: '/orders',              ownerOnly: true },
  { path: '/products',            ownerOnly: true },
  { path: '/reservations',        ownerOnly: true },
  { path: '/invoices',           ownerOnly: true },
  { path: '/locations',          ownerOnly: true },
  { path: '/checkin',            ownerOnly: true },
  { path: '/kyb',                ownerOnly: true },
  { path: '/employees',          permission: 'employees.view' },
  { path: '/scheduling',        permission: 'shifts.view' },
  { path: '/payroll',            permission: 'payroll.view' },
  { path: '/time-off',           permission: 'shifts.view' },
  { path: '/pos',                permission: 'orders.manage' },
  { path: '/dine-in',            permission: 'restaurant.dinein.manage' },
  { path: '/guests',            permission: 'restaurant.dinein.manage' },
  { path: '/restaurant-tables',   permission: 'restaurant.tables.manage' },
  { path: '/restaurant-kitchen',  permission: 'restaurant.kitchen.view' },
  { path: '/restaurant-inventory', permission: 'restaurant.inventory.view' },
  { path: '/retail-inventory',    permission: 'retail.view' },
  { path: '/hotel-rooms',         permission: 'hotel.rooms.view' },
  { path: '/hotel-housekeeping',  permission: 'hotel.housekeeping.manage' },
  { path: '/hotel-front-desk',    permission: 'hotel.front_desk.manage' },
  { path: '/transit',             permission: 'transit.trips.view' },
  { path: '/transit-fleet',       permission: 'transit.fleet.view' },
  { path: '/transit-drivers',     permission: 'transit.drivers.manage' },
  { path: '/transit-manifests',   permission: 'transit.manifests.view' },
  { path: '/transit-cargo',       permission: 'transit.cargo.view' },
  { path: '/marketing',           permission: 'marketing.view' },
  { path: '/showcase',           permission: 'marketing.view' },
  { path: '/reviews',            ownerOnly: true },
  { path: '/analytics',          permission: 'analytics.view' },
  { path: '/storefront',          ownerOnly: true },
  // Settings surfaces: messaging-config mutations require settings.manage
  // (businessOSRoutes); the developer screen is mock-only until the backend
  // security fix lands, so it mirrors the same settings contract as UX.
  { path: '/settings/messaging',  permission: 'settings.manage' },
  { path: '/settings/developer',  permission: 'settings.manage' },
];

export function gateFor(path) {
  // Longest-prefix match so nested routes (/finance/payouts, /orders/:id,
  // /storefront/experience) inherit their parent's backend contract.
  const exact = ROUTE_GATES.find(g => path === g.path || path.startsWith(g.path + '/') || path.startsWith(g.path + '?'));
  return exact || null;
}

function GatedRoute({ route, gate, children }) {
  if (!gate) return children;
  return (
    <PermissionGate permission={gate.permission} ownerOnly={gate.ownerOnly} area={route}>
      {children}
    </PermissionGate>
  );
}

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Orders = lazy(() => import('@/pages/Orders'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const Products = lazy(() => import('@/pages/Products'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const Locations = lazy(() => import('@/pages/Locations'));
const KYB = lazy(() => import('@/pages/KYB'));
const Settings = lazy(() => import('@/pages/Settings'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const TransitTrips = lazy(() => import('@/pages/TransitTrips'));
const Reservations = lazy(() => import('@/pages/Reservations'));
const CheckIn = lazy(() => import('@/pages/CheckIn'));
const Reviews = lazy(() => import('@/pages/Reviews'));
const DineIn = lazy(() => import('@/pages/DineInV2'));
const Guests = lazy(() => import('@/pages/Guests'));
const Marketing = lazy(() => import('@/pages/Marketing'));
const FinanceV2 = lazy(() => import('@/pages/FinanceV2'));
const Showcase = lazy(() => import('@/pages/Showcase'));
const Employees = lazy(() => import('@/pages/employees/Employees'));
const Scheduling = lazy(() => import('@/pages/employees/Scheduling'));
const Payroll = lazy(() => import('@/pages/employees/Payroll'));
const TimeOff = lazy(() => import('@/pages/employees/TimeOff'));
const HotelRooms = lazy(() => import('@/pages/HotelRooms'));
const HotelHousekeeping = lazy(() => import('@/pages/HotelHousekeeping'));
const HotelFrontDesk = lazy(() => import('@/pages/HotelFrontDesk'));
const RestaurantKitchen = lazy(() => import('@/pages/RestaurantKitchen'));
const RestaurantTables = lazy(() => import('@/pages/RestaurantTables'));
const TransitFleet = lazy(() => import('@/pages/TransitFleet'));
const TransitDrivers = lazy(() => import('@/pages/TransitDrivers'));
const TransitManifests = lazy(() => import('@/pages/TransitManifests'));
const TransitCargo = lazy(() => import('@/pages/TransitCargo'));
const RestaurantInventory = lazy(() => import('@/pages/RestaurantInventory'));
const RetailInventory = lazy(() => import('@/pages/RetailInventory'));
const Messages = lazy(() => import('@/pages/Messages'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Developer = lazy(() => import('@/pages/settings/Developer'));
const BusinessGroups = lazy(() => import('@/pages/BusinessGroups'));
const MessagingChannels = lazy(() => import('@/pages/settings/MessagingChannels'));
const WebOrdering = lazy(() => import('@/pages/marketing/WebOrdering'));
const StorefrontEditor = lazy(() => import('@/pages/StorefrontEditor'));
const StorefrontAnalytics = lazy(() => import('@/pages/StorefrontAnalytics'));
const ExperienceStudio = lazy(() => import('@/pages/ExperienceStudio'));
const POS = lazy(() => import('@/pages/POS'));

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ToastHost } from '@/lib/toast';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ErrorBoundary, { SectionBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/instrument';
import { AppBackground } from '@/components/AppBackground';
import { TypeGuardedRoute } from './components/TypeGuardedRoute';

export function AppRoutes() {
  const { authed, loading, bizProfile, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 rounded-full animate-spin"
               style={{ borderColor: 'var(--line)', borderTopColor: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}><div className="animate-pulse text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div></div>}>
      <Routes>
        <Route path="/login" element={<GatedRoute route="/login" gate={gateFor("/login")}>{<Login />}</GatedRoute>} />
        <Route path="*" element={<GatedRoute route="*" gate={gateFor("*")}>{<Navigate to="/login" replace />}</GatedRoute>} />
      </Routes>
      </Suspense>
    );
  }

  if (!isAdmin && !bizProfile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}><div className="animate-pulse text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div></div>}>
      <Routes>
        <Route path="/onboarding" element={<GatedRoute route="/onboarding" gate={gateFor("/onboarding")}>{<Onboarding />}</GatedRoute>} />
        <Route path="*" element={<GatedRoute route="*" gate={gateFor("*")}>{<Navigate to="/onboarding" replace />}</GatedRoute>} />
      </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}><div className="animate-pulse text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div></div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<GatedRoute route="/" gate={gateFor("/")}>{<Dashboard />}</GatedRoute>} />
        <Route path="/orders" element={<GatedRoute route="/orders" gate={gateFor("/orders")}>{<Orders />}</GatedRoute>} />
        <Route path="/orders/:id" element={<GatedRoute route="/orders/:id" gate={gateFor("/orders/:id")}>{<OrderDetail />}</GatedRoute>} />
        <Route path="/products" element={<GatedRoute route="/products" gate={gateFor("/products")}>{<Products />}</GatedRoute>} />
        <Route path="/invoices" element={<GatedRoute route="/invoices" gate={gateFor("/invoices")}>{<Invoices />}</GatedRoute>} />
        <Route path="/locations" element={<GatedRoute route="/locations" gate={gateFor("/locations")}>{<Locations />}</GatedRoute>} />
        <Route path="/kyb" element={<GatedRoute route="/kyb" gate={gateFor("/kyb")}>{<KYB />}</GatedRoute>} />
        <Route path="/notifications" element={<GatedRoute route="/notifications" gate={gateFor("/notifications")}>{<Notifications />}</GatedRoute>} />
        <Route path="/messages" element={<GatedRoute route="/messages" gate={gateFor("/messages")}>{<Messages />}</GatedRoute>} />
        <Route path="/settings" element={<GatedRoute route="/settings" gate={gateFor("/settings")}>{<Settings />}</GatedRoute>} />
        <Route path="/transit" element={<GatedRoute route="/transit" gate={gateFor("/transit")}>{<TypeGuardedRoute types={['TRANSIT']}>{<TransitTrips />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/reservations" element={<GatedRoute route="/reservations" gate={gateFor("/reservations")}>{<Reservations />}</GatedRoute>} />
        <Route path="/checkin" element={<GatedRoute route="/checkin" gate={gateFor("/checkin")}>{<CheckIn />}</GatedRoute>} />
        <Route path="/reviews" element={<GatedRoute route="/reviews" gate={gateFor("/reviews")}>{<Reviews />}</GatedRoute>} />
        <Route path="/dine-in" element={<GatedRoute route="/dine-in" gate={gateFor("/dine-in")}>{<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<DineIn />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/guests" element={<GatedRoute route="/guests" gate={gateFor("/guests")}>{<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<Guests />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/marketing" element={<GatedRoute route="/marketing" gate={gateFor("/marketing")}>{<Marketing />}</GatedRoute>} />
        <Route path="/finance" element={<GatedRoute route="/finance" gate={gateFor("/finance")}>{<FinanceV2 />}</GatedRoute>} />
        <Route path="/finance/pnl" element={<GatedRoute route="/finance/pnl" gate={gateFor("/finance/pnl")}>{<FinanceV2 />}</GatedRoute>} />
        <Route path="/finance/expenses" element={<GatedRoute route="/finance/expenses" gate={gateFor("/finance/expenses")}>{<FinanceV2 />}</GatedRoute>} />
        <Route path="/finance/payouts" element={<GatedRoute route="/finance/payouts" gate={gateFor("/finance/payouts")}>{<FinanceV2 />}</GatedRoute>} />
        <Route path="/finance/disputes" element={<GatedRoute route="/finance/disputes" gate={gateFor("/finance/disputes")}>{<FinanceV2 />}</GatedRoute>} />
        <Route path="/seat-map" element={<GatedRoute route="/seat-map" gate={gateFor("/seat-map")}>{<Navigate to="/transit" replace />}</GatedRoute>} />
        <Route path="/showcase" element={<GatedRoute route="/showcase" gate={gateFor("/showcase")}>{<Showcase />}</GatedRoute>} />
        <Route path="/employees" element={<GatedRoute route="/employees" gate={gateFor("/employees")}>{<Employees />}</GatedRoute>} />
        <Route path="/scheduling" element={<GatedRoute route="/scheduling" gate={gateFor("/scheduling")}>{<Scheduling />}</GatedRoute>} />
        <Route path="/payroll" element={<GatedRoute route="/payroll" gate={gateFor("/payroll")}>{<Payroll />}</GatedRoute>} />
        <Route path="/time-off" element={<GatedRoute route="/time-off" gate={gateFor("/time-off")}>{<TimeOff />}</GatedRoute>} />
        <Route path="/hotel-rooms" element={<GatedRoute route="/hotel-rooms" gate={gateFor("/hotel-rooms")}>{<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<HotelRooms />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/hotel-housekeeping" element={<GatedRoute route="/hotel-housekeeping" gate={gateFor("/hotel-housekeeping")}>{<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<HotelHousekeeping />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/hotel-front-desk" element={<GatedRoute route="/hotel-front-desk" gate={gateFor("/hotel-front-desk")}>{<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<HotelFrontDesk />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/restaurant-kitchen" element={<GatedRoute route="/restaurant-kitchen" gate={gateFor("/restaurant-kitchen")}>{<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<RestaurantKitchen />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/restaurant-tables" element={<GatedRoute route="/restaurant-tables" gate={gateFor("/restaurant-tables")}>{<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<RestaurantTables />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/transit-fleet" element={<GatedRoute route="/transit-fleet" gate={gateFor("/transit-fleet")}>{<TypeGuardedRoute types={['TRANSIT']}>{<TransitFleet />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/transit-drivers" element={<GatedRoute route="/transit-drivers" gate={gateFor("/transit-drivers")}>{<TypeGuardedRoute types={['TRANSIT']}>{<TransitDrivers />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/transit-manifests" element={<GatedRoute route="/transit-manifests" gate={gateFor("/transit-manifests")}>{<TypeGuardedRoute types={['TRANSIT']}>{<TransitManifests />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/transit-cargo" element={<GatedRoute route="/transit-cargo" gate={gateFor("/transit-cargo")}>{<TypeGuardedRoute types={['TRANSIT']}>{<TransitCargo />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/restaurant-inventory" element={<GatedRoute route="/restaurant-inventory" gate={gateFor("/restaurant-inventory")}>{<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<RestaurantInventory />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/retail-inventory" element={<GatedRoute route="/retail-inventory" gate={gateFor("/retail-inventory")}>{<RetailInventory />}</GatedRoute>} />
        <Route path="/analytics" element={<GatedRoute route="/analytics" gate={gateFor("/analytics")}>{<Analytics />}</GatedRoute>} />
        <Route path="/pos" element={<GatedRoute route="/pos" gate={gateFor("/pos")}>{<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<POS />}</TypeGuardedRoute>}</GatedRoute>} />
        <Route path="/settings/developer" element={<GatedRoute route="/settings/developer" gate={gateFor("/settings/developer")}>{<Developer />}</GatedRoute>} />
        <Route path="/groups" element={<GatedRoute route="/groups" gate={gateFor("/groups")}>{<BusinessGroups />}</GatedRoute>} />
        <Route path="/settings/messaging" element={<GatedRoute route="/settings/messaging" gate={gateFor("/settings/messaging")}>{<MessagingChannels />}</GatedRoute>} />
        <Route path="/marketing/web-ordering" element={<GatedRoute route="/marketing/web-ordering" gate={gateFor("/marketing/web-ordering")}>{<WebOrdering />}</GatedRoute>} />
        <Route path="/storefront" element={<GatedRoute route="/storefront" gate={gateFor("/storefront")}>{<StorefrontEditor />}</GatedRoute>} />
        <Route path="/storefront/experience" element={<GatedRoute route="/storefront/experience" gate={gateFor("/storefront/experience")}>{<ExperienceStudio />}</GatedRoute>} />
        <Route path="/storefront/analytics" element={<GatedRoute route="/storefront/analytics" gate={gateFor("/storefront/analytics")}>{<StorefrontAnalytics />}</GatedRoute>} />
      </Route>
      <Route path="/login" element={<GatedRoute route="/login" gate={gateFor("/login")}>{<Navigate to="/" replace />}</GatedRoute>} />
      <Route path="/onboarding" element={<GatedRoute route="/onboarding" gate={gateFor("/onboarding")}>{<Navigate to="/" replace />}</GatedRoute>} />
      <Route path="*" element={<GatedRoute route="*" gate={gateFor("*")}>{<Navigate to="/" replace />}</GatedRoute>} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppBackground />
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
            <Router>
              <AppRoutes />
            </Router>
            <ToastHost />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
