/**
 * DataTable — Sentry-style data-dense table.
 * Features: sortable columns, status badges, hover states, empty/loading states.
 * Sentry tenet: placeholders not spinners for known-height rows.
 */
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Skeleton } from './index';

export function DataTable({
  columns = [],
  data = [],
  loading,
  emptyMessage = 'No data yet',
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
  pageSize = 10,
  onRowClick,
  rowKey = 'id',
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    const col = columns.find(c => c.key === sortCol);
    if (!col?.sortValue) return data;
    const sorted = [...data].sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] flex items-center justify-center mb-3">
          <EmptyIcon className="w-5 h-5 text-[var(--f-text-3)]" />
        </div>
        <p className="text-sm text-[var(--f-text-3)] font-medium">{emptyMessage}</p>
        {emptyDescription && <p className="text-xs text-[var(--f-text-3)] mt-1 max-w-xs">{emptyDescription}</p>}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--f-line)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left py-2.5 px-3 text-[11px] font-bold text-[var(--f-text-3)] uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer hover:text-[var(--f-text-3)] transition-colors select-none',
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortCol === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={row[rowKey] || i}
                className={cn(
                  'border-b border-[var(--f-surface)] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--f-ink-900)]'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className={cn('py-3 px-3 text-xs text-[var(--f-text)]', col.className)}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-[var(--f-line)]">
          <span className="text-[11px] text-[var(--f-text-3)]">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-1 rounded-lg text-[var(--f-text-3)] hover:bg-[var(--f-line)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-[var(--f-text-3)] font-medium px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded-lg text-[var(--f-text-3)] hover:bg-[var(--f-line)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
