import { m, AnimatePresence } from 'motion/react';
import { SPRING } from '@/lib/motion';

export function BulkBar({ count, actions, onClear }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <m.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: SPRING.glide }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.13 } }}
          style={{
            position: 'sticky', bottom: 8, margin: '8px', padding: '8px 10px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--chrome)', color: 'var(--chrome-text-hi)',
            borderRadius: 'var(--r3)', boxShadow: 'var(--d3)',
          }}>
          <span className="i-num" style={{ fontSize: 12 }}>{count} selected</span>
          <div style={{ display: 'flex', gap: 6 }}>{actions}</div>
          <button className="i-btn i-btn--ghost i-btn--xs" style={{ marginLeft: 'auto', color: 'inherit' }} onClick={onClear}>
            Clear
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
