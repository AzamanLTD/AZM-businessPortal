// src/components/forge/VirtualizedGrid.jsx
// Simple grid wrapper — renders all items in a CSS grid
export function VirtualizedGrid({ items, columnCount = 3, estimateRowHeight = 200, gap = 16, renderItem }) {
  return (
    <div
      className="h-full overflow-auto"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: `${gap}px`,
        padding: `${gap}px`,
      }}
    >
      {items?.map((item, i) => renderItem(item, i))}
    </div>
  );
}
