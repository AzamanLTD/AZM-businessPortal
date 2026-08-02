import { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'motion/react';
import {
  Menu, Search, Bell, Sun, Moon,
} from 'lucide-react';
import { resolveNav } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { useCommandPalette } from '@/lib/command';
import { useSequence } from '@/lib/keys';
import { Tag } from './Tag';
import { Tooltip } from './Tooltip';
import { cn } from '@/lib/utils';

// Route → primary query key for hover prefetch
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const nav = useMemo(() => resolveNav(navProps), [navProps]);
  const qc = useQueryClient();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Prefetch on nav hover
  const handleNavHover = (to) => {
    const key = ROUTE_QUERIES[to];
    if (key) qc.prefetchQuery({ queryKey: key });
  };

  return (
    <div className="i-shell" data-collapsed={collapsed || undefined}>
      {/* ── Sidebar ── */}
      <aside className="i-rail" style={{ width: collapsed ? 'var(--rail-w)' : 'var(--panel-w)' }}>
        <div style={{ padding: '0 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5, background: 'var(--chrome-text-hi)',
            color: 'var(--chrome)', display: 'grid', placeItems: 'center',
            font: '620 10px/1 var(--font)',
          }} aria-hidden>{brandShort}</div>
          {!collapsed && <span style={{ color: 'var(--chrome-text-hi)', font: '560 12px/1 var(--font)' }}>{brandName}</span>}
        </div>
        <nav aria-label="Primary" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {nav.map(domain => (
            <div key={domain.id} style={{ marginBottom: 8 }}>
              {!collapsed && (
                <div style={{ padding: '6px 14px 2px', font: '600 9px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--chrome-text-3)' }}>
                  {domain.label}
                </div>
              )}
              {domain.groups.map(group => (
                <div key={group.label}>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} to={item.to}
                        className={({isActive}) => cn('i-rail__item', isActive && 'is-active')}
                        title={collapsed ? item.label : undefined}
                        end={item.to === '/'}
                        onMouseEnter={() => handleNavHover(item.to)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 14px', textDecoration: 'none',
                          fontSize: 13, fontWeight: 500, position: 'relative',
                        }}>
                        <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && item.badge != null && item.badge > 0 && (
                          <span style={{
                            marginLeft: 'auto', background: 'var(--accent)', color: 'var(--chrome)',
                            font: '600 10px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 4,
                            minWidth: 18, textAlign: 'center',
                          }}>{item.badge}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <m.div className="i-scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
            <m.aside className="i-rail i-rail--mobile"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1000, width: 'var(--panel-w)' }}>
              <MobileNav nav={nav} brandName={brandName} brandShort={brandShort}
                         onNavigate={() => setMobileOpen(false)} />
            </m.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Topbar onMenuClick={() => setMobileOpen(true)} onCollapseToggle={() => setCollapsed(c => !c)}
                collapsed={collapsed} brandName={brandName}
                user={user} onLogout={onLogout} onNavigateSettings={onNavigateSettings} ProfileMenu={ProfileMenu} />
        <main className="i-content" style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileNav({ nav, brandName, brandShort, onNavigate }) {
  return (
    <>
      <div style={{ padding: '10px 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--chrome-text-hi)', color: 'var(--chrome)', display: 'grid', placeItems: 'center', font: '620 10px/1 var(--font)' }}>{brandShort}</div>
        <span style={{ color: 'var(--chrome-text-hi)', font: '560 12px/1 var(--font)' }}>{brandName}</span>
      </div>
      <nav onClick={onNavigate} style={{ overflowY: 'auto' }}>
        {nav.map(domain => (
          <div key={domain.id} style={{ marginBottom: 8 }}>
            <div style={{ padding: '6px 14px 2px', font: '600 9px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--chrome-text-3)' }}>{domain.label}</div>
            {domain.groups.map(group => (
              <div key={group.label}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to}
                      className={({isActive}) => cn('i-rail__item', isActive && 'is-active')}
                      end={item.to === '/'}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                      <span>{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--chrome)', font: '600 10px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 4 }}>{item.badge}</span>
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

function Topbar({ onMenuClick, onCollapseToggle, collapsed, brandName, user, onLogout, onNavigateSettings, ProfileMenu }) {
  const { theme, toggle } = useTheme();
  const { open } = useCommandPalette();

  useSequence(['g','d']);

  return (
    <header className="i-topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 48, borderBottom: '1px solid var(--line)',
      background: 'var(--chrome)', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="i-icon-btn md:hidden" onClick={onMenuClick} aria-label="Menu"
          style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 6, color: 'var(--chrome-text-2)' }}>
          <Menu style={{ width: 16, height: 16 }} />
        </button>
        <button className="i-icon-btn hidden md:flex" onClick={onCollapseToggle}
                aria-label={collapsed ? 'Expand' : 'Collapse'}
          style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 6, color: 'var(--chrome-text-2)', display: 'none' }}>
          <Menu style={{ width: 16, height: 16 }} />
        </button>
        <Breadcrumb />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={open} className="i-cmd-trigger"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
            border: '1px solid var(--line)', borderRadius: 'var(--r2)', background: 'transparent',
            cursor: 'pointer', color: 'var(--chrome-text-3)', font: '400 12px/1 var(--font)',
          }}>
          <Search style={{ width: 13, height: 13 }} />
          <span>Search…</span>
          <kbd style={{ font: '500 10px/1 var(--font-mono)', padding: '2px 4px', borderRadius: 3, background: 'var(--surface-sunk)' }}>⌘K</kbd>
        </button>
        <button onClick={toggle} aria-label="Toggle theme"
          style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 6, color: 'var(--chrome-text-2)' }}>
          {theme === 'dark' ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
        </button>
        <button aria-label="Notifications" style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 6, color: 'var(--chrome-text-2)', position: 'relative' }}>
          <Bell style={{ width: 16, height: 16 }} />
          <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--hold)' }} />
        </button>
        {ProfileMenu ? <ProfileMenu user={user} onLogout={onLogout} onNavigateSettings={onNavigateSettings} /> : null}
      </div>
    </header>
  );
}

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (!segments.length) return <span style={{ color: 'var(--chrome-text)', font: '500 13px/1 var(--font)' }}>Dashboard</span>;
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, font: '500 13px/1 var(--font)' }}>
      {segments.map((seg, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: 'var(--chrome-text-3)' }}>/</span>}
          <span style={{ color: i === segments.length - 1 ? 'var(--chrome-text)' : 'var(--chrome-text-3)' }}>
            {seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')}
          </span>
        </span>
      ))}
    </nav>
  );
}
