import { m, AnimatePresence } from 'motion/react';
import { V } from '@/lib/motion';

export function Dialog({ open, onClose, children, title, width = 440 }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div {...V.scrim} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'oklch(0.1 0 0 / 0.4)', zIndex: 80 }} />
          <m.div {...V.dialog}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              translate: '-50% -50%', zIndex: 81,
              width: Math.min(width, '92vw'),
              background: 'var(--surface-raise)',
              borderRadius: 'var(--r4)', border: '1px solid var(--line-firm)',
              boxShadow: 'var(--d3)', overflow: 'hidden',
            }}>
            {title && (
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--line)',
                font: '600 var(--t-md)/1 var(--font)', color: 'var(--text)',
              }}>
                {title}
              </div>
            )}
            <div style={{ padding: 16 }}>
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
