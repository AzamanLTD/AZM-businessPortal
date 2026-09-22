import clsx from 'clsx';

export function Card({ raised, flush, className, children, ...props }) {
  return (
    <div className={clsx('i-card', raised && 'i-card--raised', flush && 'i-card--flush', className)} {...props}>
      {children}
    </div>
  );
}
export function CardHead({ className, children, ...props }) {
  return <div className={clsx('i-card__head', className)} {...props}>{children}</div>;
}
export function CardBody({ className, children, ...props }) {
  return <div className={clsx('i-card__body', className)} {...props}>{children}</div>;
}
export function Well({ className, children, ...props }) {
  return <div className={clsx('i-well', className)} {...props}>{children}</div>;
}
export function Divider({ vertical, className }) {
  return (
    <div className={className} style={vertical
      ? { width: 1, alignSelf: 'stretch', background: 'var(--line)' }
      : { height: 1, background: 'var(--line)' }} />
  );
}
