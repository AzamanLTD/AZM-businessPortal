import { useMemo } from 'react';

export function Spark({ data, w = 88, h = 22, style }) {
  const d = useMemo(() => {
    const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
    const step = w / (data.length - 1);
    return data.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(2)},${(h - ((v - min) / r) * (h - 2) - 1).toFixed(2)}`).join(' ');
  }, [data, w, h]);
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} style={style} aria-hidden>
      <path d={d} fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
            stroke={up ? 'var(--go)' : 'var(--stop)'} vectorEffect="non-scaling-stroke" />
      <circle r="1.8" cx={w}
              cy={h - ((data.at(-1) - Math.min(...data)) / ((Math.max(...data) - Math.min(...data)) || 1)) * (h - 2) - 1}
              fill={up ? 'var(--go)' : 'var(--stop)'} />
    </svg>
  );
}
