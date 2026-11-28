/**
 * CheckIn — Business-facing check-in dashboard.
 * Dual mode: QR token verification + AZM-ID manual search.
 * Shows today's check-in stats and recent activity.
 *
 * Sentry-inspired: widget-based layout, data-dense activity feed,
 * clean modal interactions, tactile buttons.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkIn as checkInApi } from '@/lib/marketplaceApi';
import { KpiCard, KpiCardStat, KpiCardRow } from '@/components/StatPanels';
import { Button, Tag, Input, Dialog, Skel } from '@/components/instrument';
import { fmt, formatDateTime, relativeTime, cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  QrCode, Search, CheckCircle2, Users, Clock,
  UserCheck, ArrowRight, X, AlertCircle, Zap, IdCard,
} from 'lucide-react';

// The search answers { customer: { username, azamanId, profilePictureUrl },
// reservations: [{ id, reservationRef, startDatetime, status, paid }],
// idCheckAllowed } (backend qrCheckInService.searchByAzamanId).
export function searchView(data) {
  const customer = (data && data.customer) || {};
  return {
    name: customer.username || null,
    azamanId: customer.azamanId || null,
    photoUrl: customer.profilePictureUrl || null,
    idCheckAllowed: !!(data && data.idCheckAllowed),
    reservations: ((data && data.reservations) || []).map((r) => ({
      id: r.id,
      ref: r.reservationRef || 'Reservation',
      at: r.startDatetime || r.createdAt || null,
      status: r.status,
      paid: !!r.paid,
    })),
  };
}

export default function CheckIn() {
  const qc = useQueryClient();
  const [mode, setMode] = useState('scan'); // 'scan' | 'search'
  const [token, setToken] = useState('');
  const [azamanId, setAzamanId] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  // The paid stay being checked in by ID, and the staff member's confirmation
  // that they matched the guest's face and photo ID.
  const [idCheck, setIdCheck] = useState(null);
  const [idMatched, setIdMatched] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['checkin-stats'],
    queryFn: () => checkInApi.todayStats(),
    refetchInterval: 30_000,
  });
  const stats = statsData?.stats || {};

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['checkin-recent'],
    queryFn: () => checkInApi.recentCheckIns({ limit: 10 }),
    refetchInterval: 30_000,
  });
  const recent = recentData?.checkIns || [];

  const verifyMut = useMutation({
    mutationFn: (t) => checkInApi.verifyToken(t),
    onSuccess: (data) => {
      setCheckInResult({
        name: null,
        azamanId: data?.customerAzamanId,
        ref: data?.reservation?.reservationRef,
        held: false,
      });
      toast.go('Check-in successful!');
      qc.invalidateQueries(['checkin-stats']);
      qc.invalidateQueries(['checkin-recent']);
      setToken('');
    },
    onError: (e) => toast.stop(e.message),
  });

  const searchMut = useMutation({
    mutationFn: (id) => checkInApi.searchByAzamanId(id),
    onSuccess: (data) => setSearchResults(data),
    onError: (e) => toast.stop(e.message),
  });

  const view = searchResults ? searchView(searchResults) : null;

  const idCheckMut = useMutation({
    mutationFn: ({ reservationId, azamanId: id }) => checkInApi.byIdCheck(reservationId, id),
    onSuccess: (data) => {
      setCheckInResult({
        name: view?.name,
        azamanId: view?.azamanId,
        ref: data?.reservation?.reservationRef,
        held: !!data?.paymentHeld,
      });
      toast.go('Checked in by ID check');
      qc.invalidateQueries(['checkin-stats']);
      qc.invalidateQueries(['checkin-recent']);
      setIdCheck(null);
      setIdMatched(false);
      setSearchResults(null);
      setAzamanId('');
    },
    onError: (e) => toast.stop(e.message),
  });

  const directCheckInMut = useMutation({
    mutationFn: (reservationId) => checkInApi.directCheckIn(reservationId),
    onSuccess: (data) => {
      setCheckInResult({
        name: view?.name,
        azamanId: view?.azamanId,
        ref: data?.reservation?.reservationRef,
        held: false,
      });
      toast.go('Check-in successful!');
      qc.invalidateQueries(['checkin-stats']);
      qc.invalidateQueries(['checkin-recent']);
      setSearchResults(null);
      setAzamanId('');
    },
    onError: (e) => toast.stop(e.message),
  });

  const handleVerify = () => {
    if (!token.trim()) return;
    verifyMut.mutate(token.trim());
  };

  const handleSearch = () => {
    if (!azamanId.trim()) return;
    searchMut.mutate(azamanId.trim());
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto ">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <QrCode className="w-5 h-5 text-[var(--accent)]" />
          Check-In Dashboard
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">Verify customer QR codes or search by AZM-ID to check in reservations.</p>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Checked In Today" icon={UserCheck} iconColor="var(--accent)">
          <KpiCardStat value={fmt(stats.todayCount || 0, 0)} label="Guests" color="var(--accent)" />
        </KpiCard>
        <KpiCard title="Pending" icon={Clock} iconColor="var(--hold)">
          <KpiCardStat value={fmt(stats.pending || 0, 0)} label="Awaiting check-in" color="var(--hold)" />
        </KpiCard>
        <KpiCard title="No-Shows" icon={AlertCircle} iconColor="var(--stop)">
          <KpiCardStat value={fmt(stats.noShows || 0, 0)} label="Today" color="var(--stop)" />
        </KpiCard>
        <KpiCard title="Total Guests" icon={Users} iconColor="var(--info)">
          <KpiCardStat value={fmt(stats.totalGuests || 0, 0)} label="All time" color="var(--info)" />
        </KpiCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in panel */}
        <KpiCard title="Check In" icon={Zap} iconColor="var(--accent)" height="300px">
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)]">
              <button
                onClick={() => setMode('scan')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
                  mode === 'scan' ? 'bg-[var(--surface-sunk)] text-[var(--accent)]' : 'text-[var(--text-3)]:text-[var(--text-3)]'
                )}
              >
                <QrCode className="w-3.5 h-3.5" /> QR Token
              </button>
              <button
                onClick={() => setMode('search')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
                  mode === 'search' ? 'bg-[var(--surface-sunk)] text-[var(--accent)]' : 'text-[var(--text-3)]:text-[var(--text-3)]'
                )}
              >
                <Search className="w-3.5 h-3.5" /> AZM-ID
              </button>
            </div>

            {/* Scan mode */}
            {mode === 'scan' && (
              <div className="space-y-3">
                <Input
                  label="QR Token"
                  placeholder="Paste or scan QR token..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <Button onClick={handleVerify} className="w-full">
                  <CheckCircle2 className="w-4 h-4" /> Verify & Check In
                </Button>
                <p className="text-[11px] text-[var(--text-3)] text-center">
                  Ask the customer to show their QR code in the app, then enter the token above.
                </p>
              </div>
            )}

            {/* Search mode */}
            {mode === 'search' && (
              <div className="space-y-3">
                <Input
                  label="Customer AZM-ID"
                  placeholder="e.g. AZM-1234..."
                  value={azamanId}
                  onChange={(e) => setAzamanId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} className="w-full">
                  <Search className="w-4 h-4" /> Search Customer
                </Button>
                <p className="text-[11px] text-[var(--text-3)] text-center">
                  Search by AZM-ID to find the customer and their active reservations.
                </p>
              </div>
            )}
          </div>
        </KpiCard>

        {/* Recent check-ins */}
        <KpiCard title="Recent Check-Ins" icon={Clock} iconColor="var(--info)" height="300px">
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-10" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center">
              <Clock className="w-8 h-8 text-[var(--text-3)] mb-2" />
              <p className="text-xs text-[var(--text-3)]">No check-ins yet today.</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-[220px] overflow-y-auto">
              {recent.map((ci) => (
                <KpiCardRow
                  key={ci.id}
                  label={ci.customerName || ci.azamanId}
                  value={relativeTime(ci.checkedInAt)}
                  badge={<Tag tone="neutral">{ci.reference}</Tag>}
                />
              ))}
            </div>
          )}
        </KpiCard>
      </div>

      {/* Search results modal */}
      <Dialog open={view !== null && idCheck === null} onClose={() => setSearchResults(null)} title="Guest found" className="max-w-lg">
        {view && (
          <div className="space-y-4">
            {/* Guest */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)]">
              {view.photoUrl ? (
                <img src={view.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-[var(--line)]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--info)] border border-[var(--info)] flex items-center justify-center">
                  <span className="text-sm font-bold text-[var(--info)]">
                    {(view.name || view.azamanId || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-[var(--text)]">{view.name || 'Guest'}</p>
                <p className="text-xs text-[var(--text-3)] f-mono">{view.azamanId}</p>
              </div>
            </div>

            {/* Reservations here */}
            <div>
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">Reservations here</p>
              {view.reservations.length === 0 ? (
                <p className="text-sm text-[var(--text-3)] py-4 text-center">No reservations waiting to check in.</p>
              ) : (
                <div className="space-y-2">
                  {view.reservations.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)]">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)] truncate">{r.ref}</p>
                        <p className="text-[11px] text-[var(--text-3)]">
                          {r.at ? formatDateTime(r.at) : ''}{r.paid ? ' · Paid in Azaman' : ''}
                        </p>
                      </div>
                      {r.status !== 'CONFIRMED' ? (
                        <Tag color={r.status === 'CHECKED_IN' ? 'var(--accent)' : 'var(--stop)'}>
                          {r.status === 'CHECKED_IN' ? 'Checked in' : r.status}
                        </Tag>
                      ) : !r.paid ? (
                        <Button size="sm" onClick={() => directCheckInMut.mutate(r.id)} disabled={directCheckInMut.isPending}>
                          Check in <ArrowRight className="w-3 h-3" />
                        </Button>
                      ) : view.idCheckAllowed ? (
                        <Button size="sm" variant="secondary" onClick={() => { setIdCheck(r); setIdMatched(false); }}>
                          <IdCard className="w-3.5 h-3.5" /> Check in by ID
                        </Button>
                      ) : (
                        <span className="text-[11px] text-[var(--text-3)] text-right max-w-[11rem]">Scan the guest's QR in their app to check in.</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {view.reservations.some((r) => r.paid && r.status === 'CONFIRMED') && (
                <p className="text-[11px] text-[var(--text-3)] mt-3">
                  A stay paid in Azaman checks in by the guest's QR{view.idCheckAllowed ? ', or by an ID check' : ''}.
                </p>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* ID check: staff match the guest to their photo and ID card */}
      <Dialog open={idCheck !== null} onClose={() => { setIdCheck(null); setIdMatched(false); }} title="Check in by ID" className="max-w-md">
        {idCheck && view && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              {view.photoUrl ? (
                <img src={view.photoUrl} alt="The guest's Azaman photo" className="w-28 h-28 rounded-2xl object-cover border border-[var(--line)]" />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-[var(--surface-sunk)] border border-[var(--line)] flex items-center justify-center text-xs text-[var(--text-3)] px-3">
                  No photo on this account. Rely on the ID card.
                </div>
              )}
              <p className="text-sm font-bold text-[var(--text)]">{view.name || 'Guest'}</p>
              <p className="text-xs text-[var(--text-3)] f-mono">{view.azamanId} · {idCheck.ref}</p>
            </div>
            <ol className="text-xs text-[var(--text-2)] space-y-1 list-decimal pl-5">
              <li>Ask for a photo ID card (Ghana Card, passport or driving licence).</li>
              <li>Check the face matches the guest and this photo.</li>
              <li>Check the name matches the booking.</li>
            </ol>
            <label className="flex items-start gap-2 text-sm text-[var(--text)] cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={idMatched} onChange={(e) => setIdMatched(e.target.checked)} />
              <span>I checked the guest's photo ID and it matches.</span>
            </label>
            <p className="text-[11px] text-[var(--text-3)]">
              The payment stays held until the guest confirms in their app that it was them, or for 24 hours. If they say it wasn't them, the payment is held for review.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => { setIdCheck(null); setIdMatched(false); }}>
                <X className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1"
                disabled={!idMatched || idCheckMut.isPending}
                onClick={() => idCheckMut.mutate({ reservationId: idCheck.id, azamanId: view.azamanId })}
              >
                <CheckCircle2 className="w-4 h-4" /> {idCheckMut.isPending ? 'Checking in...' : 'Check in'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Check-in success modal */}
      <Dialog open={checkInResult !== null} onClose={() => setCheckInResult(null)} title="Check-In Successful" className="max-w-md">
        {checkInResult && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-sunk)] border border-[var(--accent)] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <p className="text-lg font-bold text-[var(--text)]">{checkInResult.name || checkInResult.azamanId || 'Guest'}</p>
            {checkInResult.name && <p className="text-sm text-[var(--text-3)] mt-1">{checkInResult.azamanId}</p>}
            {checkInResult.ref && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)]">
                <p className="text-xs text-[var(--text-3)]">Reservation</p>
                <p className="text-sm font-bold text-[var(--text)] f-mono">{checkInResult.ref}</p>
              </div>
            )}
            {checkInResult.held && (
              <p className="text-xs text-[var(--text-3)] mt-3 max-w-xs">
                The payment is held until the guest confirms in their app, or for 24 hours.
              </p>
            )}
            <Button onClick={() => setCheckInResult(null)} className="mt-6 w-full">
              Done
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
