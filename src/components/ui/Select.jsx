import { cn } from '@/lib/utils';

export default function Select({ label, error, options = [], className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">{label}</label>}
      <select
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-[var(--f-bg)] border border-[var(--f-line)] text-[var(--f-text)] text-sm',
          'outline-none focus:border-[var(--f-tint-color)] transition-colors cursor-pointer',
          error && 'border-[var(--f-bad)]',
          className
        )}
        {...props}
      >
        {options.map(({ value, label: lbl }) => (
          <option key={value} value={value} style={{ background: 'var(--f-surface)' }}>
            {lbl}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[var(--f-bad)]">{error}</p>}
    </div>
  );
}
