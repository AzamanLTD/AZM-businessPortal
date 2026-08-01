// Barrel — pages import only from here
export { Button } from './Button';
export { Kbd } from './Kbd';
export { Tag, STATUS } from './Tag';
export { Field, Input, Textarea } from './Field';
export { Card, CardHead, CardTitle, CardBody } from './Card';
export { Segmented } from './Segmented';
export { PageHeader } from './PageHeader';
export { Tooltip, TooltipProvider } from './Tooltip';
export { Skel, TableSkeleton, KpiSkeleton } from './Skeleton';
export { EmptyState } from './EmptyState';
export { DataTable } from './DataTable';
export { KpiCard, Sparkline } from './KpiCard';
export { Modal } from './Modal';
export { ConfirmDestructive } from './ConfirmDestructive';
export { Shell } from './Shell';
export { CommandPalette } from './CommandPalette';
export { ToastProvider, useToast, notify } from './toast';
export * from './chartTheme';
export { ForgeLayout } from './ForgeLayout';

// ── Backward-compatible re-exports for legacy @/components/ui imports ──
// These keep existing pages working during migration. Removed in Phase 8.
export { Badge } from './Tag';  // Badge = Tag alias
export { Skeleton } from './Skeleton';  // Skeleton = Skel alias
export { Empty } from './EmptyState';  // Empty = EmptyState alias
export { Spinner } from './Skeleton';  // Spinner = Skel alias
export { Progress } from './Progress';
export { Avatar } from './Avatar';
export { Tabs } from './Tabs';
