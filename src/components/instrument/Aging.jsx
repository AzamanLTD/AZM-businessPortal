import { useState, useEffect } from 'react';

/**
 * INSTRUMENT AgingClock — §6.1
 * One countdown, five uses: KDS ticket age, hotel arrival-window, fleet trip ETA,
 * finance settlement SLA, support/dispute response-time SLA.
 */
export function AgingClock({ createdAt, slaMs, label, showBar = true, className }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - createdAt;
  const age = Math.min(elapsed / slaMs, 1);
  const remaining = Math.max(slaMs - elapsed, 0);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className={`i-age ${className || ''}`} style={{ '--age': age }}>
      {label && <div className="i-eyebrow" style={{ fontSize: 10 }}>{label}</div>}
      <div className="i-num" style={{ fontSize: 13, color: 'var(--age-col)' }}>
        {remaining > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : 'OVERDUE'}
      </div>
      {showBar && (
        <div className="i-age__bar"><span /></div>
      )}
    </div>
  );
}
