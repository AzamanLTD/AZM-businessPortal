// src/components/forge/ScrollArea.jsx
// Forge ScrollArea — CSS-based scroll container
export function ScrollArea({ children, className = '', ...props }) {
  return (
    <div className={`overflow-auto ${className}`} {...props}>
      {children}
    </div>
  );
}

export function ScrollBar({ className = '' }) {
  return <div className={`${className}`} />;
}
