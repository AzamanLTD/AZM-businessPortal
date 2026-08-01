import { cn } from '@/lib/utils';

export function Progress({ value, max = 100, color = 'var(--f-tint-color)', trackColor = 'var(--f-line)', className, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  return (
    <div className={cn('w-full rounded-full overflow-hidden', heights[size], className)} style={{ background: trackColor }}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function ProgressRing({ value, max = 100, size = 60, stroke = 6, color = 'var(--f-tint-color)', label }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - pct * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--f-line)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xs font-bold text-[var(--f-text)]">
        {label || `${Math.round(pct * 100)}%`}
      </span>
    </div>
  );
}
