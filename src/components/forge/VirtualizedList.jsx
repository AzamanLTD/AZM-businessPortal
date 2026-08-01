// src/components/forge/VirtualizedList.jsx
// Simple list wrapper — renders all items (no windowing needed for small datasets)
export function VirtualizedList({ items = [], estimateSize = 60, overscan = 0, renderItem, className = '' }) {
  return (
    <div className={`overflow-auto ${className}`}>
      {items?.map((item, i) => renderItem(item, i))}
    </div>
  );
}
