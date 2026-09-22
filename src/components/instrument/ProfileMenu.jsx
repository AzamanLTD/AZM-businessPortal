import { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';

export function ProfileMenu({ user, onLogout, onNavigateSettings }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const name = user?.fullName || user?.email || 'Operator';
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
          border: 0, background: 'transparent', cursor: 'pointer',
          color: 'var(--chrome-text)', font: '500 12px/1 var(--font)',
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--surface-sunk)', display: 'grid', placeItems: 'center',
          font: '600 10px/1 var(--font)', color: 'var(--chrome-text-2)',
        }}>{initials}</div>
        <ChevronDown style={{ width: 12, height: 12, color: 'var(--chrome-text-3)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              minWidth: 180, background: 'var(--surface-raised)',
              border: '1px solid var(--line)', borderRadius: 'var(--r3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 1000, padding: 4,
            }}
          >
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
              <div style={{ font: '600 12px/1.3 var(--font)', color: 'var(--text)' }}>{name}</div>
              {user?.email && <div style={{ font: '400 11px/1.3 var(--font)', color: 'var(--text-3)', marginTop: 2 }}>{user.email}</div>}
            </div>
            {onNavigateSettings && (
              <button onClick={() => { setOpen(false); onNavigateSettings(); }}
                style={menuItemStyle}>
                <Settings style={{ width: 14, height: 14 }} />
                Settings
              </button>
            )}
            <button onClick={() => { setOpen(false); onLogout?.(); }}
              style={{ ...menuItemStyle, color: 'var(--stop)' }}>
              <LogOut style={{ width: 14, height: 14 }} />
              Sign out
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuItemStyle = {
  display: 'flex', width: '100%', alignItems: 'center', gap: 8,
  padding: '8px 12px', border: 0, background: 'transparent',
  cursor: 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'left',
  color: 'var(--text)', borderRadius: 'var(--r2)',
};
