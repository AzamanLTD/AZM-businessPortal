import clsx from 'clsx';

export const Select = ({ className, children, ...props }) => (
  <select
    className={clsx('i-input', className)}
    style={{ cursor: 'pointer', appearance: 'auto' }}
    {...props}
  >
    {children}
  </select>
);
