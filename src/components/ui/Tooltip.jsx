import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({ content, children, side = 'top', className }) {
  const [show, setShow] = useState(false);
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && content && (
        <div className={cn(
          'absolute z-50 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap pointer-events-none',
          'bg-[var(--f-surface)] border border-[var(--f-line)] text-[var(--f-text-3)] shadow-xl',
          'animate-scale-in',
          positions[side],
          className
        )}>
          {content}
        </div>
      )}
    </div>
  );
}
