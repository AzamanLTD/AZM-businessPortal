/**
 * Stays & check-in — a hotel's terms for stays paid in the Azaman app.
 *
 * Backend (AZM-backend feat/stay-penalties, stayCheckInService):
 *   GET/PUT /api/reservations/policy/penalties  { lateCancelHours, lateCancelBps, noShowBps }
 *     GET also answers { limits: { maxLateCancelBps, maxNoShowBps }, maxLateCancelHours }:
 *     the most any hotel may keep, set by Azaman (they change with the market).
 *   GET/PUT /api/reservations/policy/checkin    { allowIdCheck }
 * Changes apply to stays paid after saving; a stay already paid keeps the
 * terms it was paid under. Editing needs the owner or settings.manage.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/lib/toast';
import { Card, Button, Input, Skel } from '@/components/instrument';
import { Hotel, IdCard } from 'lucide-react';

const WINDOWS = [0, 12, 24, 48, 72, 168];
const windowLabel = (h) => (h === 0 ? 'No late fee' : h === 168 ? '7 days before check-in' : `${h} hours before check-in`);

// Percent typed by the hotel -> whole basis points, or null when not a valid share.
export function percentToBps(text) {
  const s = String(text ?? '').trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const bps = Math.round(Number(s) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}
export const bpsToPercent = (bps) => {
  const p = (Number(bps) || 0) / 100;
  return Number.isInteger(p) ? String(p) : p.toFixed(2);
};

export default function StayTerms() {
  const qc = useQueryClient();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('settings.manage');

  const { data: penalties, isLoading } = useQuery({
    queryKey: ['stayPenaltyTerms'],
    queryFn: () => request('/api/reservations/policy/penalties'),
  });
  const { data: checkin } = useQuery({
    queryKey: ['stayCheckInPolicy'],
    queryFn: () => request('/api/reservations/policy/checkin'),
  });

  const limits = penalties?.limits || { maxLateCancelBps: 0, maxNoShowBps: 0 };
  const [hours, setHours] = useState(0);
  const [late, setLate] = useState('0');
  const [noShow, setNoShow] = useState('0');
  useEffect(() => {
    if (!penalties?.terms) return;
    setHours(penalties.terms.lateCancelHours || 0);
    setLate(bpsToPercent(penalties.terms.lateCancelBps));
    setNoShow(bpsToPercent(penalties.terms.noShowBps));
  }, [penalties]);

  const lateBps = percentToBps(late);
  const noShowBps = percentToBps(noShow);
  const lateTooHigh = lateBps != null && lateBps > limits.maxLateCancelBps;
  const noShowTooHigh = noShowBps != null && noShowBps > limits.maxNoShowBps;
  const valid = lateBps != null && noShowBps != null && !lateTooHigh && !noShowTooHigh;

  const save = useMutation({
    mutationFn: () => request('/api/reservations/policy/penalties', {
      method: 'PUT',
      body: JSON.stringify({ lateCancelHours: hours, lateCancelBps: hours > 0 ? lateBps : 0, noShowBps }),
    }),
    onSuccess: () => {
      toast.go('Saved. Stays paid from now on carry these terms.');
      qc.invalidateQueries({ queryKey: ['stayPenaltyTerms'] });
    },
    onError: (e) => toast.stop(e.message || 'Could not save.'),
  });

  const idCheck = useMutation({
    mutationFn: (allowIdCheck) => request('/api/reservations/policy/checkin', { method: 'PUT', body: JSON.stringify({ allowIdCheck }) }),
    onSuccess: () => { toast.go('Saved.'); qc.invalidateQueries({ queryKey: ['stayCheckInPolicy'] }); },
    onError: (e) => toast.stop(e.message || 'Could not save.'),
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2"><Hotel className="w-5 h-5 text-[var(--accent)]" /> Stays &amp; check-in</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Your terms for stays paid in the Azaman app. Guests see them before they pay. A stay already paid keeps the terms it was paid under.</p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold">Cancellation and no-show</h2>
        {isLoading ? <Skel className="h-32 w-full" /> : (
          <>
            <label className="block text-sm">
              <span className="text-[var(--text-2)]">A cancellation is late from</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-sm bg-[var(--surface-raise)] border border-line text-sm"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                disabled={!canEdit}
              >
                {WINDOWS.map((h) => <option key={h} value={h}>{windowLabel(h)}</option>)}
              </select>
            </label>
            {hours > 0 && (
              <div>
                <Input label="You keep on a late cancellation (% of the stay price)" value={late} onChange={(e) => setLate(e.target.value)} disabled={!canEdit} />
                <p className={`text-[11px] mt-1 ${lateTooHigh || lateBps == null ? 'text-[var(--stop)]' : 'text-[var(--text-3)]'}`}>
                  {lateBps == null ? 'Enter a percentage, for example 20.' : `At most ${bpsToPercent(limits.maxLateCancelBps)}%, set by Azaman.`}
                </p>
              </div>
            )}
            <div>
              <Input label="You keep when a guest does not show (% of the stay price)" value={noShow} onChange={(e) => setNoShow(e.target.value)} disabled={!canEdit} />
              <p className={`text-[11px] mt-1 ${noShowTooHigh || noShowBps == null ? 'text-[var(--stop)]' : 'text-[var(--text-3)]'}`}>
                {noShowBps == null ? 'Enter a percentage, for example 10.' : `At most ${bpsToPercent(limits.maxNoShowBps)}%, set by Azaman.`}
              </p>
            </div>
            <p className="text-xs text-[var(--text-3)]">The rest of the stay price goes back to the guest. The Azaman fee is not part of it.</p>
            {canEdit ? (
              <Button onClick={() => save.mutate()} disabled={!valid || save.isPending}>{save.isPending ? 'Saving…' : 'Save terms'}</Button>
            ) : (
              <p className="text-xs text-[var(--text-3)]">Only the owner or a manager with settings rights can change these.</p>
            )}
          </>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><IdCard className="w-4 h-4" /> Check-in by ID</h2>
        <p className="text-sm text-[var(--text-3)]">When a guest cannot show their QR, front desk can check a paid stay in by their photo ID and AZM-ID. The payment stays held until the guest confirms in their app, or 24 hours.</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={checkin?.policy?.allowIdCheck !== false}
            disabled={!canEdit || idCheck.isPending || !checkin}
            onChange={(e) => idCheck.mutate(e.target.checked)}
          />
          <span>Allow check-in by ID</span>
        </label>
      </Card>
    </div>
  );
}
