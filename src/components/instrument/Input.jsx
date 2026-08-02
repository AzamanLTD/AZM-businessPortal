import clsx from 'clsx';

export const Input = ({ className, icon: Icon, ...props }) => (
  <input
    className={clsx('i-input', className)}
    style={Icon ? { paddingLeft: 32 } : undefined}
    {...props}
  />
);
