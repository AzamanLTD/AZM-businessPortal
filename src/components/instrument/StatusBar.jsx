import { useEffect, useState } from 'react';

export function StatusBar({ connection = 'live', operator, shiftDuration }) {
  const [syncTime, setSyncTime] = useState('0.4s');
  const toneMap = { live: 'var(--go)', reconnecting: 'var(--hold)', offline: 'var(--stop)' };
  const labelMap = { live: 'LIVE', reconnecting: 'RECONNECTING', offline: 'OFFLINE' };

  useEffect(() => {
    if (connection === 'live') {
      setSyncTime(`${(0.3 + Math.random() * 0.3).toFixed(1)}s`);
    }
  }, [connection]);

  return (
    <div className="i-statusbar">
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="i-statusbar__dot"
          data-flux={connection === 'reconnecting' || undefined}
          style={{ background: toneMap[connection] }} />
        {labelMap[connection]}
      </span>
      <span>SYNC {connection === 'live' ? syncTime : '—'}</span>
      {operator && <span>SHIFT · {operator} · {shiftDuration || ''}</span>}
      <span style={{ marginLeft: 'auto' }}>j/k move · x select · ⌘K</span>
    </div>
  );
}
