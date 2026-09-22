import { useState, useRef, useEffect, useCallback } from 'react';
import { m } from 'motion/react';
import { SPRING } from '@/lib/motion';

/**
 * INSTRUMENT DataTable — §3.7
 * Keyboard grid: j/k move, x select, Enter open, Esc clear.
 * Sort, filter, and pagination are handled by the parent via props.
 */
export function DataTable({
  columns,        // [{ key, header, render, width, numeric, sortable }]
  rows,           // array of row objects
  rowKey,         // function: row => unique key
  onRowClick,     // function: row => void
  selected,       // Set of selected row keys
  onSelectionChange,
  loading,        // bool — renders skeleton rows
  emptyState,     // ReactNode for empty state
  keyboardNav = true,
  sortable = true,
  sortKey,        // current sort column key
  sortDir,        // 'asc' | 'desc'
  onSort,         // function: (key) => void
  className,
}) {
  const [cursor, setCursor] = useState(-1);
  const tableRef = useRef(null);
  const sel = selected || new Set();

  const handleKeyDown = useCallback((e) => {
    if (!keyboardNav || rows.length === 0) return;
    const key = e.key;
    if (key === 'j' || key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, rows.length - 1));
    } else if (key === 'k' || key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (key === 'x' || key === ' ') {
      e.preventDefault();
      if (cursor >= 0 && cursor < rows.length) {
        const row = rows[cursor];
        const k = rowKey(row);
        const next = new Set(sel);
        if (next.has(k)) next.delete(k); else next.add(k);
        onSelectionChange?.(next);
      }
    } else if (key === 'Enter') {
      e.preventDefault();
      if (cursor >= 0 && cursor < rows.length) {
        onRowClick?.(rows[cursor]);
      }
    } else if (key === 'Escape') {
      e.preventDefault();
      onSelectionChange?.(new Set());
      setCursor(-1);
    }
  }, [keyboardNav, rows, cursor, sel, rowKey, onRowClick, onSelectionChange]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={tableRef} tabIndex={0} className={className}
      style={{ outline: 'none', overflow: 'auto' }}>
      <table className="i-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}
                data-numeric={col.numeric || undefined}
                style={{ width: col.width, cursor: sortable && col.sortable !== false ? 'pointer' : 'default' }}
                onClick={() => sortable && col.sortable !== false && onSort?.(col.key)}>
                {col.header}
                {sortable && sortKey === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <tr key={`skel-${i}`}>
              {columns.map((col, j) => (
                <td key={col.key}>
                  <div className="i-skel" style={{ width: j === 0 ? 70 : `${50 + (i % 3) * 10}%`, height: 12 }} />
                </td>
              ))}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '40px 20px', textAlign: 'center' }}>
                {emptyState || 'No data'}
              </td>
            </tr>
          )}
          {!loading && rows.map((row, i) => {
            const k = rowKey(row);
            const isSel = sel.has(k);
            const isCur = i === cursor;
            return (
              <tr key={k}
                data-selected={isSel || undefined}
                data-cursor={isCur || undefined}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: 'pointer' }}>
                {columns.map(col => (
                  <td key={col.key} data-numeric={col.numeric || undefined}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
