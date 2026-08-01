// src/components/forge/DropdownMenu.jsx
// Simple dropdown menu with trigger + items
import { useState, useRef, useEffect } from 'react';

export function DropdownMenu({ trigger, items = [], className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-line bg-surface-raised shadow-lg py-1">
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="h-px bg-line my-1" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                disabled={item.disabled}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none ${item.danger ? 'text-destructive' : ''}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
