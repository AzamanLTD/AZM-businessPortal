// src/components/forge/AnimatedNumber.jsx
// Simple count-up animation for numeric values
import { useEffect, useRef, useState } from 'react';

export function AnimatedNumber({ value, format, formatter, duration = 600, className = '' }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef();
  const startRef = useRef();

  useEffect(() => {
    const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
    if (numeric === display) return;

    const start = display;
    const diff = numeric - start;
    startRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(start + diff * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(numeric);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = format || formatter || ((n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 }));
  return <span className={className}>{fmt(display)}</span>;
}
