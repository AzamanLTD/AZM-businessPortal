import { useState } from 'react';

export function Tooltip({ children, content, side = 'top' }) {
  const [show, setShow] = useState(false);
  const pos = side === 'bottom' ? { top: '100%', marginTop: 6 } : side === 'left' ? { right: '100%', marginRight: 6 } : side === 'right' ? { left: '100%', marginLeft: 6 } : { bottom: '100%', marginBottom: 6 };
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && content && (
        <span style={{
          ...pos,
          position: 'absolute',
          zIndex: 9999,
          padding: '4px 8px',
          borderRadius: 'var(--r2)',
          background: 'var(--surface-raised)',
          color: 'var(--text)',
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          border: '1px solid var(--line)',
          pointerEvents: 'none',
        }}>
          {content}
        </span>
      )}
    </span>
  );
}
