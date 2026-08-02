import { useEffect, useRef, useState } from 'react';

export function AnimatedNumber({ value, format, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    const start = display;
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = format ? format(display) : display.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return <>{formatted}</>;
}
