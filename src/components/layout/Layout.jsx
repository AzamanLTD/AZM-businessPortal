import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
import {
  LayoutDashboard,
  Bell,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Package,
  ShoppingBag,
  Receipt,
  Settings,
  MapPin,
  Bus,
  CalendarCheck,
  QrCode,
  BedDouble,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  CalendarDays,
  Wallet,
  Megaphone,
  Image as ImageIcon,
  Grid3x3,
  Star,
  Utensils,
  Smartphone,
  LayoutGrid,
  LineChart,
  Sparkles,
  ConciergeBell,
  ChefHat,
  LayoutDashboard as TableIcon,
  CarFront,
  ShipWheel,
  FileSpreadsheet,
  MessageSquare,
  ShoppingCart,
  BarChart2, BarChart3, Code2, Globe, Layers, Moon, Sun, Store } from "lucide-react";

const SECTION_HEADERS = {
  overview: 'Overview',
  bookings: 'Bookings & Orders',
  ops: 'Vertical Ops',
  workforce: 'Workforce',
  finance: 'Finance',
  marketing: 'Marketing',
  settings: 'Settings'
};

const ALL_NAVIGATION_ITEMS = [
  // Overview
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', section: 'overview', perm: null },
  { label: 'Notifications', icon: Bell, to: '/notifications', section: 'overview', perm: null },
  { label: 'Messages', icon: MessageSquare, to: '/messages', section: 'overview', perm: null },

  // Bookings & Orders
  { label: 'Reservations', icon: CalendarCheck, to: '/reservations', section: 'bookings', perm: 'reservations.view' },
  { label: 'Orders', icon: ShoppingBag, to: '/orders', section: 'bookings', perm: 'orders.view' },
  { label: 'Invoices', icon: Receipt, to: '/invoices', section: 'bookings', perm: 'invoices.view' },

  // Vertical Ops
  { label: 'Hotel Rooms', icon: BedDouble, to: '/hotel-rooms', section: 'ops', perm: 'hotel.view' },
  { label: 'Front Desk', icon: ConciergeBell, to: '/hotel-front-desk', section: 'ops', perm: 'hotel.view' },
  { label: 'Housekeeping', icon: Sparkles, to: '/hotel-housekeeping', section: 'ops', perm: 'hotel.view' },
  { label: 'Kitchen', icon: ChefHat, to: '/restaurant-kitchen', section: 'ops', perm: 'restaurant.view' },
  { label: 'Tables', icon: TableIcon, to: '/restaurant-tables', section: 'ops', perm: 'restaurant.view' },
  { label: 'Inventory', icon: Package, to: '/inventory', section: 'ops', perm: 'inventory.view' },
  { label: 'Dine-In', icon: Utensils, to: '/dine-in', section: 'ops', perm: 'restaurant.view' },
  { label: 'POS', icon: ShoppingCart, to: '/pos', section: 'ops', perm: 'restaurant.view' },
  { label: 'Transit Fleet', icon: CarFront, to: '/transit-fleet', section: 'ops', perm: 'transit.view' },
  { label: 'Trips', icon: Bus, to: '/transit', section: 'ops', perm: 'transit.view' },
  { label: 'Drivers', icon: ShipWheel, to: '/transit-drivers', section: 'ops', perm: 'transit.view' },
  { label: 'Cargo', icon: FileSpreadsheet, to: '/transit-manifests', section: 'ops', perm: 'transit.view' },

  // Workforce
  { label: 'Employees', icon: Users, to: '/employees', section: 'workforce', perm: 'employees.view' },
  { label: 'Scheduling', icon: CalendarDays, to: '/scheduling', section: 'workforce', perm: 'shifts.view' },
  { label: 'Payroll', icon: Wallet, to: '/payroll', section: 'workforce', perm: 'payroll.view' },
  { label: 'Time Off', icon: CalendarCheck, to: '/time-off', section: 'workforce', perm: 'employees.view' },

  // Finance
  { label: 'Finance', icon: LineChart, to: '/finance', section: 'finance', perm: 'finance.view' },

  // Marketing
  { label: 'Marketing', icon: Megaphone, to: '/marketing', section: 'marketing', perm: 'marketing.view' },
  { label: 'Analytics', icon: BarChart2, to: '/analytics', section: 'marketing', perm: 'marketing.view' },
  { label: 'Reviews', icon: Star, to: '/reviews', section: 'marketing', perm: 'reviews.view' },
  { label: 'Showcase', icon: ImageIcon, to: '/showcase', section: 'marketing', perm: 'marketing.view' },
  { label: 'Web Ordering', icon: Globe, to: '/marketing/web-ordering', section: 'marketing', perm: 'marketing.view' },
  { label: 'Storefront', icon: Store, to: '/storefront', section: 'marketing', perm: 'storefront.manage' },
  { label: 'Storefront Analytics', icon: BarChart3, to: '/storefront/analytics', section: 'marketing', perm: 'storefront.manage' },

  // Settings
  { label: 'Settings', icon: Settings, to: '/settings', section: 'settings', perm: null },
  { label: 'Locations', icon: MapPin, to: '/locations', section: 'settings', perm: 'locations.view' },
  { label: 'Messaging', icon: MessageSquare, to: '/settings/messaging', section: 'settings', perm: null },
  { label: 'Business Groups', icon: Layers, to: '/groups', section: 'settings', perm: null },
  { label: 'Developer', icon: Code2, to: '/settings/developer', section: 'settings', perm: null }
];

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
    return false; // light is the real default
  });

  // Apply / remove .dark class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) { html.classList.add('dark'); } else { html.classList.remove('dark'); }
    localStorage.setItem('az-dark-mode', JSON.stringify(darkMode));
  }, [darkMode]);
  const [showPhonePreview, setShowPhonePreview] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [tourRun, setTourRun] = useState(false);
  const [tourName, setTourName] = useState(null);
  const location = useLocation();
  // Auto-trigger tour for first-time users based on current page
  useEffect(() => {
    const path = location.pathname;
    let name = null;
    if (path === "/" || path === "/dashboard") name = "dashboard";
    else if (path.startsWith("/orders")) name = "orders";
    else if (path.startsWith("/employees")) name = "employees";
    else if (path.startsWith("/finance") || path.startsWith("/invoices")) name = "finance";
    else if (path.startsWith("/reservations")) name = "reservations";

    if (name && shouldShowTour(name)) {
      const timer = setTimeout(() => {
        setTourName(name);
        setTourRun(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);
  const navigate = useNavigate();
  const profileRef = useRef(null);

  useBizNotifications();

  // Handle Ctrl+K / Cmd+K globally
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

  // Save sidebar toggle state
  useEffect(() => {
    localStorage.setItem('az-sidebar-expanded', JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  // Handle outside click for profile menu
  useEffect(() => {
    const onClick = (e) => {
      if (profileMenuOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profileMenuOpen]);

  // Check if current user is owner (always bypasses permission filtering)
  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  // Filter items by permission & businessType rules
  const bizType = bizProfile ? getTypeConfig(bizProfile).type : null;
  const isHotel = bizType === 'HOTEL';
  const isRestaurant = bizType === 'RESTAURANT';
  const isTransit = bizType === 'TRANSIT';

  const filteredNavItems = ALL_NAVIGATION_ITEMS.filter(item => {
    // Hide hotel-only items for non-hotel businesses
    if (item.perm === 'hotel.view' && !isHotel && !isRestaurant) return false;
    // Hide restaurant-only items for non-restaurant businesses
    if (item.perm === 'restaurant.view' && !isRestaurant && !isHotel) return false;
    // Hide transit-only items for non-transit businesses
    if (item.perm === 'transit.view' && !isTransit) return false;

    // POS is only visible for restaurant/hotel businesses
    if (item.label === 'POS') {
      if (!isRestaurant && !isHotel) return false;
    }

    if (!item.perm) return true;
    if (isOwner) return true;
    return hasPermission(item.perm);
  });

  // Group items by section
  const navGroups = Object.keys(SECTION_HEADERS).map(sectionKey => {
    return {
      key: sectionKey,
      header: SECTION_HEADERS[sectionKey],
      items: filteredNavItems.filter(item => item.section === sectionKey)
    };
  }).filter(group => group.items.length > 0);

  const isItemActive = (to) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  // Find active item to display in the header path
  const activeItem = ALL_NAVIGATION_ITEMS.find(item => isItemActive(item.to));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = (bizProfile?.businessName || user?.username || 'B').charAt(0).toUpperCase();
  const kybMeta = KYB_STATUS_META[bizProfile?.kybStatus || 'UNVERIFIED'];
  const typeConfig = bizProfile ? getTypeConfig(bizProfile) : null;

  // Navigation Links component
  const NavLinks = ({ onLinkClick }) => (
    <div className="space-y-6">
      {navGroups.map(group => (
        <div key={group.key} className="space-y-1">
          {sidebarExpanded && (
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-az-text-muted">
              {group.header}
            </h3>
          )}
          <div className="space-y-0.5">
            {group.items.map(item => {
              const active = isItemActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onLinkClick}
                  aria-label={item.label}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all relative rounded-full group',
                    active
                      ? 'text-az-accent font-semibold'
                      : 'text-az-text-secondary hover:bg-az-bg-alt hover:text-az-text'
                  )}
                >
                  {/* Subtle active pill background */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-full bg-az-accent-subtle -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  {/* Active rail background behind icon in collapsed state */}
                  {!sidebarExpanded && active && (
                    <motion.div
                      layoutId="sidebar-rail-active-bg"
                      className="absolute inset-y-1.5 left-2 right-2 rounded-full bg-az-accent-subtle -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <item.icon className={cn('w-4.5 h-4.5 flex-shrink-0', active ? 'text-az-accent' : 'text-az-text-secondary group-hover:text-az-text')} />
                  
                  {sidebarExpanded && (
                    <span className="truncate">{item.label}</span>
                  )}

                  {/* Collapsed view tooltips */}
                  {!sidebarExpanded && (
                    <div className="absolute left-full ml-3 px-2 py-1 rounded bg-az-surface border border-az-border text-az-text text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-sm">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-az-bg text-az-text font-sans">
      
      {/* Command Palette Mount */}
      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <ProductTour tourName={tourName} run={tourRun} onClose={() => setTourRun(false)} />

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: sidebarExpanded ? 240 : 64 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="hidden md:flex flex-col flex-shrink-0 border-r border-az-border bg-white relative z-20 h-full overflow-hidden"
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-az-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-az-accent-subtle border border-az-border flex items-center justify-center flex-shrink-0">
              <img src="/azaman-logo.png" alt="Azaman" className="w-5 h-5 object-contain" />
            </div>
            {sidebarExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold tracking-tight text-lg text-az-text"
              >
                AZM Portal
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation area */}
        <div data-tour="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <NavLinks />
        </div>

        {/* Live Preview Button (Phone Preview) */}
        {bizProfile && (
          <div className="p-3 border-t border-az-border">
            <button
              onClick={() => setShowPhonePreview(true)}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 rounded-az-md border border-az-border text-az-text-secondary hover:bg-az-bg-alt hover:text-az-text transition-colors",
                !sidebarExpanded && "px-0"
              )}
              title="Live Preview"
            >
              <Smartphone className="w-4.5 h-4.5" />
              {sidebarExpanded && <span className="text-sm font-medium">Live Preview</span>}
            </button>
          </div>
        )}

        {/* Sidebar Toggle Handle */}
        <div className="p-3 border-t border-az-border flex justify-end">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full py-1.5 flex items-center justify-center rounded-az-md hover:bg-az-bg-alt text-az-text-secondary transition-colors"
          >
            <motion.div
              animate={{ rotate: sidebarExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </motion.div>
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black z-30 md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white border-r border-az-border z-40 md:hidden flex flex-col h-full shadow-lg"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-az-border flex-shrink-0">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-az-accent-subtle border border-az-border flex items-center justify-center">
                    <img src="/azaman-logo.png" alt="Azaman" className="w-5 h-5 object-contain" />
                  </div>
                  <span className="font-bold tracking-tight text-lg text-az-text">AZM Portal</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-az-md hover:bg-az-bg-alt text-az-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-tour="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                {/* Keep sidebar expanded for mobile drawer */}
                <NavLinks onLinkClick={() => setMobileOpen(false)} />
              </div>

              {bizProfile && (
                <div className="p-4 border-t border-az-border">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setShowPhonePreview(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-az-md border border-az-border text-az-text-secondary hover:bg-az-bg-alt"
                  >
                    <Smartphone className="w-4.5 h-4.5" />
                    <span className="text-sm font-medium">Live Preview</span>
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Layout Wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* ── Top Bar ── */}
        <header className="h-16 border-b border-az-border bg-az-surface backdrop-blur-glass flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger button on Mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-az-md hover:bg-az-bg-alt text-az-text-secondary md:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current route / title */}
            {activeItem && (
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
                <span className="text-az-text-muted capitalize">{activeItem.section}</span>
                <ChevronRight className="w-3.5 h-3.5 text-az-text-muted" />
                <span className="text-az-text font-semibold">{activeItem.label}</span>
              </div>
            )}
          </div>

          {/* Top Bar Actions (Right) */}
          <div className="flex items-center gap-3">
            
            {/* Cmd+K Hint Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-az-bg-alt border border-az-border text-az-text-muted text-[10px] font-medium tracking-wide">
              <span>Cmd</span>
              <span>+</span>
              <span>K</span>
            </div>

            {/* Sync / Connection Status */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-az-bg-alt border border-az-border text-xs text-az-text-secondary font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online & synced
            </div>

            {/* Verification Badge */}
            {bizProfile && bizProfile.kybStatus !== 'VERIFIED' && (
              <Link
                to="/kyb"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-az-md text-xs font-medium border transition-colors shadow-sm"
                style={{ background: kybMeta.bg, color: kybMeta.color, borderColor: `${kybMeta.color}30` }}
              >
                {bizProfile.kybStatus === 'UNVERIFIED' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{kybMeta.label}</span>
              </Link>
            )}

            {/* Business Selector or Admin view badge */}
            {isAdmin && !selectedBusinessId ? (
              <span className="px-3 py-1.5 rounded-az-md bg-az-accent-subtle text-az-accent text-xs font-semibold border border-az-accent/20">
                Admin View-All
              </span>
            ) : (
              <BusinessSelector />
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(v => !v)}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors hover:bg-az-bg-alt"
              style={{ borderColor: 'var(--az-border)', color: 'var(--az-text-muted)' }}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <div data-tour="notification-bell"><NotificationBell /></div>

            {/* User Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(v => !v)}
                className="w-9 h-9 rounded-full bg-az-accent-subtle text-az-accent border border-az-accent/15 flex items-center justify-center font-bold text-sm hover:brightness-95 transition-all shadow-sm flex-shrink-0"
              >
                {initial}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-az-md border border-az-border bg-az-surface shadow-lg z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-az-border flex items-center gap-3 bg-az-bg-alt/50">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-az-accent-subtle text-az-accent font-bold text-xs flex-shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-az-text truncate">
                          {bizProfile?.businessName || user?.username || 'Account'}
                        </p>
                        <p className="text-xs text-az-text-muted truncate">
                          {user?.email || user?.username || 'Signed in'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-az-text-secondary hover:bg-az-bg-alt hover:text-az-text transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Account settings
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50/50 hover:text-red-600 transition-colors border-t border-az-border"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* ── Content Area ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-az-bg">
          <Outlet />
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
