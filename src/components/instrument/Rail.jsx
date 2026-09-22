import { m, LayoutGroup } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { DOMAINS } from '@/lib/nav';
import { SPRING } from '@/lib/motion';

/**
 * INSTRUMENT Rail — §4.1
 * Reads from the real src/lib/nav.js DOMAINS export.
 * nav.js uses `to` (not `path`), `label`, `icon` (component ref), and `count` (string key).
 * The DOMAINS structure has groups with items — we flatten them for the rail.
 */

function flattenNavItems() {
  const items = [];
  DOMAINS.forEach(domain => {
    domain.groups.forEach(group => {
      group.items.forEach(item => {
        // skip vertical-specific items that don't apply (filter happens in parent)
        items.push(item);
      });
    });
  });
  return items;
}

export function Rail({ collapsed, businessName, badgeCounts, visibleItems }) {
  const items = visibleItems || flattenNavItems();
  return (
    <nav className="i-rail" style={{
      width: collapsed ? 'var(--rail-w)' : 'var(--panel-w)',
      paddingTop: 10, paddingBottom: 10,
    }}>
      <div style={{ padding: '0 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: 'var(--chrome-text-hi)',
          color: 'var(--chrome)', display: 'grid', placeItems: 'center',
          font: '620 10px/1 var(--font)',
        }}>AZ</div>
        {!collapsed && <span style={{ color: 'var(--chrome-text-hi)', font: '560 12px/1 var(--font)' }}>{businessName}</span>}
      </div>
      <LayoutGroup id="rail">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className="i-rail__item"
            style={{ width: 'calc(100% - 12px)' }}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <m.span layoutId="rail-marker" className="i-rail__marker" transition={SPRING.snap} />
                )}
                {item.icon && <item.icon size={14} strokeWidth={1.75} />}
                {!collapsed && <span>{item.label}</span>}
                {badgeCounts?.[item.count] > 0 && (
                  <span className="i-rail__badge">{badgeCounts[item.count]}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </LayoutGroup>
    </nav>
  );
}
