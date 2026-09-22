import { useEffect, useState } from 'react';
import { useFxRate } from '../hooks/useFxRate';

const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function DualCurrencyAmount({ usdc, className = '', compact = false }) {
  const { ghsPerUsdc, isUsable, source, remainingSeconds, refreshSeconds } = useFxRate();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const amountUsdc = Number(usdc);
  const validUsdc = Number.isFinite(amountUsdc) ? amountUsdc : 0;
  const ghs = isUsable ? validUsdc * ghsPerUsdc : null;
  const rateLabel = isUsable
    ? `1 USDC ≈ GH₵ ${money(ghsPerUsdc)}`
    : 'GHS rate unavailable';
  const freshnessLabel = isUsable ? ` · ${source} · refresh in ${remainingSeconds}s` : ` · retrying within ${refreshSeconds}s`;

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`} title={`${rateLabel}${freshnessLabel}`}>
      {isUsable && <span className={compact ? 'font-medium' : 'font-semibold'}>GH₵ {money(ghs)}</span>}
      <span className={isUsable ? 'text-[0.78em] text-[var(--text-3)]' : ''}>{money(validUsdc)} USDC</span>
    </span>
  );
}
