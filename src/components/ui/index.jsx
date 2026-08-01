// Migration shim — re-exports from @/components/forge
// This file will be deleted in the final purge once all pages import directly from forge.
export { Badge, Tag } from '@/components/forge';
export { Button } from '@/components/forge';
export { Card } from '@/components/forge';
export { Modal } from '@/components/forge';
export { Field as Input } from '@/components/forge';
export { Field as Textarea } from '@/components/forge';
export { Skel as Skeleton } from '@/components/forge';
export { Skel as Spinner } from '@/components/forge';
export { EmptyState as Empty } from '@/components/forge';
export { KpiCard as StatCard } from '@/components/forge';
export { Card as GlassPanel } from '@/components/forge';
export { DataTable } from '@/components/forge';
export { Segmented as Tabs } from '@/components/forge';
export { Progress } from '@/components/forge';
export { Avatar } from '@/components/forge';
export { Tooltip, TooltipProvider } from '@/components/forge';
export { ToastProvider, useToast } from '@/components/forge';

// Components that don't have forge equivalents yet — keep local
export { AnimatedNumber } from './AnimatedNumber';
export { default as VirtualizedList } from './VirtualizedList';
export { Switch } from './Switch';
export { Sheet } from './Sheet';
export { ProductTour, shouldShowTour } from './ProductTour';
export { GlobalFilter } from './GlobalFilter';
export { default as Select } from './Select';
export { DropdownMenu } from './DropdownMenu';
export { Separator } from './Separator';
export { default as DatePicker } from './DatePicker';
export { default as Command } from './Command';
export { default as VirtualizedGrid } from './VirtualizedGrid';
export { OnboardingChecklist } from './OnboardingChecklist';
