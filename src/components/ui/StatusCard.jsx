import { GlassPanel } from '@/components/ui/GlassPanel';

const statusColors = {
  active: 'var(--f-ok)',
  warning: 'var(--f-warn)',
  danger: 'var(--f-bad)',
  info: 'var(--f-info)',
  success: 'var(--f-ok)',
  neutral: 'var(--f-text-3)',
};

export function StatusCard({ icon: Icon, label, value, status, trend, onClick, className }) {
  const color = statusColors[status] || statusColors.neutral;

  return (
    <GlassPanel
      solid
      hover={!!onClick}
      onClick={onClick}
      className={`p-4 ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          {Icon && <Icon className="w-5 h-5" style={{ color }} />}
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {trend != null && (
        <p className="text-xs mt-1" style={{ color: trend > 0 ? 'var(--f-ok)' : 'var(--f-bad)' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
        </p>
      )}
    </GlassPanel>
  );
}
