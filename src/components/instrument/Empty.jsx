import clsx from 'clsx';

export function Empty({ title, body, action, className }) {
  return (
    <div className={clsx('i-empty', className)} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', gap: 8, textAlign: 'center',
    }}>
      <div style={{ font: '600 var(--t-md)/1.4 var(--font)', color: 'var(--text-2)' }}>{title}</div>
      {body && <div style={{ font: '400 var(--t-sm)/1.5 var(--font)', color: 'var(--text-3)', maxWidth: 320 }}>{body}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
