import { cn } from '@/lib/utils';

export function Separator({ orientation = 'horizontal', className }) {
  return (
    <div
      className={cn(
        orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
        'bg-[var(--f-line)]',
        className
      )}
    />
  );
}
