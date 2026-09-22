import { m } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1];

export function StatCard({ label, value, delta, tone = 'neutral', icon: Icon, loading }) {
  const color = tone === 'go' ? 'var(--go)' : tone === 'stop' ? 'var(--stop)' : tone === 'hold' ? 'var(--hold)' : 'var(--accent)';
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      style={{
        padding: '16px',
        borderRadius: 'var(--r3)',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {Icon && <Icon style={{ width: 16, height: 16, color: 'var(--text-3)' }} />}
      </div>
      {loading ? (
        <div style={{ height: 24, width: 60, borderRadius: 4, background: 'var(--surface-sunk)' }} />
      ) : (
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{value}</span>
      )}
      {delta != null && (
        <span style={{ fontSize: 11, fontWeight: 600, color: delta >= 0 ? 'var(--go)' : 'var(--stop)' }}>
          {delta >= 0 ? '+' : ''}{delta}%
        </span>
      )}
    </m.div>
  );
}
