// Lightweight UI primitives — no Radix dependency for simple cases
import { useEffect } from "react";
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export { GlassPanel } from './GlassPanel';
export { AnimatedNumber } from './AnimatedNumber';

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'primary', color, bg, className }) {
  const variants = {
    primary:   { color: 'var(--az-accent)', bg: 'var(--az-accent-subtle)' },
    success:   { color: 'var(--az-success)', bg: 'var(--az-success-subtle)' },
    warning:   { color: 'var(--az-warning)', bg: 'var(--az-warning-subtle)' },
    danger:    { color: 'var(--az-danger)', bg: 'var(--az-danger-subtle)' },
    secondary: { color: 'var(--az-text-secondary)', bg: 'var(--az-bg-alt)', border: 'var(--az-border)' },
    outline:   { color: 'var(--az-text-muted)', bg: 'transparent', border: 'var(--az-border)' },
  };
  const v = variants[variant] || variants.primary;
  const c = color || v.color;
  const b = bg || v.bg;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{ color: c, background: b, border: v.border ? `1px solid ${v.border}` : undefined }}
    >
      {variant !== 'outline' && variant !== 'secondary' && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      )}
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, disabled, className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants = {
    primary:   'bg-[var(--az-accent)] text-white hover:bg-[var(--az-accent-hover)] active:scale-[0.98] shadow-sm',
    secondary: 'bg-white border border-[var(--az-border)] text-[var(--az-text)] hover:bg-[var(--az-bg-alt)] hover:border-[var(--az-border-strong)]',
    ghost:     'text-[var(--az-text-muted)] hover:bg-[var(--az-bg-alt)] hover:text-[var(--az-text)]',
    danger:    'bg-[var(--az-danger-subtle)] border border-[var(--az-danger)] text-[var(--az-danger)] hover:bg-[var(--az-danger)] hover:text-white',
    outline:   'border border-[var(--az-border)] text-[var(--az-text-muted)] hover:border-[var(--az-accent)] hover:text-[var(--az-accent)]',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm',
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--az-border)] p-5',
        hover && 'az-card-hover cursor-pointer',
        className
      )}
      style={{ background: 'var(--az-card)' }}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">{label}</label>}
      <input
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-[var(--az-black)] border border-[var(--az-border)] text-[var(--az-text)] text-sm',
          'placeholder:text-[var(--az-text-muted)] outline-none',
          'focus:border-[var(--az-accent)] focus:ring-1 focus:ring-[var(--az-accent)] transition-colors',
          error && 'border-[var(--az-danger)]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--az-danger)]">{error}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">{label}</label>}
      <textarea
        rows={3}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-[var(--az-black)] border border-[var(--az-border)] text-[var(--az-text)] text-sm resize-none',
          'placeholder:text-[var(--az-text-muted)] outline-none',
          'focus:border-[var(--az-accent)] focus:ring-1 focus:ring-[var(--az-accent)] transition-colors',
          error && 'border-[var(--az-danger)]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--az-danger)]">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, options = [], className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">{label}</label>}
      <select
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-[var(--az-black)] border border-[var(--az-border)] text-[var(--az-text)] text-sm',
          'outline-none focus:border-[var(--az-accent)] transition-colors cursor-pointer',
          error && 'border-[var(--az-danger)]',
          className
        )}
        {...props}
      >
        {options.map(({ value, label: lbl }) => (
          <option key={value} value={value} style={{ background: 'var(--az-surface)' }}>
            {lbl}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[var(--az-danger)]">{error}</p>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }) {
  return <div className={cn('az-shimmer rounded-xl', className)} />;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={cn('border-2 border-[var(--az-border)] border-t-[var(--az-accent)] rounded-full animate-spin', sz[size])} />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--az-surface)] border border-[var(--az-border)] flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-[var(--az-text-muted)]" />
        </div>
      )}
      <p className="text-[var(--az-text)] font-semibold text-base mb-1">{title}</p>
      {description && <p className="text-[var(--az-text-muted)] text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-2xl border border-[var(--az-border)] shadow-2xl animate-scale-in',
          className
        )}
        style={{ background: 'var(--az-card)' }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--az-border)]">
            <h2 className="text-base font-bold text-[var(--az-text)]">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--az-border)] text-[var(--az-text-muted)] hover:text-[var(--az-text)] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'var(--az-accent)', loading }) {
  if (loading) return <Skeleton className="h-28" />;
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-[var(--az-text)] az-mono">{value}</p>
          {sub && <p className="text-xs text-[var(--az-text-muted)] mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1a`, border: `1px solid ${color}30` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        )}
      </div>
    </Card>
  );
}

export * from './Widget';
export * from './DataTable';
export * from './GlobalFilter';
export * from './Tabs';
export * from './Progress';
export * from './Avatar';
export * from './Tooltip';
export * from './Switch';
export * from './Sheet';
export * from './DatePicker';
export * from './Toast';
export * from './Command';
export * from './Separator';
export * from './DropdownMenu';

// ── Virtualization ──────────────────────────────────────────────────────────
export { VirtualizedList } from './VirtualizedList';
export { VirtualizedGrid } from './VirtualizedGrid';

// ── Product Tour ─────────────────────────────────────────────────────────────
export { ProductTour, shouldShowTour, markTourComplete } from './ProductTour';
