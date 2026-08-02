import { useState, useEffect } from 'react';
import NumberFlow from '@number-flow/react';

export function Money({ usdc, minor = false, className }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <span className={`i-num ${minor ? 'i-num__minor' : ''} ${className || ''}`}>
      <NumberFlow value={usdc} isolate={!hasMounted}
        format={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }} />
      <span className="i-num__minor" style={{ marginLeft: 3, fontSize: '0.8em' }}>USDC</span>
    </span>
  );
}
