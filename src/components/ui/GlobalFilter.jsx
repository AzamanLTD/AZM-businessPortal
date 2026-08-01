/**
 * GlobalFilter — Sentry-style dashboard global filter bar.
 * Applies filters across all widgets in the dashboard view.
 * Sentry tenet: URL state for navigation that changes visible data.
 */
import { cn } from '@/lib/utils';
import { Filter, X, Calendar, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function GlobalFilter({ filters, values, onChange }) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeCount = Object.entries(values).filter(([k, v]) => v && v !== 'all' && v !== '').length;

  return (
    <div
      ref={ref}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--f-line)] mb-5"
      style={{ background: 'var(--f-surface)' }}
    >
      <div className="flex items-center gap-2 text-[var(--f-text-3)]">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold uppercase tracking-wider">Filters</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)] text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-[var(--f-line)]" />

      {filters.map(filter => (
        <div key={filter.key} className="relative">
          <button
            onClick={() => setOpen(open === filter.key ? null : filter.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              values[filter.key] && values[filter.key] !== 'all'
                ? 'text-[var(--f-tint-color)] bg-[var(--f-surface-sunken)]'
                : 'text-[var(--f-text-3)] hover:bg-[var(--f-line)]'
            )}
          >
            {filter.icon && <filter.icon className="w-3 h-3" />}
            <span>{filter.label}</span>
            {values[filter.key] && values[filter.key] !== 'all' && (
              <span className="text-[var(--f-text-3)]">: {filter.options?.find(o => o.value === values[filter.key])?.label || values[filter.key]}</span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {open === filter.key && (
            <div className="absolute top-full left-0 mt-1 min-w-[180px] rounded-xl border border-[var(--f-line)] shadow-2xl z-50 overflow-hidden" style={{ background: 'var(--f-surface)' }}>
              {filter.options?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange({ ...values, [filter.key]: opt.value });
                    setOpen(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left',
                    values[filter.key] === opt.value
                      ? 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)]'
                      : 'text-[var(--f-text-3)] hover:bg-[var(--f-line)]'
                  )}
                >
                  {opt.label}
                  {values[filter.key] === opt.value && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {activeCount > 0 && (
        <button
          onClick={() => onChange({})}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[var(--f-text-3)] hover:text-[var(--f-bad)] hover:bg-[#f43f5e10] transition-colors"
        >
          <X className="w-3 h-3" />
          Clear all
        </button>
      )}
    </div>
  );
}
