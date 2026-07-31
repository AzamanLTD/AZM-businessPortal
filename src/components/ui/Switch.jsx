import { cn } from '@/lib/utils';

export function Switch({ checked, onChange, disabled, label, className }) {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      {label && <span className="text-sm text-[var(--az-text-muted)]">{label}</span>}
      <button
        type="button"
        role="switch"
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-[var(--az-accent)]' : 'bg-[var(--az-border)]'
        )}
      >
        <span className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-[var(--az-surface-1)] transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )} />
      </button>
    </label>
  );
}
