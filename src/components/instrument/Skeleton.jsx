export function Skel({ w, h, className, style }) {
  return <div className={`i-skel ${className || ''}`} style={{ width: w, height: h, ...style }} />;
}
export function SkelRow({ cols = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '8px 10px', alignItems: 'center' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skel key={i} h={12} w={i === 0 ? 70 : `${60 - i * 6}%`} />
      ))}
    </div>
  );
}
