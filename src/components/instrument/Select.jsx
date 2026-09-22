import clsx from 'clsx';

export const Select = ({ className, children, options, ...props }) => (
  <select
    className={clsx('i-input', className)}
    style={{ cursor: 'pointer', appearance: 'auto' }}
    {...props}
  >
    {options
      ? options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={!opt.value && opt.label?.includes('Select')}>
            {opt.label}
          </option>
        ))
      : children}
  </select>
);
