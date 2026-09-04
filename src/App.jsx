import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
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
        <Route path="/login" element={<Login />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    );
  }

  if (!isAdmin && !bizProfile) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}><div className="animate-pulse text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div></div>}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*"           element={<Navigate to="/onboarding" replace />} />
      </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}><div className="animate-pulse text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div></div>}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/orders"         element={<Orders />} />
        <Route path="/orders/:id"     element={<OrderDetail />} />
        <Route path="/products"       element={<Products />} />
        <Route path="/invoices"       element={<Invoices />} />
        <Route path="/locations"      element={<Locations />} />
        <Route path="/kyb"            element={<KYB />} />
        <Route path="/notifications"  element={<Notifications />} />
        <Route path="/messages"       element={<Messages />} />
        <Route path="/settings"       element={<Settings />} />
        <Route path="/transit" element={<TypeGuardedRoute types={['TRANSIT']}>{<TransitTrips />}</TypeGuardedRoute>} />
        <Route path="/reservations"         element={<Reservations />} />
        <Route path="/checkin"              element={<CheckIn />} />
        <Route path="/reviews"              element={<Reviews />} />
        <Route path="/dine-in" element={<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<DineIn />}</TypeGuardedRoute>} />
        <Route path="/guests" element={<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<Guests />}</TypeGuardedRoute>} />
        <Route path="/marketing"            element={<Marketing />} />
        <Route path="/finance"              element={<FinanceV2 />} />
        <Route path="/finance/pnl"          element={<FinanceV2 />} />
        <Route path="/finance/expenses"     element={<FinanceV2 />} />
        <Route path="/finance/payouts"      element={<FinanceV2 />} />
        <Route path="/finance/disputes"     element={<FinanceV2 />} />
        <Route path="/seat-map"             element={<Navigate to="/transit" replace />} />
        <Route path="/showcase"             element={<Showcase />} />
        <Route path="/employees"            element={<Employees />} />
        <Route path="/scheduling"         element={<Scheduling />} />
        <Route path="/payroll"            element={<Payroll />} />
        <Route path="/time-off"           element={<TimeOff />} />
        <Route path="/hotel-rooms" element={<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<HotelRooms />}</TypeGuardedRoute>} />
        <Route path="/hotel-housekeeping" element={<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<HotelHousekeeping />}</TypeGuardedRoute>} />
        <Route path="/hotel-front-desk" element={<TypeGuardedRoute types={['HOTEL', 'RESTAURANT']}>{<HotelFrontDesk />}</TypeGuardedRoute>} />
        <Route path="/restaurant-kitchen" element={<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<RestaurantKitchen />}</TypeGuardedRoute>} />
        <Route path="/restaurant-tables" element={<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<RestaurantTables />}</TypeGuardedRoute>} />
        <Route path="/transit-fleet" element={<TypeGuardedRoute types={['TRANSIT']}>{<TransitFleet />}</TypeGuardedRoute>} />
        <Route path="/transit-drivers" element={<TypeGuardedRoute types={['TRANSIT']}>{<TransitDrivers />}</TypeGuardedRoute>} />
        <Route path="/transit-manifests" element={<TypeGuardedRoute types={['TRANSIT']}>{<TransitManifests />}</TypeGuardedRoute>} />
        <Route path="/transit-cargo" element={<TypeGuardedRoute types={['TRANSIT']}>{<TransitCargo />}</TypeGuardedRoute>} />
        <Route path="/restaurant-inventory" element={<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<RestaurantInventory />}</TypeGuardedRoute>} />
        <Route path="/retail-inventory" element={<RetailInventory />} />
        <Route path="/analytics"            element={<Analytics />} />
        <Route path="/pos" element={<TypeGuardedRoute types={['RESTAURANT', 'HOTEL']}>{<POS />}</TypeGuardedRoute>} />
        <Route path="/settings/developer"   element={<Developer />} />
        <Route path="/groups"               element={<BusinessGroups />} />
        <Route path="/settings/messaging"  element={<MessagingChannels />} />
        <Route path="/marketing/web-ordering" element={<WebOrdering />} />
        <Route path="/storefront"             element={<StorefrontEditor />} />
        <Route path="/storefront/experience" element={<ExperienceStudio />} />
        <Route path="/storefront/analytics"   element={<StorefrontAnalytics />} />
      </Route>
      <Route path="/login"      element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="*"           element={<Navigate to="/" replace />} />
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
