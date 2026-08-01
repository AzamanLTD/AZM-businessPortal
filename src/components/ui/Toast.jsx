import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
// Returns { toast } — every call site destructures it as `const { toast } = useToast();`
export const useToast = () => useContext(ToastContext);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertCircle };
const COLORS = { success: 'var(--f-tint-color)', error: 'var(--f-bad)', info: 'var(--f-info)', warning: 'var(--f-warn)' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  const toast = {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
    warning: (msg) => show(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          const color = COLORS[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-slide-in-right',
              )}
              style={{ background: 'var(--f-surface)', borderColor: `${color}40` }}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
              <p className="text-sm text-[var(--f-text)] flex-1">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-[var(--f-text-3)] hover:text-[var(--f-text)]">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
