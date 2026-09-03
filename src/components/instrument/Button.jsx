import { forwardRef, useState, useEffect } from 'react';
import { m } from 'motion/react';
import clsx from 'clsx';

const VARIANT = {
  default: '', primary: 'i-btn--primary', ghost: 'i-btn--ghost',
  outline: 'i-btn--outline', danger: 'i-btn--danger',
};
const SIZE = { xs: 'i-btn--xs', sm: 'i-btn--sm', md: '', lg: 'i-btn--lg' };

const Button = forwardRef(function Button(
  { variant = 'default', size = 'md', icon: Icon, iconOnly = false, busy = false,
    kbd, children, className, disabled = false, ...props },
  ref
) {
  const isDisabled = disabled || busy;

  return (
    <button
      ref={ref}
      className={clsx('i-btn', VARIANT[variant], SIZE[size], iconOnly && 'i-btn--icon', className)}
      data-busy={busy || undefined}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {Icon && <Icon size={size === 'xs' ? 12 : 14} strokeWidth={2} />}
      {!iconOnly && children}
      {kbd && <span className="i-kbd">{kbd}</span>}
    </button>
  );
});

export default Button;

export function BusyLabel({ idle, busy, done }) {
  const [label, setLabel] = useState(done || idle);
  useEffect(() => {
    if (done) {
      setLabel(done);
      const t = setTimeout(() => setLabel(idle), 1400);
      return () => clearTimeout(t);
    }
    setLabel(busy || idle);
  }, [done, busy, idle]);
  return (
    <m.span
      key={label}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -3 }}
      transition={{ duration: 0.12 }}
    >
      {label}
    </m.span>
  );
}
