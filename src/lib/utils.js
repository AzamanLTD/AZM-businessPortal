import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function fmt(amount, decimals = 2) {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtUSDC(amount) {
  return `$${fmt(amount, 2)}`;
}

export function fmtCompact(amount) {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function relativeTime(ts) {
  if (!ts) return null;
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const ORDER_STATUS_META = {
  AWAITING_PAYMENT: { label: 'Awaiting Payment', color: '#f59e0b', bg: '#f59e0b1a' },
  PAID:             { label: 'Paid',              color: '#4f8ef7', bg: '#4f8ef71a' },
  DELIVERED:        { label: 'Delivered',         color: '#a78bfa', bg: '#a78bfa1a' },
  COMPLETED:        { label: 'Completed',         color: '#00d97e', bg: '#00d97e1a' },
  DISPUTED:         { label: 'Disputed',          color: '#f43f5e', bg: '#f43f5e1a' },
  REFUNDED:         { label: 'Refunded',          color: '#7b7b9a', bg: '#7b7b9a1a' },
  CANCELLED:        { label: 'Cancelled',         color: '#4a4a6a', bg: '#4a4a6a1a' },
};

export const KYB_STATUS_META = {
  UNVERIFIED: { label: 'Not Started',   color: '#4a4a6a', bg: '#4a4a6a1a' },
  PENDING:    { label: 'Under Review',  color: '#f59e0b', bg: '#f59e0b1a' },
  VERIFIED:   { label: 'Verified',      color: '#00d97e', bg: '#00d97e1a' },
  REJECTED:   { label: 'Rejected',      color: '#f43f5e', bg: '#f43f5e1a' },
};
