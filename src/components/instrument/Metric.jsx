import { useState, useEffect } from 'react';
import NumberFlow from '@number-flow/react';
import { Spark } from './Sparkline';
import { ArrowUpRight } from 'lucide-react';

export function Metric({ label, value, unit, delta, series, precision, loading }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (loading) {
    return (
      <div className="i-card" style={{ padding: 12 }}>
        <div className="i-skel" style={{ width: '60%', height: 12 }} />
        <div className="i-skel" style={{ width: '45%', height: 28, marginTop: 10 }} />
        <div className="i-skel" style={{ width: '30%', height: 16, marginTop: 10 }} />
      </div>
    );
  }
  return (
    <div className="i-card" style={{ padding: 12 }}>
      <div className="i-eyebrow">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span className="i-num i-num--metric">
          <NumberFlow value={value} isolate={!hasMounted}
            format={{ maximumFractionDigits: precision, minimumFractionDigits: precision }} />
        </span>
        {unit && <span className="i-num i-num__minor" style={{ fontSize: 11 }}>{unit}</span>}
      </div>
      {(delta != null || series) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {delta != null && (
            <span className={`i-tag ${delta >= 0 ? 'i-tag--go' : 'i-tag--stop'}`}>
              <ArrowUpRight size={10} style={{ transform: delta >= 0 ? 'none' : 'scaleY(-1)' }} />
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {series && <Spark data={series} style={{ marginLeft: 'auto' }} />}
        </div>
      )}
    </div>
  );
}
