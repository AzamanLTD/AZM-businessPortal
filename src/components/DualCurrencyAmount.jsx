import { useEffect, useState } from 'react';
import { useFxRate } from '../hooks/useFxRate';

const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function DualCurrencyAmount({ usdc, className = '', compact = false }) {
  const { ghsPerUsdc, isUsable, source, remainingSeconds } = useFxRate();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const seconds = Math.max(0, remainingSeconds - Math.floor((now - now) / 1000));
  const amountUsdc = Number(usdc);
  const validUsdc = Number.isFinite(amountUsdc) ? amountUsdc : 0;
  const ghs = isUsable ? validUsdc * ghsPerUsdc : null;

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`} title={isUsable ? `1 USDC ≈ GH₵ ${money(ghsPerUsdc)} · ${source} · refresh in ${seconds}s` : 'Live GHS rate unavailable; USDC remains the settlement amount.'}>
      {isUsable && <span className={compact ? 'font-medium' : 'font-semibold'}>GH₵ {money(ghs)}</span>}
      <span className={isUsable ? 'text-[0.78em] text-[var(--text-3)]' : ''}>{money(validUsdc)} USDC</span>
    </span>
  );
}
