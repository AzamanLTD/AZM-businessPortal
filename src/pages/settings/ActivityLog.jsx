// src/pages/settings/ActivityLog.jsx
// =============================================================================
// Settings → Activity Log
//
// Reverse-chronological feed of business-scoped audit entries, filterable
// by actor, action type, and date range. Shows plain-English descriptions.
// =============================================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessOS } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Button, Input, Badge, Select } from '@/components/ui';
import { History, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_LABELS = {
  BUSINESS_PAUSED: 'Paused business operations',
  BUSINESS_UNPAUSED: 'Resumed business operations',
  EMPLOYEE_TERMINATED: 'Terminated an employee',
  EMPLOYEE_CREATED: 'Added a new employee',
  EMPLOYEE_UPDATED: 'Updated an employee',
  PERMISSION_CHANGED: 'Changed employee permissions',
  SETTINGS_UPDATED: 'Updated business settings',
  INVOICE_VOIDED: 'Voided an invoice',
  INVOICE_SENT: 'Sent an invoice',
  RESERVATION_CANCELLED: 'Cancelled a reservation',
  RESERVATION_OVERRIDE: 'Overrode a reservation price',
  PAYROLL_DISBURSED: 'Disbursed payroll',
  PAYROLL_PROCESSED: 'Processed payroll',
  PAYOUT_DESTINATION_CHANGED: 'Changed payout destination',
  LOCATION_CREATED: 'Added a location',
  LOCATION_UPDATED: 'Updated a location',
  LOCATION_DEACTIVATED: 'Deactivated a location',
  ORDER_REFUNDED: 'Issued a refund',
  PROMOTION_PUBLISHED: 'Published a promotion',
  AD_PUBLISHED: 'Published an ad',
  REVIEW_RESPONDED: 'Responded to a review',
  SHIFT_PUBLISHED: 'Published a shift schedule',
  EWA_APPROVED: 'Approved EWA request',
  KYB_SUBMITTED: 'Submitted KYB documents',
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export default function ActivityLog() {
  const { bizProfile } = useAuth();
  const { hasPermission } = usePermission();
  const canView = hasPermission('audit.view');

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ actorId: '', action: '', startDate: '', endDate: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, filters],
    queryFn: () => businessOS.getAuditLog({ page, limit: 25, ...filters }),
    enabled: !!bizProfile && canView,
  });

  const entries = data?.entries || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
        <h3 className="font-semibold text-[var(--f-text)]">No Access</h3>
        <p className="text-sm text-[var(--f-text-3)] mt-1">
          You don't have permission to view the activity log.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6 text-[var(--f-tint-color)]" />
        <div>
          <h2 className="text-lg font-bold text-[var(--f-text)]">Activity Log</h2>
          <p className="text-sm text-[var(--f-text-3)]">
            Every important action in your business, logged for accountability.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-[var(--f-text)]">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Actor ID"
            placeholder="Filter by user ID"
            value={filters.actorId}
            onChange={e => { setFilters({ ...filters, actorId: e.target.value }); setPage(1); }}
          />
          <Input
            label="Action contains"
            placeholder="e.g. EMPLOYEE"
            value={filters.action}
            onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
          />
          <Input
            type="date"
            label="From"
            value={filters.startDate}
            onChange={e => { setFilters({ ...filters, startDate: e.target.value }); setPage(1); }}
          />
          <Input
            type="date"
            label="To"
            value={filters.endDate}
            onChange={e => { setFilters({ ...filters, endDate: e.target.value }); setPage(1); }}
          />
        </div>
      </Card>

      {/* Log entries */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[var(--f-text-3)]">
          <div className="w-6 h-6 border-2 border-[var(--f-line)] border-t-[var(--f-tint-color)] rounded-full animate-spin mr-3" />
          Loading activity log...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
          <h3 className="font-semibold text-[var(--f-text)]">No Activity Yet</h3>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Actions like terminating employees, voiding invoices, or changing settings will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-[var(--f-text)]">
                  {entry.actorName || 'System'}
                </span>
                <Badge className="text-xs">
                  {ACTION_LABELS[entry.action] || entry.action}
                </Badge>
                <span className="text-xs text-[var(--f-text-3)] ml-auto">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
              {entry.metadata && (
                <div className="mt-2 text-xs text-[var(--f-text-3)]">
                  {Object.entries(entry.metadata)
                    .filter(([k]) => k !== '_bizAudit' && k !== 'businessProfileId')
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <span className="opacity-60">{k}:</span> {String(v).slice(0, 60)}
                      </span>
                    ))}
                </div>
              )}
              <div className="mt-1 text-xs text-[var(--f-text-3)] opacity-60">
                {entry.targetType} → {entry.targetId?.slice(0, 8)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--f-text-3)]">
            Page {pagination.page} of {pagination.pages} ({pagination.total} entries)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
