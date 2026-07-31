import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { pageVariants } from '@/lib/motion';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { KYB_STATUS_META } from '@/lib/utils';
import { useBizNotifications } from '@/hooks/useBizNotifications';
import { getTypeConfig } from '@/lib/businessTypes';
import NotificationBell from './NotificationBell';
import { BusinessSelector } from './BusinessSelector';
import { PhonePreview } from '../PhonePreview';
import { CommandPalette } from '../CommandPalette';
import { ProductTour, shouldShowTour } from "@/components/ui";
import { BusinessThemeToggle } from "@/components/ui/ThemeToggle";
import {
  LayoutDashboard, Bell, LogOut, ChevronRight, Menu, X,
  Package, ShoppingBag, Receipt, Settings, MapPin, Bus,
  CalendarCheck, BedDouble, AlertCircle, CheckCircle2,
  Users, CalendarDays, Wallet, Megaphone, Image as ImageIcon,
  Star, Utensils, Smartphone, LineChart, Sparkles,
  ConciergeBell, ChefHat, LayoutDashboard as TableIcon,
  CarFront, ShipWheel, FileSpreadsheet, MessageSquare,
  ShoppingCart, BarChart2, BarChart3, Code2, Globe, Layers,
  Store, Search, ChevronLeft,
} from "lucide-react";

const SECTION_HEADERS = {
  overview:  'Overview',
  bookings:  'Bookings & Orders',
  ops:       'Vertical Ops',
  workforce: 'Workforce',
  finance:   'Finance',
  marketing: 'Marketing',
  settings:  'Settings',
};

const ALL_NAVIGATION_ITEMS = [
  // Overview
  { label: 'Dashboard',     icon: LayoutDashboard,    to: '/',                      section: 'overview',  perm: null },
  { label: 'Notifications',  icon: Bell,               to: '/notifications',          section: 'overview',  perm: null },
  { label: 'Messages',       icon: MessageSquare,      to: '/messages',               section: 'overview',  perm: null },

  // Bookings & Orders
  { label: 'Reservations',   icon: CalendarCheck,     to: '/reservations',           section: 'bookings',  perm: 'reservations.view' },
  { label: 'Orders',         icon: ShoppingBag,       to: '/orders',                 section: 'bookings',  perm: 'orders.view' },
  { label: 'Invoices',       icon: Receipt,           to: '/invoices',               section: 'bookings',  perm: 'invoices.view' },

  // Vertical Ops
  { label: 'Hotel Rooms',    icon: BedDouble,         to: '/hotel-rooms',            section: 'ops',       perm: 'hotel.view' },
  { label: 'Front Desk',     icon: ConciergeBell,     to: '/hotel-front-desk',       section: 'ops',       perm: 'hotel.view' },
  { label: 'Housekeeping',   icon: Sparkles,          to: '/hotel-housekeeping',     section: 'ops',       perm: 'hotel.view' },
  { label: 'Kitchen',        icon: ChefHat,           to: '/restaurant-kitchen',     section: 'ops',       perm: 'restaurant.view' },
  { label: 'Tables',         icon: TableIcon,         to: '/restaurant-tables',      section: 'ops',       perm: 'restaurant.view' },
  { label: 'Inventory',      icon: Package,           to: '/inventory',              section: 'ops',       perm: 'inventory.view' },
  { label: 'Dine-In',        icon: Utensils,          to: '/dine-in',               section: 'ops',       perm: 'restaurant.view' },
  { label: 'POS',             icon: ShoppingCart,      to: '/pos',                   section: 'ops',       perm: 'restaurant.view' },
  { label: 'Transit Fleet',  icon: CarFront,          to: '/transit-fleet',          section: 'ops',       perm: 'transit.view' },
  { label: 'Trips',          icon: Bus,               to: '/transit',                section: 'ops',       perm: 'transit.view' },
  { label: 'Drivers',        icon: ShipWheel,         to: '/transit-drivers',        section: 'ops',       perm: 'transit.view' },
  { label: 'Cargo',          icon: FileSpreadsheet,   to: '/transit-manifests',      section: 'ops',       perm: 'transit.view' },

  // Workforce
  { label: 'Employees',      icon: Users,             to: '/employees',              section: 'workforce', perm: 'employees.view' },
  { label: 'Scheduling',     icon: CalendarDays,      to: '/scheduling',            section: 'workforce', perm: 'shifts.view' },
  { label: 'Payroll',        icon: Wallet,            to: '/payroll',               section: 'workforce', perm: 'payroll.view' },
  { label: 'Time Off',       icon: CalendarCheck,    to: '/time-off',              section: 'workforce', perm: 'employees.view' },

  // Finance
  { label: 'Finance',        icon: LineChart,         to: '/finance',               section: 'finance',   perm: 'finance.view' },

  // Marketing
  { label: 'Marketing',       icon: Megaphone,         to: '/marketing',             section: 'marketing', perm: 'marketing.view' },
  { label: 'Analytics',      icon: BarChart2,         to: '/analytics',            section: 'marketing', perm: 'marketing.view' },
  { label: 'Reviews',        icon: Star,              to: '/reviews',              section: 'marketing', perm: 'reviews.view' },
  { label: 'Showcase',       icon: ImageIcon,        to: '/showcase',              section: 'marketing', perm: 'marketing.view' },
  { label: 'Web Ordering',   icon: Globe,             to: '/marketing/web-ordering', section: 'marketing', perm: 'marketing.view' },
  { label: 'Storefront',      icon: Store,            to: '/storefront',            section: 'marketing', perm: 'storefront.manage' },
  { label: 'Storefront Analytics', icon: BarChart3,  to: '/storefront/analytics',  section: 'marketing', perm: 'storefront.manage' },

  // Settings
  { label: 'Settings',       icon: Settings,          to: '/settings',              section: 'settings',  perm: null },
  { label: 'Locations',       icon: MapPin,           to: '/locations',             section: 'settings',  perm: 'locations.view' },
  { label: 'Messaging',      icon: MessageSquare,     to: '/settings/messaging',    section: 'settings',  perm: null },
  { label: 'Business Groups', icon: Layers,          to: '/groups',                section: 'settings',  perm: null },
  { label: 'Developer',      icon: Code2,            to: '/settings/developer',     section: 'settings',  perm: null },
];

/* ── Sentry-inspired nav item ──
 * Default: border transparent, no background
 * Hover:  border + subtle background fill
 * Active: accent background + accent border + primary text
 */
function SentryNavItem({ item, active, collapsed, onLinkClick }) {
  return (
    <Link
      to={item.to}
      onClick={onLinkClick}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium',
        'rounded-md border transition-all duration-150 relative group',
        collapsed && 'justify-center',
      )}
      style={{
        borderColor: active
          ? 'var(--az-accent-border)'
          : 'transparent',
        background: active
          ? 'var(--az-accent-subtle)'
          : 'transparent',
        color: active
          ? 'var(--az-text)'
          : 'var(--az-text-secondary)',
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--az-border-strong)';
          e.currentTarget.style.background = 'var(--az-surface-3)';
          e.currentTarget.style.color = 'var(--az-text)';
        } else {
          e.currentTarget.style.background = 'var(--az-accent-subtle)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--az-text-secondary)';
        }
      }}
    >
      <item.icon
        style={{ width: 16, height: 16 }}
        className="flex-shrink-0"
      />
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2 py-1 rounded-md border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50"
          style={{
            background: 'var(--az-surface-1)',
            borderColor: 'var(--az-border-strong)',
            color: 'var(--az-text)',
          }}
        >
          {item.label}
        </div>
      )}
    </Link>
  );
}

export default function Layout() {
  const { hasPermission } = usePermission();
  const { bizProfile, user, logout, isAdmin, selectedBusinessId } = useAuth();

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('az-sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('az-dark-mode');
    if (saved !== null) return JSON.parse(saved);
    return false;
  });
  const [showPhonePreview, setShowPhonePreview] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [tourRun, setTourRun] = useState(false);
  const [tourName, setTourName] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('az-dark-mode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const path = location.pathname;
    let name = null;
    if (path === '/' || path === '/dashboard') name = 'dashboard';
    else if (path.startsWith('/orders')) name = 'orders';
    else if (path.startsWith('/employees')) name = 'employees';
    else if (path.startsWith('/finance') || path.startsWith('/invoices')) name = 'finance';
    else if (path.startsWith('/reservations')) name = 'reservations';
    if (name && shouldShowTour(name)) {
      const timer = setTimeout(() => { setTourName(name); setTourRun(true); }, 800);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const navigate = useNavigate();
  const profileRef = useRef(null);

  useBizNotifications();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('az-sidebar-expanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  useEffect(() => {
    const onClick = (e) => {
      if (profileMenuOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profileMenuOpen]);

  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  const bizType = bizProfile ? getTypeConfig(bizProfile).type : null;
  const isHotel = bizType === 'HOTEL';
  const isRestaurant = bizType === 'RESTAURANT';
  const isTransit = bizType === 'TRANSIT';

  const filteredNavItems = ALL_NAVIGATION_ITEMS.filter(item => {
    if (item.perm === 'hotel.view' && !isHotel && !isRestaurant) return false;
    if (item.perm === 'restaurant.view' && !isRestaurant && !isHotel) return false;
    if (item.perm === 'transit.view' && !isTransit) return false;
    if (item.label === 'POS' && !isRestaurant && !isHotel) return false;
    if (!item.perm) return true;
    if (isOwner) return true;
    return hasPermission(item.perm);
  });

  const navGroups = Object.keys(SECTION_HEADERS).map(sectionKey => ({
    key: sectionKey,
    header: SECTION_HEADERS[sectionKey],
    items: filteredNavItems.filter(item => item.section === sectionKey),
  })).filter(group => group.items.length > 0);

  const isItemActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const activeItem = ALL_NAVIGATION_ITEMS.find(item => isItemActive(item.to));

  const handleLogout = () => { logout(); navigate('/login'); };

  const initial = (bizProfile?.businessName || user?.username || 'B').charAt(0).toUpperCase();
  const kybMeta = KYB_STATUS_META[bizProfile?.kybStatus || 'UNVERIFIED'];

  /* ── Sidebar content (shared desktop + mobile) ── */
  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 shrink-0 border-b px-4"
        style={{
          height: 'var(--header-height, 52px)',
          borderColor: 'var(--az-border)',
        }}
      >
        <div
          className="rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            width: 32, height: 32,
            background: 'var(--az-accent-subtle)',
            border: '1px solid var(--az-accent-border)',
          }}
        >
          <img src="/azaman-logo.png" alt="Azaman" className="w-4.5 h-4.5 object-contain" />
        </div>
        {sidebarExpanded && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--az-text)' }}>
              {bizProfile?.businessName || 'AZM Portal'}
            </p>
            {!bizProfile && (
              <p className="text-[10px] font-medium" style={{ color: 'var(--az-text-muted)' }}>
                Business Portal
              </p>
            )}
          </div>
        )}
      </div>

      {/* Nav — scrollable */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {navGroups.map(group => (
          <div key={group.key}>
            {sidebarExpanded && (
              <p
                className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--az-text-muted)' }}
              >
                {group.header}
              </p>
            )}
            {!sidebarExpanded && <div className="h-1" />}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <SentryNavItem
                  key={item.to}
                  item={item}
                  active={isItemActive(item.to)}
                  collapsed={!sidebarExpanded}
                  onLinkClick={onLinkClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Live Preview + Collapse */}
      <div className="shrink-0 border-t p-2 space-y-1" style={{ borderColor: 'var(--az-border)' }}>
        {bizProfile && (
          <button
            onClick={() => setShowPhonePreview(true)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium border border-transparent transition-all',
              !sidebarExpanded && 'justify-center',
            )}
            style={{ color: 'var(--az-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--az-border-strong)';
              e.currentTarget.style.background = 'var(--az-surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Smartphone style={{ width: 16, height: 16 }} />
            {sidebarExpanded && <span>Live Preview</span>}
          </button>
        )}
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium border border-transparent transition-all',
            !sidebarExpanded && 'justify-center',
          )}
          style={{ color: 'var(--az-text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--az-border-strong)';
            e.currentTarget.style.background = 'var(--az-surface-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <motion.div animate={{ rotate: sidebarExpanded ? 0 : 180 }} transition={{ duration: 0.2 }}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </motion.div>
          {sidebarExpanded && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--az-bg)', color: 'var(--az-text)' }}>

      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <ProductTour tourName={tourName} run={tourRun} onClose={() => setTourRun(false)} />

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: sidebarExpanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col flex-shrink-0 border-r overflow-hidden relative z-20 h-full"
        style={{
          background: 'var(--az-surface-1)',
          borderColor: 'var(--az-border)',
        }}
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile Sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-30 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-y-0 left-0 w-[260px] border-r z-40 md:hidden flex flex-col h-full"
              style={{
                background: 'var(--az-surface-1)',
                borderColor: 'var(--az-border)',
              }}
            >
              {/* Mobile sidebar always shows expanded */}
              <MobileSidebarContent
                navGroups={navGroups}
                isItemActive={isItemActive}
                onLinkClick={() => setMobileOpen(false)}
                bizProfile={bizProfile}
                setShowPhonePreview={setShowPhonePreview}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* ── Topbar ── */}
        <header
          className="shrink-0 flex items-center justify-between px-4 md:px-6 border-b"
          style={{
            height: 'var(--header-height, 52px)',
            background: 'var(--az-surface-1)',
            borderColor: 'var(--az-border)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -ml-1.5 rounded-md md:hidden"
              style={{ color: 'var(--az-text-secondary)' }}
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>

            {/* Breadcrumb */}
            {activeItem && (
              <div className="hidden sm:flex items-center gap-2 text-[13px]">
                <span className="capitalize" style={{ color: 'var(--az-text-muted)' }}>
                  {activeItem.section}
                </span>
                <ChevronRight style={{ width: 12, height: 12, color: 'var(--az-text-muted)' }} />
                <span className="font-semibold" style={{ color: 'var(--az-text)' }}>
                  {activeItem.label}
                </span>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Command palette hint */}
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors"
              style={{
                border: '1px solid var(--az-border)',
                background: 'var(--az-surface-2)',
                color: 'var(--az-text-muted)',
              }}
            >
              <Search style={{ width: 12, height: 12 }} />
              <span>Search</span>
              <kbd
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                style={{
                  background: 'var(--az-surface-3)',
                  borderColor: 'var(--az-border)',
                  color: 'var(--az-text-muted)',
                }}
              >⌘K</kbd>
            </button>

            {/* KYB badge */}
            {bizProfile && bizProfile.kybStatus !== 'VERIFIED' && (
              <Link
                to="/kyb"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
                style={{
                  background: kybMeta.bg || 'var(--az-warning-subtle)',
                  color: kybMeta.color || 'var(--az-warning)',
                  borderColor: `${kybMeta.color || 'var(--az-warning)'}30`,
                }}
              >
                {bizProfile.kybStatus === 'UNVERIFIED'
                  ? <AlertCircle style={{ width: 13, height: 13 }} />
                  : <CheckCircle2 style={{ width: 13, height: 13 }} />}
                <span>{kybMeta.label}</span>
              </Link>
            )}

            {/* Business selector or admin badge */}
            {isAdmin && !selectedBusinessId ? (
              <span
                className="px-2.5 py-1 rounded-md text-xs font-semibold border"
                style={{
                  background: 'var(--az-accent-subtle)',
                  color: 'var(--az-accent)',
                  borderColor: 'var(--az-accent-border)',
                }}
              >
                Admin View-All
              </span>
            ) : (
              <BusinessSelector />
            )}

            {/* Theme toggle */}
            <BusinessThemeToggle isDark={darkMode} onToggle={() => setDarkMode(v => !v)} />

            {/* Notifications */}
            <div data-tour="notification-bell">
              <NotificationBell />
            </div>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 border"
                style={{
                  background: 'var(--az-accent-subtle)',
                  color: 'var(--az-accent)',
                  borderColor: 'var(--az-accent-border)',
                }}
              >
                {initial}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-lg border shadow-lg z-50 overflow-hidden"
                    style={{
                      background: 'var(--az-surface-1)',
                      borderColor: 'var(--az-border)',
                    }}
                  >
                    <div
                      className="px-4 py-3 border-b flex items-center gap-3"
                      style={{
                        borderColor: 'var(--az-border)',
                        background: 'var(--az-surface-2)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                        style={{
                          background: 'var(--az-accent-subtle)',
                          color: 'var(--az-accent)',
                        }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--az-text)' }}>
                          {bizProfile?.businessName || user?.username || 'Account'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--az-text-muted)' }}>
                          {user?.email || user?.username || 'Signed in'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => { setProfileMenuOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--az-text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--az-surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Settings style={{ width: 15, height: 15 }} /> Account settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-t"
                      style={{
                        color: 'var(--az-danger)',
                        borderColor: 'var(--az-border)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--az-danger-subtle)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <LogOut style={{ width: 15, height: 15 }} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Phone Preview Modal */}
      <AnimatePresence>
        {showPhonePreview && bizProfile && (
          <PhonePreview business={bizProfile} onClose={() => setShowPhonePreview(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* Mobile sidebar — always expanded, shows full nav */
function MobileSidebarContent({ navGroups, isItemActive, onLinkClick, bizProfile, setShowPhonePreview }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0 border-b px-4"
        style={{ height: '52px', borderColor: 'var(--az-border)' }}>
        <div className="rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: 'var(--az-accent-subtle)', border: '1px solid var(--az-accent-border)' }}>
          <img src="/azaman-logo.png" alt="Azaman" className="w-4.5 h-4.5 object-contain" />
        </div>
        <p className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--az-text)' }}>
          {bizProfile?.businessName || 'AZM Portal'}
        </p>
        <button onClick={onLinkClick} className="ml-auto p-1.5 rounded-md" style={{ color: 'var(--az-text-secondary)' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {navGroups.map(group => (
          <div key={group.key}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--az-text-muted)' }}>
              {group.header}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <SentryNavItem key={item.to} item={item} active={isItemActive(item.to)} collapsed={false} onLinkClick={onLinkClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {bizProfile && (
        <div className="shrink-0 border-t p-2" style={{ borderColor: 'var(--az-border)' }}>
          <button onClick={() => { onLinkClick(); setShowPhonePreview(true); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium"
            style={{ color: 'var(--az-text-secondary)' }}>
            <Smartphone style={{ width: 16, height: 16 }} />
            <span>Live Preview</span>
          </button>
        </div>
      )}
    </div>
  );
}
