export function Spinner({ size = 16, color = 'var(--accent)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${size / 6}px solid var(--line)`,
      borderTopColor: color,
      animation: 'spin 0.6s linear infinite',
    }} />
  );
}
