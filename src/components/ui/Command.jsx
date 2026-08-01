import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export function Command({ items, placeholder = 'Search...', onSelect, className }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(-1);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.group?.toLowerCase().includes(query.toLowerCase())
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(item => {
      const g = item.group || 'All';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [filtered]);

  const flatList = filtered;

  return (
    <div className={cn('rounded-xl border border-[var(--f-line)] overflow-hidden', className)} style={{ background: 'var(--f-surface)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--f-line)]">
        <Search className="w-4 h-4 text-[var(--f-text-3)]" />
        <input
          autoFocus
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(-1); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatList.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && selected >= 0) { onSelect?.(flatList[selected]); }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[var(--f-text)] outline-none placeholder:text-[var(--f-text-3)]"
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--f-text-3)]">{group}</p>
            {items.map(item => {
              const idx = flatList.indexOf(item);
              return (
                <button
                  key={item.value}
                  onClick={() => onSelect?.(item)}
                  onMouseEnter={() => setSelected(idx)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-left transition-colors',
                    selected === idx ? 'bg-[var(--f-surface-sunken)] text-[var(--f-text)]' : 'text-[var(--f-text-3)]'
                  )}
                >
                  {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && <span className="text-xs text-[var(--f-text-3)]">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-sm text-center text-[var(--f-text-3)]">No results found</p>
        )}
      </div>
    </div>
  );
}
