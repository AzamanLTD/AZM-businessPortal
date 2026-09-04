import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedNumber } from '@/components/instrument';
import { useFxRate } from '@/hooks/useFxRate';

export function KpiCard({ label, value, delta, deltaType = 'positive', sparkData, icon: Icon, color = 'var(--f-tint-color)', loading }) {
  const fx = useFxRate();

  if (loading) {
    return <div className="rounded-2xl border border-line h-32 animate-pulse bg-surface-sunken" />;
  }

  const DeltaIcon = deltaType === 'positive' ? TrendingUp : TrendingDown;
  const isPositive = deltaType === 'positive';
  const deltaBgClass = isPositive ? 'bg-ok-subtle' : 'bg-bad-subtle';
  const deltaTextClass = isPositive ? 'text-ok' : 'text-bad';

  // Format value to extract numbers if possible for AnimatedNumber.
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const hasNumber = !isNaN(numericValue) && numericValue !== null;
  const stringSuffix = typeof value === 'string' ? value.replace(/[0-9.,-]/g, '').trim() : '';
  const stringPrefix = typeof value === 'string' ? value.split(/[0-9]/)[0] : '';
  const isDollarAmount = typeof value === 'string' && value.trim().startsWith('$') && Number.isFinite(Number(numericValue));
  const ghsEquivalent = isDollarAmount && fx.isUsable
    ? Number(numericValue) * Number(fx.ghsPerUsdc)
    : null;

  return (
    <div className="bg-[var(--f-surface)] border border-line rounded-2xl shadow-sm p-6 flex flex-col justify-between transition-all duration-200">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-ink-3 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-ink">
              {AnimatedNumber && hasNumber ? (
                <>
                  {stringPrefix}
                  <AnimatedNumber value={numericValue} format={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                  {stringSuffix && ` ${stringSuffix}`}
                </>
              ) : (
                value
              )}
            </p>
            {isDollarAmount && (
              <p
                className="text-xs text-ink-3 mt-1"
                title={fx.isUsable ? `Current indicative rate: 1 USDC ≈ GH₵ ${Number(fx.ghsPerUsdc).toFixed(2)} · ${fx.source}` : 'Live GHS rate temporarily unavailable'}
              >
                {ghsEquivalent != null
                  ? `≈ GH₵ ${ghsEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · GHS current equivalent`
                  : 'GHS equivalent unavailable'}
              </p>
            )}
          </div>
          {Icon && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-surface-sunken border border-line-strong">
              <Icon className="w-5 h-5 text-tint" />
            </div>
          )}
        </div>
      </div>
      {delta && (
        <div className="flex items-center gap-1.5 text-xs mt-2">
          <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-az-pill font-semibold", deltaBgClass, deltaTextClass)}>
            <DeltaIcon className="w-3 h-3" />
            <span>{delta}</span>
          </div>
          <span className="text-ink-3">vs last period</span>
        </div>
      )}
    </div>
  );
}
