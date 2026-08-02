import { m, AnimatePresence } from 'motion/react';
import { V } from '@/lib/motion';

export function Toast({ show, tone = 'neutral', children, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          {...V.toast}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 90,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 'var(--r3)',
            background: 'var(--surface-raise)', border: '1px solid var(--line-firm)',
            boxShadow: 'var(--d2)', font: '500 var(--t-sm)/1.3 var(--font)',
            color: 'var(--text)', maxWidth: 380,
          }}
          onClick={onDismiss}
        >
          <span className={`i-tag i-tag--${tone}`} style={{ flex: 'none' }}><i /></span>
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
