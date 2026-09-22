export function Avatar({ name, size = 32, src }) {
  const initial = name?.[0] || '?';
  return src ? (
    <img src={src} alt={name || ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: size * 0.4,
    }}>{initial}</div>
  );
}
