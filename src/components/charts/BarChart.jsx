import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function BarChartCard({ title, data, xKey, bars = [{ key, label, color }], height = 240, formatY, layout = 'horizontal' }) {
  const gridColor = 'var(--f-line)';
  const axisColor = 'var(--f-text-3)';

  return (
    <div className="bg-surface border border-line rounded-lg shadow-sm p-6">
      {title && <h3 className="text-sm font-bold text-ink mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={data} layout={layout} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.4} vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey={xKey} stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatY} width={60} />
            </>
          ) : (
            <>
              <XAxis type="number" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatY} />
              <YAxis type="category" dataKey={xKey} stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} width={100} />
            </>
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)', borderRadius: '6px',
              fontSize: '12px', color: 'var(--f-text)',
            }}
          />
          {bars.map(bar => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color || 'var(--f-tint-color)'} radius={[6, 6, 0, 0]} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
