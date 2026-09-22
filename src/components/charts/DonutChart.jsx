import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export function DonutChartCard({ title, data, height = 240, colors = ['var(--f-tint-color)', 'var(--f-ok)', 'var(--f-warn)', 'var(--f-info)'] }) {
  return (
    <div className="bg-surface border border-line rounded-lg shadow-sm p-6">
      {title && <h3 className="text-sm font-bold text-ink mb-4">{title}</h3>}
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--f-surface-raised)', border: '1px solid var(--f-line)', borderRadius: '6px',
                fontSize: '12px', color: 'var(--f-text)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span className="text-ink-2 flex-1">{item.name}</span>
              <span className="text-ink font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
