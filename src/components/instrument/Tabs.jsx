/**
 * Tabs — simple inline tab bar for Instrument.
 * Supports both options prop and children-based usage.
 */
export function Tabs({ value, onValueChange, options, children }) {
  if (options) {
    return (
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onValueChange?.(opt.value)}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 0, background: 'transparent',
              color: value === opt.value ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: value === opt.value ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.12s', marginBottom: -1,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)' }}>
      {children}
    </div>
  );
}
