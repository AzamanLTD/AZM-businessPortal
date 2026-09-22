// src/lib/toast.jsx
// Canonical toast system for the whole app. Sonner-API-compatible on
// purpose: toast.go(msg, opts) / toast.stop(msg, opts) / toast.neutral(msg, opts)
// all accept the SAME argument shapes Sonner did — a string, or a string
// plus an options object ({ description, action, duration }), or a
// single options object ({ title, description, action, duration }) for
// the rare call sites that used that shape. This means call sites do not
// need to be rewritten beyond the method name — see FIX 1, Step 1.3.
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, Info } from 'lucide-react';

const TONE_ICON = { go: Check, stop: AlertTriangle, neutral: Info };

let _push = null; // imperative bridge — set by <ToastHost/> on mount

function normalizeArgs(messageOrOpts, maybeOpts) {
  // Supports: toast.go('msg'), toast.go('msg', {description}), toast.go({title, description, action})
  if (typeof messageOrOpts === 'object' && messageOrOpts !== null) {
    return { title: messageOrOpts.title ?? '', ...messageOrOpts };
  }
  return { title: messageOrOpts, ...(maybeOpts || {}) };
}

export const toast = {
  go: (messageOrOpts, opts) => _push?.('go', normalizeArgs(messageOrOpts, opts)),
  stop: (messageOrOpts, opts) => _push?.('stop', normalizeArgs(messageOrOpts, opts)),
  neutral: (messageOrOpts, opts) => _push?.('neutral', normalizeArgs(messageOrOpts, opts)),
  // aliases kept 1:1 with Sonner's names too, in case a call site is missed
  // by the codemod in Step 1.3 — these make it a no-op-safe fallback rather
  // than a hard crash, while still routing through the real themed toast.
  success: (m, o) => toast.go(m, o),
  error: (m, o) => toast.stop(m, o),
  info: (m, o) => toast.neutral(m, o),
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tmr = timers.current.get(id);
    if (tmr) { clearTimeout(tmr); timers.current.delete(id); }
  }, []);

  const push = useCallback((tone, data) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, ...data }]);
    const dur = data.duration ?? (tone === 'stop' ? 6000 : 4000);
    if (dur > 0) timers.current.set(id, setTimeout(() => remove(id), dur));
  }, [remove]);

  _push = push; // bind the imperative API to this mounted instance

  return createPortal(
    <div
      aria-live="polite"
      style={{
        position: 'fixed', top: 16, left: '50%', translate: '-50% 0', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, width: 'min(420px, 92vw)',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone] || Info;
          return (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.13 } }}
              transition={{ type: 'spring', stiffness: 480, damping: 34 }}
              style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 12px', borderRadius: 'var(--r3)',
                background: 'var(--surface-raise)',
                border: '1px solid var(--line-firm)',
                boxShadow: 'var(--d3)',
                font: '500 var(--t-sm)/1.35 var(--font)',
                color: 'var(--text)',
              }}
              onClick={() => remove(t.id)}
            >
              <span
                style={{
                  flex: 'none', width: 20, height: 20, borderRadius: '50%',
                  display: 'grid', placeItems: 'center', marginTop: 1,
                  background:
                    t.tone === 'go' ? 'var(--go-bg)' : t.tone === 'stop' ? 'var(--stop-bg)' : 'var(--cool-bg)',
                  color: t.tone === 'go' ? 'var(--go)' : t.tone === 'stop' ? 'var(--stop)' : 'var(--cool)',
                }}
              >
                <Icon size={12} strokeWidth={2.4} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text)' }}>{t.title}</div>
                {t.description && (
                  <div style={{ marginTop: 2, fontSize: 'var(--t-xs)', color: 'var(--text-3)' }}>
                    {t.description}
                  </div>
                )}
                {t.action}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                aria-label="Dismiss"
                style={{ flex: 'none', background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}
              >
                <X size={13} />
              </button>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// Legacy context API — kept ONLY so any file still importing { useToast }
// doesn't hard-crash; it forwards to the same imperative store above.
const ToastCtx = createContext(toast);
export function ToastProvider({ children }) { return <ToastCtx.Provider value={toast}>{children}</ToastCtx.Provider>; }
export const useToast = () => useContext(ToastCtx);
