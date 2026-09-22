import { Command } from 'cmdk';
import { m, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { V } from '@/lib/motion';
import { DOMAINS } from '@/lib/nav';

export function CommandPalette({ open, onOpenChange, records = {} }) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange?.(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Flatten nav items
  const navItems = [];
  DOMAINS.forEach(d => d.groups.forEach(g => g.items.forEach(i => navItems.push(i))));

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div {...V.scrim} onClick={() => onOpenChange(false)}
            style={{ position: 'fixed', inset: 0, background: 'oklch(0.1 0 0 / 0.4)', zIndex: 80 }} />
          <m.div {...V.palette}
            style={{
              position: 'fixed', top: '18%', left: '50%',
              translate: '-50% 0', zIndex: 81,
              width: 560, maxWidth: '92vw',
              background: 'var(--surface-raise)',
              borderRadius: 'var(--r4)', border: '1px solid var(--line-firm)',
              boxShadow: 'var(--d3)', overflow: 'hidden',
            }}>
            <Command shouldFilter label="Command palette"
              onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false); }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
                <Command.Input autoFocus placeholder="Jump to a record, a screen, or an action…"
                  value={search}
                  onValueChange={setSearch}
                  style={{
                    width: '100%', border: 0, outline: 'none', background: 'transparent',
                    font: '500 var(--t-lg)/1 var(--font)', color: 'var(--text)',
                  }} />
              </div>
              <Command.List style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
                <Command.Empty style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No matches.
                </Command.Empty>
                <Command.Group heading="Go to">
                  {navItems.map((n) => (
                    <Command.Item key={n.to}
                      onSelect={() => { onOpenChange(false); window.location.hash = n.to; }}
                      className="i-cmdk-item"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 'var(--r2)', cursor: 'pointer' }}>
                      {n.icon && <n.icon size={13} />}
                      {n.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                {Object.entries(records).map(([group, items]) => items.length > 0 && (
                  <Command.Group key={group} heading={group}>
                    {items.map((r) => (
                      <Command.Item key={r.id} value={`${r.label} ${r.id}`}
                        onSelect={() => { onOpenChange(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 'var(--r2)', cursor: 'pointer' }}>
                        {r.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
