import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, forwardRef } from 'react';

/**
 * Virtualized list for rendering large datasets efficiently.
 * Only renders visible rows + overscan buffer.
 */
export const VirtualizedList = forwardRef(function VirtualizedList(
  { items, renderItem, estimateSize = 60, overscan = 5, className = '', style },
  ref
) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: '100%',
        overflow: 'auto',
        contain: 'strict',
        ...style,
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
});
