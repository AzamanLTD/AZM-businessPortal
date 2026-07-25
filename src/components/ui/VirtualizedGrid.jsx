import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

/**
 * Virtualized grid for card-based layouts (employees, products, etc.)
 * Renders items in a responsive grid with virtualized rows.
 */
export function VirtualizedGrid({
  items,
  renderItem,
  columnCount = 3,
  estimateRowHeight = 120,
  overscan = 3,
  className = '',
  gap = 16,
}) {
  const parentRef = useRef(null);
  const rowCount = Math.ceil(items.length / columnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight + gap,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ height: '100%', overflow: 'auto', contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columnCount;
          const rowItems = items.slice(start, start + columnCount);
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              {rowItems.map((item, colIndex) =>
                item ? renderItem(item, start + colIndex) : <div key={colIndex} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
