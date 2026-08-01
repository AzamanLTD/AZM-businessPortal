import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function DropdownMenu({ trigger, items, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[180px] rounded-xl border border-[var(--f-line)] shadow-2xl py-1.5 animate-scale-in',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
          style={{ background: 'var(--f-surface)' }}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="h-px bg-[var(--f-line)] my-1.5" />
            ) : (
              <button
                key={i}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left',
                  item.danger
                    ? 'text-[var(--f-bad)] hover:bg-[var(--f-bad-bg)]'
                    : 'text-[var(--f-text-3)] hover:bg-[var(--f-surface-sunken)] hover:text-[var(--f-text)]'
                )}
              >
                {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="text-xs text-[var(--f-text-3)]">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
