import { m, AnimatePresence } from 'motion/react';
import { SPRING, V } from '@/lib/motion';

export function Sheet({ open, onClose, side = 'right', width = 420, children, title }) {
  const isRight = side === 'right';
  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div {...V.scrim} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'oklch(0.1 0 0 / 0.4)', zIndex: 70 }} />
          <m.div
            initial={{ x: isRight ? '100%' : '-100%' }}
            animate={{ x: 0, transition: SPRING.glide }}
            exit={{ x: isRight ? '100%' : '-100%', transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
            style={{
              position: 'fixed', top: 0, bottom: 0,
              [isRight ? 'right' : 'left']: 0,
              width: Math.min(width, '92vw'),
              background: 'var(--surface)',
              borderRight: isRight ? '1px solid var(--line-firm)' : 'none',
              borderLeft: !isRight ? '1px solid var(--line-firm)' : 'none',
              boxShadow: 'var(--d3)', zIndex: 71,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
            {title && (
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--line)',
                font: '600 var(--t-md)/1 var(--font)', color: 'var(--text)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                {title}
                <button onClick={onClose} className="i-btn i-btn--ghost i-btn--xs">Esc</button>
              </div>
            )}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
