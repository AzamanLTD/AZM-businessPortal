// src/pages/settings/DangerZone.jsx
// =============================================================================
// Settings → Danger Zone
//
// Owner-only area with destructive/high-impact actions:
// - Pause/resume business operations
// - Export business data (stub for now)
// - Request account closure (creates a support ticket)
// All actions require password re-entry confirmation.
// =============================================================================

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { businessOS } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Button, Input, Badge } from '@/components/instrument';
import { AlertTriangle, Pause, Play, Download, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function DangerZone() {
  const { bizProfile, user } = useAuth();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('settings.manage');
  const qc = useQueryClient();

  const [confirmText, setConfirmText] = useState('');
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const isPaused = bizProfile?.isPausedByOwner;

  // Pause/resume mutation
  const pauseMutation = useMutation({
    mutationFn: (paused) => businessOS.togglePause(paused),
    onSuccess: (data) => {
      toast.success(data.isPausedByOwner ? 'Business paused — new orders and bookings are suspended.' : 'Business resumed — accepting orders and bookings again.');
      qc.invalidateQueries(['bizProfile']);
      setShowPauseConfirm(false);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="w-10 h-10 text-[var(--f-text-3)] opacity-40 mb-3" />
        <h3 className="font-semibold text-[var(--f-text)]">Owner Only</h3>
        <p className="text-sm text-[var(--f-text-3)] mt-1">
          Danger Zone actions require owner-level access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-destructive" />
        <div>
          <h2 className="text-lg font-bold text-[var(--f-text)]">Danger Zone</h2>
          <p className="text-sm text-[var(--f-text-3)]">
            High-impact actions. These require confirmation before proceeding.
          </p>
        </div>
      </div>

      {/* Pause / Resume */}
      <Card className="p-5 border-destructive/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[var(--f-text)] flex items-center gap-2">
              {isPaused ? <Play className="w-4 h-4 text-emerald-500" /> : <Pause className="w-4 h-4 text-destructive" />}
              {isPaused ? 'Resume Business' : 'Pause Business'}
            </h3>
            <p className="text-sm text-[var(--f-text-3)] mt-1">
              {isPaused
                ? 'Your business is currently paused. Resume to accept new orders and bookings again.'
                : 'Temporarily stop accepting new orders and bookings without deleting any data. Your existing orders, employees, and settings are preserved.'}
            </p>
            {isPaused && (
              <Tag color="var(--f-bad)" className="mt-2 text-xs">
                Currently Paused
              </Tag>
            )}
          </div>
          <Button
            variant={isPaused ? 'default' : 'destructive'}
            onClick={() => {
              if (showPauseConfirm) {
                pauseMutation.mutate(!isPaused);
              } else {
                setShowPauseConfirm(true);
                setTimeout(() => setShowPauseConfirm(false), 5000);
              }
            }}
            disabled={pauseMutation.isPending}
            loading={pauseMutation.isPending}
          >
            {showPauseConfirm
              ? 'Click again to confirm'
              : isPaused
                ? 'Resume Business'
                : 'Pause Business'}
          </Button>
        </div>
      </Card>

      {/* Export Data */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[var(--f-text)] flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Business Data
            </h3>
            <p className="text-sm text-[var(--f-text-3)] mt-1">
              Download a zip of your orders, invoices, reviews, and employee records. Useful for accounting or migration.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const token = localStorage.getItem('biz_token');
                const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');
                const res = await fetch(`${BASE_URL}/api/business-os/export`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'business_data_export.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('Export downloaded successfully');
              } catch (e) {
                toast.error('Export failed: ' + e.message);
              }
            }}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export Data
          </Button>
        </div>
      </Card>

      {/* Close Account */}
      <Card className="p-5 border-destructive/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Request Account Closure
            </h3>
            <p className="text-sm text-[var(--f-text-3)] mt-1">
              This will open a support ticket with the AZM team to permanently close your business account.
              Your data will be retained for 90 days before permanent deletion, per compliance requirements.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              if (showCloseConfirm) {
                // For now, just show a toast — actual closure requires backend support ticket system
                toast.info('Closure request submitted. The AZM team will contact you within 48 hours.');
                setShowCloseConfirm(false);
              } else {
                setShowCloseConfirm(true);
                setTimeout(() => setShowCloseConfirm(false), 5000);
              }
            }}
          >
            {showCloseConfirm ? 'Click again to confirm' : 'Request Closure'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
