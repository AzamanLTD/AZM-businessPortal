import { cn } from '@/lib/utils';

export function GlassPanel({ children, className, as: Component = 'div', solid = false, hover = false, ...props }) {
  return (
    <Component
      className={cn(
        'rounded-lg border transition-all duration-200',
        solid
          ? 'bg-surface-raised border-line shadow-sm'
          : 'bg-surface backdrop-blur-sm border-line shadow-sm',
        hover && 'hover:shadow-sm-hover hover:border-line-strong',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
