// src/pages/settings/NotificationPrefs.jsx
// =============================================================================
// Settings → Notification Preferences
//
// Per-channel (portal, email) toggles per event type.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessOS } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Switch, Button } from '@/components/instrument';
import { Bell, Save, BellRing } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { key: 'new_order',         label: 'New Order',          desc: 'When a customer places an order' },
  { key: 'low_inventory',     label: 'Low Inventory',       desc: 'Stock falls below minimum threshold' },
  { key: 'shift_no_show',     label: 'Shift No-Show',       desc: 'An employee fails to show up for a shift' },
  { key: 'negative_review',   label: 'Negative Review',     desc: 'A customer leaves a 1-2 star review' },
  { key: 'kyb_status_change', label: 'KYB Status Change',    desc: 'Verification status updated' },
  { key: 'large_transaction', label: 'Large Transaction',    desc: 'Transaction exceeds your set threshold' },
  { key: 'payroll_due',       label: 'Payroll Due',          desc: 'Payroll run is approaching its due date' },
  { key: 'maintenance_due',   label: 'Maintenance Due',       desc: 'Vehicle or equipment maintenance is overdue' },
];

export default function NotificationPrefs() {
  const { bizProfile } = useAuth();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('settings.manage');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: businessOS.getNotificationPrefs,
    enabled: !!bizProfile,
  });

  const prefs = data?.preferences || {};

  const updateMutation = useMutation({
    mutationFn: (preferences) => businessOS.updateNotificationPrefs(preferences),
    onSuccess: () => {
      toast.success('Notification preferences saved');
      qc.invalidateQueries(['notification-prefs']);
    },
    onError: (e) => toast.error('Failed to save: ' + e.message),
  });

  const toggleChannel = (eventType, channel) => {
    const current = prefs[eventType] || { portal: true, email: false };
    const updated = { ...prefs, [eventType]: { ...current, [channel]: !current[channel] } };
    // Optimistically update — the mutation will confirm
    updateMutation.mutate(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-[var(--f-tint-color)]" />
        <div>
          <h2 className="text-lg font-bold text-[var(--f-text)]">Notification Preferences</h2>
          <p className="text-sm text-[var(--f-text-3)]">
            Choose which alerts you receive and where they're delivered.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[var(--f-text-3)]">
          <div className="w-6 h-6 border-2 border-[var(--f-line)] border-t-[var(--f-tint-color)] rounded-full animate-spin mr-3" />
          Loading preferences...
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--f-line)] bg-[var(--f-surface)]">
            <div className="col-span-6 text-sm font-semibold text-[var(--f-text)]">Event</div>
            <div className="col-span-3 text-center text-sm font-semibold text-[var(--f-text-3)]">In Portal</div>
            <div className="col-span-3 text-center text-sm font-semibold text-[var(--f-text-3)]">Email</div>
          </div>

          {EVENT_TYPES.map(evt => {
            const pref = prefs[evt.key] || { portal: true, email: false };
            return (
              <div key={evt.key} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--f-line)] items-center hover:bg-[var(--f-surface)]">
                <div className="col-span-6">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-[var(--f-text-3)]" />
                    <span className="text-sm font-medium text-[var(--f-text)]">{evt.label}</span>
                  </div>
                  <p className="text-xs text-[var(--f-text-3)] ml-6">{evt.desc}</p>
                </div>
                <div className="col-span-3 flex justify-center">
                  <Switch
                    checked={pref.portal}
                    onChange={() => toggleChannel(evt.key, 'portal')}
                    disabled={!canManage}
                  />
                </div>
                <div className="col-span-3 flex justify-center">
                  <Switch
                    checked={pref.email}
                    onChange={() => toggleChannel(evt.key, 'email')}
                    disabled={!canManage}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {!canManage && (
        <p className="text-xs text-[var(--f-text-3)] italic">
          Only the business owner or admins with "settings.manage" permission can change these settings.
        </p>
      )}
    </div>
  );
}
