// src/components/forge/Switch.jsx
// Forge Switch — accessible toggle without Radix dependency
import { useId } from 'react';

export function Switch({ checked, onCheckedChange, disabled, className = '', id }) {
  const autoId = useId();
  const switchId = id || autoId;
  return (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-line-strong'} ${className}`}
    >
      <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}
