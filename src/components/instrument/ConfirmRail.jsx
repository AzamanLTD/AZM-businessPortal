import { useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { SPRING } from '@/lib/motion';

export function ConfirmRail({ label, confirmLabel = 'Confirm', onConfirm, danger = true }) {
  const [armed, setArmed] = useState(false);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!armed ? (
        <m.button key="idle" className={`i-btn i-btn--sm ${danger ? 'i-btn--danger' : ''}`}
          onClick={() => setArmed(true)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
          {label}
        </m.button>
      ) : (
        <m.div key="armed" style={{ display: 'flex', gap: 6 }}
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1, transition: SPRING.detent }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}>
          <button className="i-btn i-btn--danger i-btn--sm" onClick={() => { onConfirm(); setArmed(false); }}>{confirmLabel}</button>
          <button className="i-btn i-btn--ghost i-btn--sm" onClick={() => setArmed(false)}>Cancel</button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
