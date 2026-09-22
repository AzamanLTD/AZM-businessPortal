export function VirtualizedGrid({ items, renderItem, columns = 3, gap = 12 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
    }}>
      {items.map((item, i) => renderItem({ item, index: i }))}
    </div>
  );
}
