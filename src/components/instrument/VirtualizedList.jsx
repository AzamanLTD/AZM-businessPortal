/**
 * VirtualizedList — placeholder for now.
 * Renders children without virtualization (compatibility shim).
 * Can be replaced with a real virtualization library later.
 */
export function VirtualizedList({ items, itemHeight = 48, renderItem, height = 400 }) {
  return (
    <div style={{ height, overflowY: 'auto' }}>
      {items.map((item, i) => renderItem({ item, index: i }))}
    </div>
  );
}
