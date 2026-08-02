import clsx from 'clsx';

export function Tag({ tone = 'neutral', live = false, children, className }) {
  return (
    <span className={clsx('i-tag', `i-tag--${tone}`, live && 'i-tag--live', className)}>
      <i />
      {children}
    </span>
  );
}
