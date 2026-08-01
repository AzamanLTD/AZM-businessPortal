import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ tabs, defaultIndex = 0, onChange, className }) {
  const [active, setActive] = useState(defaultIndex);

  const handleTabChange = (i) => {
    setActive(i);
    onChange?.(i);
  };

  return (
    <div className={className}>
      <div className="flex gap-1 p-1 rounded-xl border border-[var(--f-line)] bg-[var(--f-surface)]">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => handleTabChange(i)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              active === i
                ? 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)] border border-[var(--f-tint-color)]'
                : 'text-[var(--f-text-3)] hover:text-[var(--f-text-3)] hover:bg-[var(--f-surface-sunken)]'
            )}
          >
            {tab.icon && <tab.icon className="w-4 h-4 inline mr-1.5" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                active === i ? 'bg-[var(--f-tint-color)] text-[var(--f-bg)]' : 'bg-[var(--f-line)] text-[var(--f-text-3)]'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs[active]?.content && <div className="mt-4">{tabs[active].content}</div>}
    </div>
  );
}
