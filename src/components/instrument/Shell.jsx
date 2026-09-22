import { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'motion/react';
import {
  Menu, Search, Bell, Sun, Moon, ChevronRight, ChevronsLeft, ChevronsRight,
  LogOut, Smartphone,
} from 'lucide-react';
import { resolveNav, DOMAINS } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { useCommandPalette } from '@/lib/command';
import { useSequence } from '@/lib/keys';
import { useAuth } from '@/lib/AuthContext';
import { getBusinessType } from '@/lib/businessTypes';
import { usePermission } from '@/hooks/usePermission';
import { useBizNotifications } from '@/hooks/useBizNotifications';
import { KYB_STATUS_META } from '@/lib/utils';
import { cn } from '@/lib/utils';

const ROUTE_QUERIES = {
  '/':                    ['biz', 'dashboard'],
  '/notifications':       ['biz', 'notifications'],
  '/messages':            ['biz', 'messages'],
  '/hotel-front-desk':    ['biz', 'front-desk'],
  '/checkin':             ['biz', 'checkin'],
  '/hotel-housekeeping':  ['biz', 'housekeeping'],
  '/hotel-rooms':         ['biz', 'rooms'],
  '/restaurant-kitchen': ['biz', 'kitchen'],
  '/restaurant-tables':  ['biz', 'tables'],
  '/pos':                ['biz', 'pos'],
  '/transit-fleet':      ['biz', 'fleet'],
  '/transit':            ['biz', 'trips'],
  '/transit-drivers':    ['biz', 'drivers'],
  '/transit-cargo':      ['biz', 'cargo'],
  '/reservations':       ['biz', 'reservations'],
  '/orders':             ['biz', 'orders'],
  '/invoices':           ['biz', 'invoices'],
  '/restaurant-inventory': ['biz', 'inventory'],
  '/retail-inventory':   ['biz', 'retail'],
  '/finance':            ['biz', 'finance'],
  '/finance/pnl':        ['biz', 'pnl'],
  '/finance/payouts':    ['biz', 'payouts'],
  '/finance/expenses':   ['biz', 'expenses'],
  '/finance/disputes':   ['biz', 'finance-disputes'],
  '/employees':          ['biz', 'employees'],
  '/payroll':            ['biz', 'payroll'],
  '/scheduling':        ['biz', 'scheduling'],
  '/analytics':         ['biz', 'analytics'],
  '/marketing':         ['biz', 'marketing'],
  '/reviews':           ['biz', 'reviews'],
  '/guests':            ['biz', 'guests'],
  '/groups':            ['biz', 'groups'],
  '/storefront':        ['biz', 'storefront'],
  '/settings':          ['biz', 'settings'],
  '/kyb':               ['biz', 'kyb'],
  '/locations':         ['biz', 'locations'],
  '/showcase':          ['biz', 'showcase'],
};

export function Shell({ children, navProps, brandName = 'Azaman', brandShort = 'AZ', user, onLogout, onNavigateSettings, ProfileMenu }) {
  const [paneCollapsed, setPaneCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flyout, setFlyout] = useState(null);
  const [pinnedDomain, setPinnedDomain] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const railRef = useRef(null);
  const nav = useMemo(() => resolveNav(navProps), [navProps]);
  const qc = useQueryClient();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (flyout && railRef.current && !railRef.current.contains(e.target)) setFlyout(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [flyout]);

  const activeDomain = useMemo(() => {
    return nav.find(d =>
      d.groups.some(g => g.items.some(i =>
        location.pathname === i.to || (i.to !== '/' && location.pathname.startsWith(i.to))
      ))
    ) || nav[0];
  }, [nav, location.pathname]);

  useEffect(() => {
    if (activeDomain) setPinnedDomain(activeDomain.id);
  }, [activeDomain?.id]);

  const displayDomain = nav.find(d => d.id === (pinnedDomain || activeDomain?.id)) || activeDomain || nav[0];

  const handleNavHover = (to) => {
    const key = ROUTE_QUERIES[to];
    if (key) qc.prefetchQuery({ queryKey: key });
  };

  const handleRailClick = (domain) => {
    if (paneCollapsed) {
      setFlyout(flyout === domain.id ? null : domain.id);
    } else {
      setPinnedDomain(domain.id);
      setFlyout(null);
    }
  };

  const isItemActive = (to) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <div className="i-shell-dual" data-collapsed={paneCollapsed || undefined}>
      {/* PANE 1 — Global icon rail */}
      <aside ref={railRef} className="i-rail-icons">
        <div className="i-rail-icons__logo" aria-hidden>{brandShort}</div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
          {nav.map(domain => {
            const Icon = domain.icon;
            const isActive = displayDomain?.id === domain.id;
            return (
              <div key={domain.id} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button
                  className={cn('i-rail-icons__btn', isActive && 'is-active')}
                  onClick={() => handleRailClick(domain)}
                  aria-label={domain.label}
                >
                  <Icon style={{ width: 18, height: 18, position: 'relative', zIndex: 1 }} />
                  <span className="i-rail-icons__tooltip">{domain.label}</span>
                </button>
                {paneCollapsed && flyout === domain.id && (
                  <m.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="i-flyout"
                  >
                    <p className="i-flyout__title">{domain.label}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {domain.groups.map(group =>
                        group.items.map(item => {
                          const ItemIcon = item.icon;
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              end={item.to === '/'}
                              onClick={() => setFlyout(null)}
                              className={cn('i-nav-item', isItemActive(item.to) && 'is-active')}
                              style={{ borderRadius: 'var(--r3)', padding: '6px 10px' }}
                            >
                              <ItemIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                              <span>{item.label}</span>
                              {item.badge != null && item.badge > 0 && (
                                <span className="i-nav-item__badge">{item.badge}</span>
                              )}
                            </NavLink>
                          );
                        })
                      )}
                    </div>
                  </m.div>
                )}
              </div>
            );
          })}
        </nav>
        {/* User avatar / logout */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <button
            className="i-rail-icons__btn"
            onClick={onLogout}
            style={{ borderRadius: '50%', width: 32, height: 32, background: 'color-mix(in oklch, var(--chrome-text) 12%, transparent)', fontWeight: 700, fontSize: 11 }}
            aria-label="Sign out"
          >
            {(user?.username || 'U').charAt(0).toUpperCase()}
            <span className="i-rail-icons__tooltip">Sign out</span>
          </button>
        </div>
      </aside>

      {/* PANE 2 — Contextual menu */}
      <AnimatePresence initial={false}>
        {!paneCollapsed && (
          <m.aside
            className="i-pane"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'var(--panel-w)', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="i-pane__header">
              <div>
                <p className="i-pane__label">AZAMAN</p>
                <p className="i-pane__title">{displayDomain?.label || 'Dashboard'}</p>
              </div>
              <button className="i-pane__collapse" onClick={() => setPaneCollapsed(true)} title="Collapse">
                <ChevronsLeft style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Business selector for admins */}
            {navProps.isAdmin && <BusinessSelectorInline />}

            {/* Business type badge for non-admins */}
            {!navProps.isAdmin && navProps.bizProfile && (
              <div className="i-biz-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 'var(--r2)',
                    background: 'color-mix(in oklch, var(--accent) 15%, transparent)',
                    border: '1px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--chrome-text-hi)' }}>{brandShort}</span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 550, color: 'var(--chrome-text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {navProps.bizProfile.businessName || brandName}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--chrome-text-3)', marginTop: 1 }}>
                      {navProps.businessType || 'General'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <nav className="i-pane__nav">
              {displayDomain?.groups.map(group => (
                <div key={group.label}>
                  <div className="i-nav-group-label">{group.label}</div>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={cn('i-nav-item', isItemActive(item.to) && 'is-active')}
                        onMouseEnter={() => handleNavHover(item.to)}
                      >
                        <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span>{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span className="i-nav-item__badge">{item.badge}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>
          </m.aside>
        )}
      </AnimatePresence>

      {/* Expand handle */}
      {paneCollapsed && (
        <div className="i-pane-expand" onClick={() => setPaneCollapsed(false)} title="Expand">
          <ChevronsRight style={{ width: 14, height: 14 }} />
        </div>
      )}

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
            />
            <m.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1000, width: 'min(280px, 82vw)', background: 'var(--chrome)', boxShadow: 'var(--d3)' }}
            >
              <MobileNav nav={nav} brandName={brandName} brandShort={brandShort} onNavigate={() => setMobileOpen(false)} />
            </m.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <TopbarDual
          onMenuClick={() => setMobileOpen(true)}
          brandName={brandName}
          domainLabel={displayDomain?.label}
          bizProfile={navProps.bizProfile}
          user={user}
          onLogout={onLogout}
          onNavigateSettings={onNavigateSettings}
          ProfileMenu={ProfileMenu}
          notifCount={navProps.counts?.notifications}
        />
        <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function BusinessSelectorInline() {
  const { adminBusinesses, selectedBusinessId, selectBusiness, bizProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return (adminBusinesses || []).filter(b =>
      !search || b.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      b.category?.toLowerCase().includes(search.toLowerCase())
    );
  }, [adminBusinesses, search]);

  const selectedBiz = (adminBusinesses || []).find(b => b.id === selectedBusinessId);

  const handleSelect = (bizId) => {
    localStorage.setItem('admin_selected_biz', bizId);
    selectBusiness(bizId);
    setOpen(false);
  };

  const handleClear = () => {
    localStorage.removeItem('admin_selected_biz');
    selectBusiness(null);
    setOpen(false);
  };

  return (
    <div className="i-biz-card">
      <p className="i-pane__label" style={{ marginBottom: 6 }}>Viewing as</p>
      <button
        onClick={() => setOpen(!open)}
        className="btn-3d"
        style={{ width: '100%', justifyContent: 'space-between', fontSize: 12, padding: '7px 10px' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedBiz ? selectedBiz.businessName : '— Select —'}
        </span>
        <ChevronRight style={{ width: 12, height: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .12s' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', left: 10, right: 10, marginTop: 4, zIndex: 50,
            background: 'var(--surface-raise)', border: '1px solid var(--line-firm)',
            borderRadius: 'var(--r4)', boxShadow: 'var(--d3)', maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{ width: '100%', padding: '6px 8px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r2)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            {selectedBusinessId && (
              <button
                onClick={handleClear}
                style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-3)', textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer', borderBottom: '1px solid var(--line)', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-sunk)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                ← Clear (Admin View-All)
              </button>
            )}
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
              {filtered.length === 0 && <p style={{ padding: '12px', fontSize: 12, color: 'var(--text-3)' }}>No businesses found.</p>}
              {filtered.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSelect(b.id)}
                  style={{
                    width: '100%', padding: '7px 12px', fontSize: 12, textAlign: 'left', border: 0, cursor: 'pointer',
                    background: selectedBusinessId === b.id ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'transparent',
                    color: selectedBusinessId === b.id ? 'var(--text)' : 'var(--text-2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { if (selectedBusinessId !== b.id) e.currentTarget.style.background = 'var(--surface-sunk)'; }}
                  onMouseLeave={e => { if (selectedBusinessId !== b.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.businessName}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{b.kybStatus || '—'}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {selectedBusinessId && bizProfile && (
        <p style={{ fontSize: 11, color: 'var(--chrome-text-3)', marginTop: 6 }}>
          Type: {bizProfile.category || 'General'} · KYB: {bizProfile.kybStatus || 'UNVERIFIED'}
        </p>
      )}
    </div>
  );
}

function MobileNav({ nav, brandName, brandShort, onNavigate }) {
  return (
    <>
      <div style={{ padding: '10px 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 'var(--r3)', background: 'var(--accent)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', font: '620 10px/1 var(--font)' }}>{brandShort}</div>
        <span style={{ color: 'var(--chrome-text-hi)', font: '560 13px/1 var(--font)' }}>{brandName}</span>
      </div>
      <nav onClick={onNavigate} style={{ overflowY: 'auto', flex: 1 }}>
        {nav.map(domain => (
          <div key={domain.id} style={{ marginBottom: 8 }}>
            <div className="i-nav-group-label">{domain.label}</div>
            {domain.groups.map(group => (
              <div key={group.label}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to}
                      className={({isActive}) => cn('i-nav-item', isActive && 'is-active')}
                      end={item.to === '/'}
                    >
                      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                      <span>{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="i-nav-item__badge">{item.badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

function TopbarDual({ onMenuClick, brandName, domainLabel, bizProfile, user, onLogout, onNavigateSettings, ProfileMenu, notifCount }) {
  const { theme, toggle } = useTheme();
  const { open } = useCommandPalette();
  const location = useLocation();
  const kybMeta = KYB_STATUS_META[bizProfile?.kybStatus || 'UNVERIFIED'];

  useSequence(['g','d']);

  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumb = segments.length === 0 ? 'Dashboard' :
    segments.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')).join(' / ');

  return (
    <header className="i-topbar-dual">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="i-rail-icons__btn md:hidden"
          onClick={onMenuClick}
          aria-label="Menu"
          style={{ display: window.innerWidth < 640 ? 'grid' : 'none' }}
        >
          <Menu style={{ width: 16, height: 16 }} />
        </button>
        <span style={{ color: 'var(--text-3)', font: '500 13px/1 var(--font)' }}>{domainLabel}</span>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-3)' }} />
        <span style={{ color: 'var(--text)', font: '500 13px/1 var(--font)' }}>{breadcrumb}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {bizProfile && bizProfile.kybStatus !== 'VERIFIED' && (
          <NavLink to="/kyb" className="btn-3d" style={{ fontSize: 11, padding: '4px 10px', background: kybMeta.bg, color: kybMeta.color, border: `1px solid ${kybMeta.color}30` }}>
            {bizProfile.kybStatus === 'UNVERIFIED' ? '⚠' : '✓'} {kybMeta.label}
          </NavLink>
        )}
        <button className="i-rail-icons__btn" onClick={open} aria-label="Search" style={{ color: 'var(--text-2)' }}>
          <Search style={{ width: 16, height: 16 }} />
        </button>
        <button className="i-rail-icons__btn" onClick={toggle} aria-label="Toggle theme" style={{ color: 'var(--text-2)' }}>
          {theme === 'dark' ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
        </button>
        <NavLink to="/notifications" className="i-rail-icons__btn" aria-label="Notifications" style={{ color: 'var(--text-2)', position: 'relative' }}>
          <Bell style={{ width: 16, height: 16 }} />
          {notifCount != null && notifCount > 0 && (
            <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--hold)' }} />
          )}
        </NavLink>
        {ProfileMenu ? <ProfileMenu user={user} onLogout={onLogout} onNavigateSettings={onNavigateSettings} /> : null}
      </div>
    </header>
  );
}
