import { useState, useRef, useEffect } from 'react';

export function DropdownMenu({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          [align]: 0,
          zIndex: 1000,
          minWidth: 160,
          background: 'var(--surface-raised)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r3)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 4,
        }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 8,
        padding: '8px 12px', border: 0, background: 'transparent',
        cursor: 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'left',
        color: danger ? 'var(--stop)' : 'var(--text)', borderRadius: 'var(--r2)',
      }}
    >
      {children}
    </button>
  );
}
