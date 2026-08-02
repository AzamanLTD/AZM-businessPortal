import clsx from 'clsx';

export const Textarea = ({ className, ...props }) => (
  <textarea className={clsx('i-input', className)} style={{ resize: 'vertical', minHeight: 60 }} {...props} />
);
