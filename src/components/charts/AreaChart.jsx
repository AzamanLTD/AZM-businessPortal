import { ResponsiveContainer, AreaChart as RAreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function AreaChartCard({ title, data, xKey, yKey, color = 'var(--f-tint-color)', height = 240, formatY }) {
  const gridColor = 'var(--f-line)';
  const axisColor = 'var(--f-text-3)';

  return (
    <div className="bg-surface border border-line rounded-lg shadow-sm p-6">
      {title && <h3 className="text-sm font-bold text-ink mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.4} vertical={false} />
          <XAxis dataKey={xKey} stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatY} width={60} />
          <Tooltip
            contentStyle={{
              background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)', borderRadius: '6px',
              fontSize: '12px', color: 'var(--f-text)',
            }}
            labelStyle={{ color: 'var(--f-text-3)' }}
          />
          <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#grad-${yKey})`} />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
