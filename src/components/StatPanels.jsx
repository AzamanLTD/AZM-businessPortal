// Small stat panels for console pages (Check-in): a titled card with one or
// more stats, and a label/value row for short lists. Check-in rendered
// <KpiCard>, <KpiCardStat> and <KpiCardRow> without defining or importing
// them, so the page crashed on load (Reservations defines its own copies).
import { Card } from '@/components/instrument';

export function KpiCard({ title, icon: Icon, iconColor, children }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4" style={{ color: iconColor }} />}
        <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wide">{title}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </Card>
  );
}

export function KpiCardStat({ value, label, color }) {
  return (
    <div>
      <span className="text-2xl font-bold text-[var(--text)]" style={color ? { color } : undefined}>{value}</span>
      {label && <p className="text-xs text-[var(--text-3)]">{label}</p>}
    </div>
  );
}

export function KpiCardRow({ label, value, badge }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--line)] last:border-0">
      <span className="text-sm font-medium text-[var(--text)] truncate">{label}</span>
      <span className="flex items-center gap-2 text-xs text-[var(--text-3)] flex-shrink-0">
        {badge}
        {value}
      </span>
    </div>
  );
}
