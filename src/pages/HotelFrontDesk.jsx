import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hotelApi } from '../lib/hotelApi';
import { useToast } from '../hooks/useToast';

const statusLabel = {
  AVAILABLE: 'Available', OCCUPIED: 'Occupied', CLEANING: 'Cleaning', MAINTENANCE: 'Maintenance', BLOCKED: 'Blocked'
};

export default function HotelFrontDesk() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [moveRoomOpen, setMoveRoomOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    customerAzamanId: '',
    phone: '',
    roomId: '',
    nights: 1,
    depositUsdc: 0,
    notes: ''
  });
  const [moveRoomForm, setMoveRoomForm] = useState({ newRoomId: '', reason: '' });

  const overviewQuery = useQuery({ queryKey: ['hotel-front-desk'], queryFn: hotelApi.getFrontDeskOverview, staleTime: 30000 });
  const roomsQuery = useQuery({ queryKey: ['hotel-rooms'], queryFn: hotelApi.getRooms, staleTime: 30000 });
  const reservationsQuery = useQuery({ queryKey: ['hotel-reservations'], queryFn: hotelApi.getReservations, staleTime: 15000 });

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['hotel-front-desk'] });
    queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
    queryClient.invalidateQueries({ queryKey: ['hotel-reservations'] });
  };

  const walkInMutation = useMutation({
    mutationFn: (payload) => hotelApi.createWalkIn(payload),
    onSuccess: () => {
      toast.go('Walk-in booking created successfully!');
      setWalkInOpen(false);
      setWalkInForm({
        customerAzamanId: '',
        phone: '',
        roomId: '',
        nights: 1,
        depositUsdc: 0,
        notes: ''
      });
      loadData();
    },
    onError: (err) => toast.stop(err.message || 'Failed to register walk-in guest'),
    onSettled: () => setActionPending(false),
  });

  const moveRoomMutation = useMutation({
    mutationFn: ({ reservationId, payload }) => hotelApi.moveRoom(reservationId, payload),
    onSuccess: () => {
      toast.go('Room moved successfully');
      setMoveRoomOpen(false);
      setSelectedReservation(null);
      setMoveRoomForm({ newRoomId: '', reason: '' });
      loadData();
    },
    onError: (err) => toast.stop(err.message || 'Failed to move room'),
    onSettled: () => setActionPending(false),
  });

  const overview = overviewQuery.data?.data ?? overviewQuery.data ?? {};
  const rooms = roomsQuery.data?.data ?? roomsQuery.data ?? [];
  const reservations = reservationsQuery.data?.data ?? reservationsQuery.data ?? [];
  const availableRooms = useMemo(() => rooms.filter((room) => room.status === 'AVAILABLE'), [rooms]);

  const openWalkIn = () => {
    setActionPending(false);
    setWalkInForm({ customerAzamanId: '', phone: '', roomId: '', nights: 1, depositUsdc: 0, notes: '' });
    setWalkInOpen(true);
  };

  const submitWalkIn = (event) => {
    event.preventDefault();
    if (!walkInForm.customerAzamanId || !walkInForm.roomId) {
      toast.stop('Customer Azaman ID and room are required');
      return;
    }
    setActionPending(true);
    walkInMutation.mutate({
      ...walkInForm,
      customerAzamanId: walkInForm.customerAzamanId,
      nights: Number(walkInForm.nights) || 1,
      depositUsdc: Number(walkInForm.depositUsdc) || 0,
    });
  };

  const openMoveRoom = (reservation) => {
    setSelectedReservation(reservation);
    setMoveRoomForm({ newRoomId: '', reason: '' });
    setMoveRoomOpen(true);
  };

  const submitMoveRoom = (event) => {
    event.preventDefault();
    if (!selectedReservation || !moveRoomForm.newRoomId) {
      toast.stop('Select a destination room');
      return;
    }
    setActionPending(true);
    moveRoomMutation.mutate({
      reservationId: selectedReservation.id,
      payload: { newRoomId: moveRoomForm.newRoomId, reason: moveRoomForm.reason },
    });
  };

  if (overviewQuery.isLoading || roomsQuery.isLoading || reservationsQuery.isLoading) {
    return <div className="p-8">Loading front desk…</div>;
  }

  if (overviewQuery.error || roomsQuery.error || reservationsQuery.error) {
    return <div className="p-8 text-red-600">Unable to load the hotel front desk.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Hotel Operations</div>
          <h1 className="text-2xl font-bold">Front Desk</h1>
        </div>
        <button className="rounded-lg bg-black px-4 py-2 text-white" onClick={openWalkIn}>Register walk-in</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Arrivals" value={overview.arrivals?.length ?? 0} />
        <Stat label="Departures" value={overview.departures?.length ?? 0} />
        <Stat label="In house" value={overview.inHouse?.length ?? 0} />
        <Stat label="Available rooms" value={availableRooms.length} />
      </div>

      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Today’s reservations</h2>
          <Link to="/hotel/reservations" className="text-sm text-blue-600">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="pb-3">Guest</th><th className="pb-3">Room</th><th className="pb-3">Status</th><th className="pb-3">Dates</th><th className="pb-3" /></tr></thead>
            <tbody>
              {reservations.slice(0, 20).map((reservation) => (
                <tr key={reservation.id} className="border-t">
                  <td className="py-3">{reservation.customer?.username || reservation.guestName || reservation.customer?.azamanId || 'Guest'}</td>
                  <td className="py-3">{reservation.room?.roomNumber || reservation.serviceItemId || '—'}</td>
                  <td className="py-3">{reservation.status}</td>
                  <td className="py-3">{reservation.startDatetime ? new Date(reservation.startDatetime).toLocaleDateString() : '—'} → {reservation.endDatetime ? new Date(reservation.endDatetime).toLocaleDateString() : '—'}</td>
                  <td className="py-3 text-right"><button className="text-blue-600" onClick={() => openMoveRoom(reservation)}>Move room</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 font-semibold">Room status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between"><span className="font-semibold">{room.roomNumber}</span><span className="text-xs text-gray-500">{room.roomType || 'Room'}</span></div>
              <div className="mt-2 text-sm">{statusLabel[room.status] || room.status}</div>
            </div>
          ))}
        </div>
      </section>

      {walkInOpen && (
        <Modal title="Register walk-in" onClose={() => setWalkInOpen(false)}>
          <form onSubmit={submitWalkIn} className="space-y-4">
            <Field label="Customer Azaman ID *">
              <input required placeholder="e.g. AZM-123456789" value={walkInForm.customerAzamanId} onChange={(e) => setWalkInForm((prev) => ({ ...prev, customerAzamanId: e.target.value.trim().toUpperCase() }))} />
            </Field>
            <Field label="Phone"><input value={walkInForm.phone} onChange={(e) => setWalkInForm((prev) => ({ ...prev, phone: e.target.value }))} /></Field>
            <Field label="Room *"><select required value={walkInForm.roomId} onChange={(e) => setWalkInForm((prev) => ({ ...prev, roomId: e.target.value }))}><option value="">Select room</option>{availableRooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Nights"><input type="number" min="1" value={walkInForm.nights} onChange={(e) => setWalkInForm((prev) => ({ ...prev, nights: e.target.value }))} /></Field><Field label="Deposit USDC"><input type="number" min="0" step="0.01" value={walkInForm.depositUsdc} onChange={(e) => setWalkInForm((prev) => ({ ...prev, depositUsdc: e.target.value }))} /></Field></div>
            <Field label="Notes"><textarea value={walkInForm.notes} onChange={(e) => setWalkInForm((prev) => ({ ...prev, notes: e.target.value }))} /></Field>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setWalkInOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button type="submit" disabled={actionPending} className="rounded-lg bg-black px-4 py-2 text-white">{actionPending ? 'Registering…' : 'Register walk-in'}</button></div>
          </form>
        </Modal>
      )}

      {moveRoomOpen && selectedReservation && (
        <Modal title="Move room" onClose={() => setMoveRoomOpen(false)}>
          <form onSubmit={submitMoveRoom} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">Current room: <strong>{selectedReservation.room?.roomNumber || selectedReservation.serviceItemId || '—'}</strong></div>
            <Field label="New room *"><select required value={moveRoomForm.newRoomId} onChange={(e) => setMoveRoomForm((prev) => ({ ...prev, newRoomId: e.target.value }))}><option value="">Select room</option>{availableRooms.filter((room) => room.id !== selectedReservation.serviceItemId).map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}</select></Field>
            <Field label="Reason"><textarea value={moveRoomForm.reason} onChange={(e) => setMoveRoomForm((prev) => ({ ...prev, reason: e.target.value }))} /></Field>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setMoveRoomOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button type="submit" disabled={actionPending} className="rounded-lg bg-black px-4 py-2 text-white">{actionPending ? 'Moving…' : 'Move room'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }) { return <div className="rounded-xl border bg-white p-4"><div className="text-sm text-gray-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>; }
function Field({ label, children }) { return <label className="block text-sm font-medium">{label}<div className="mt-1 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:px-3 [&_select]:py-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:px-3 [&_textarea]:py-2">{children}</div></label>; }
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>; }
