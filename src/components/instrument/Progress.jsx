export function Progress({ value = 0, max = 100, height = 4, tone = 'accent' }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = tone === 'go' ? 'var(--go)' : tone === 'stop' ? 'var(--stop)' : tone === 'hold' ? 'var(--hold)' : 'var(--accent)';
  return (
    <div style={{ width: '100%', height, borderRadius: height, background: 'var(--surface-sunk)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: height, background: color, transition: 'width 0.3s ease' }} />
    </div>
  );
}
