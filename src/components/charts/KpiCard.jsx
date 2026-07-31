import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export function KpiCard({ label, value, delta, deltaType = 'positive', sparkData, icon: Icon, color = 'var(--az-accent)', loading }) {
  if (loading) {
    return <div className="rounded-2xl border border-az-border h-32 animate-pulse bg-az-bg-alt" />;
  }

  const DeltaIcon = deltaType === 'positive' ? TrendingUp : TrendingDown;
  const isPositive = deltaType === 'positive';
  const deltaBgClass = isPositive ? 'bg-az-success-subtle' : 'bg-az-danger-subtle';
  const deltaTextClass = isPositive ? 'text-az-success' : 'text-az-danger';

  // Format value to extract numbers if possible for AnimatedNumber
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const hasNumber = !isNaN(numericValue) && numericValue !== null;
  const stringSuffix = typeof value === 'string' ? value.replace(/[0-9.,-]/g, '').trim() : '';
  const stringPrefix = typeof value === 'string' ? value.split(/[0-9]/)[0] : '';

  return (
    <div className="bg-[var(--az-surface-1)] border border-az-border rounded-2xl shadow-az-card p-6 flex flex-col justify-between transition-all duration-200">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-az-text-muted text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-az-text">
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
          </div>
          {Icon && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-az-accent-subtle border border-az-accent-border">
              <Icon className="w-5 h-5 text-az-accent" />
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
          <span className="text-az-text-muted">vs last period</span>
        </div>
      )}
    </div>
  );
}
