import { useState, useEffect, useCallback, useMemo } from 'react';
import { hotelOpsApi } from '@/lib/marketplaceApi';
import { reservations as resApi } from '@/lib/marketplaceApi';
import { usePermission } from '@/hooks/usePermission';
import {
  Card,
  Button,
  Tag,
  Skel,
  Empty,
  Dialog,
  Input,
  Select,
  StatCard,
  Avatar,
  Tabs,
  Tooltip
} from '@/components/instrument';
import {
  LogIn,
  LogOut,
  BedDouble,
  Calendar,
  Plus,
  RefreshCw,
  Move,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function HotelFrontDesk() {
    const { hasPermission } = usePermission();

  // Active Tab: 0 = Today's Operations, 1 = Room Rack
  const [activeTab, setActiveTab] = useState(0);

  // States
  const [frontDeskData, setFrontDeskData] = useState(null);
  const [roomRackData, setRoomRackData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected date for query (defaults to today)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Modal control states
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [moveRoomOpen, setMoveRoomOpen] = useState(false);
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);

  // Form states for modals
  const [walkInForm, setWalkInForm] = useState({
    guestName: '',
    phone: '',
    roomId: '',
    nights: 1,
    depositUsdc: 0,
    notes: ''
  });

  const [moveRoomForm, setMoveRoomForm] = useState({
    reservationId: '',
    guestName: '',
    currentRoomNumber: '',
    newRoomId: '',
    reason: ''
  });

  const [checkoutConfirmData, setCheckoutConfirmData] = useState({
    reservationId: '',
    guestName: '',
    roomNumber: '',
    balanceDue: 0
  });

  // Action pending state
  const [actionPending, setActionPending] = useState(false);

  // Load all required page data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fdRes, rrRes] = await Promise.all([
        hotelOpsApi.getFrontDesk({ date: selectedDate }),
        hotelOpsApi.getRoomRack({ date: selectedDate })
      ]);

      setFrontDeskData(fdRes?.data || fdRes || {});
      setRoomRackData(rrRes?.data || rrRes || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load front desk data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check In Handler
  const handleCheckIn = async (reservationId) => {
    try {
      setActionPending(true);
      await resApi.checkIn(reservationId);
      toast.success('Guest checked in successfully!');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to complete check-in');
    } finally {
      setActionPending(false);
    }
  };

  // Open Check Out Dialog
  const openCheckoutConfirm = (reservation) => {
    setCheckoutConfirmData({
      reservationId: reservation.id,
      guestName: reservation.customer?.username || reservation.customerName || 'Guest',
      roomNumber: reservation.room?.roomNumber || 'Unassigned',
      balanceDue: reservation.amountUsdc || 0
    });
    setCheckoutConfirmOpen(true);
  };

  // Confirm Check Out Handler
  const handleCheckOut = async () => {
    try {
      setActionPending(true);
      await resApi.checkOut(checkoutConfirmData.reservationId);
      toast.success('Guest checked out successfully! Room status set to DIRTY.');
      setCheckoutConfirmOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to complete check-out');
    } finally {
      setActionPending(false);
    }
  };

  // Walk-In Booking Submission
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInForm.guestName || !walkInForm.roomId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActionPending(true);
      const res = await fetch('/api/business-os/hotel/front-desk/walk-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: walkInForm.guestName,
          phone: walkInForm.phone,
          roomId: walkInForm.roomId,
          nights: Number(walkInForm.nights),
          depositUsdc: Number(walkInForm.depositUsdc),
          notes: walkInForm.notes
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Walk-in booking failed');
      }

      toast.success('Walk-in booking created successfully!');
      setWalkInOpen(false);
      // Reset form
      setWalkInForm({
        guestName: '',
        phone: '',
        roomId: '',
        nights: 1,
        depositUsdc: 0,
        notes: ''
      });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to register walk-in guest');
    } finally {
      setActionPending(false);
    }
  };

  // Open Move Room modal
  const openMoveRoomModal = (reservation) => {
    setMoveRoomForm({
      reservationId: reservation.id,
      guestName: reservation.customer?.username || reservation.customerName || 'Guest',
      currentRoomNumber: reservation.room?.roomNumber || 'Unassigned',
      newRoomId: '',
      reason: ''
    });
    setMoveRoomOpen(true);
  };

  // Move Room Submission
  const handleMoveRoomSubmit = async (e) => {
    e.preventDefault();
    if (!moveRoomForm.newRoomId || !moveRoomForm.reason) {
      toast.error('Please select a new room and state a reason');
      return;
    }

    try {
      setActionPending(true);
      const res = await fetch(`/api/business-os/hotel/front-desk/${moveRoomForm.reservationId}/move-room`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRoomId: moveRoomForm.newRoomId,
          reason: moveRoomForm.reason
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to move room');
      }

      toast.success('Room moved successfully!');
      setMoveRoomOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to move guest room');
    } finally {
      setActionPending(false);
    }
  };

  // Create list of 7 days starting from selected date for Room Rack column rendering
  const rackDates = useMemo(() => {
    const baseDate = new Date(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      return {
        dateStr: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })
      };
    });
  }, [selectedDate]);

  // Group room rack by floor
  const roomsByFloor = useMemo(() => {
    if (!Array.isArray(roomRackData)) return {};
    return roomRackData.reduce((acc, room) => {
      const floor = room.floor || 'Floor 1';
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(room);
      return acc;
    }, {});
  }, [roomRackData]);

  // List of unique available rooms for walk-in/move dropdown selectors
  const availableRoomsList = useMemo(() => {
    if (!Array.isArray(roomRackData)) return [];
    return roomRackData.filter(room => !room.isOccupied && room.status !== 'DIRTY' && room.status !== 'MAINTENANCE');
  }, [roomRackData]);

  // Main UI components
  if (loading && !frontDeskData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">Hotel Front Desk</h1>
            <p className="text-sm text-[var(--text-3)] mt-0.5">Manage daily operations, bookings, and room allocations.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skel className="h-24" />
          <Skel className="h-24" />
          <Skel className="h-24" />
          <Skel className="h-24" />
        </div>
        <Skel className="h-96" />
      </div>
    );
  }

  const arrivals = frontDeskData?.arrivalList || [];
  const departures = frontDeskData?.departureList || [];
  const inHouse = frontDeskData?.inHouseList || [];
  const availableRoomsCount = frontDeskData?.availableRooms ?? 0;

  // Render Tabs list
  const tabConfig = [
    {
      label: 'Today\'s Operations',
      icon: BedDouble,
      count: arrivals.length + inHouse.length + departures.length,
      content: (
        <div className="space-y-8 mt-6">
          {/* Quick Actions / Date Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--surface)] p-4 rounded-xl border border-[var(--line)]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Viewing Date:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40 py-1"
              />
              <Button variant="ghost" size="sm" onClick={loadData} title="Reload operations data">
                <RefreshCw size={16} />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setWalkInOpen(true)} className="flex items-center gap-1.5">
                <Plus size={16} /> Walk-in Booking
              </Button>
            </div>
          </div>

          {/* Grid of lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Arrivals Card */}
            <Card className="flex flex-col h-full border border-[var(--line)]">
              <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[rgba(108,79,209,0.02)]">
                <div className="flex items-center gap-2">
                  <LogIn className="text-[var(--accent)]" size={18} />
                  <h3 className="font-semibold text-[var(--text)]">Arrivals Today</h3>
                </div>
                <Tag tone="neutral">{arrivals.length}</Tag>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
                {arrivals.length === 0 ? (
                  <Empty icon={Calendar} title="No arrivals remaining" description="All expected guests for today have been checked in or cancelled." />
                ) : (
                  arrivals.map(guest => (
                    <div key={guest.id} className="p-3 bg-[var(--f-bg)] rounded-lg border border-[var(--line)]:border-[var(--accent)] transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm text-[var(--text)]">{guest.customer?.username || guest.customerName || 'Guest'}</p>
                          <p className="text-xs text-[var(--text-3)]">Room Type: {guest.roomType?.name || 'Standard'}</p>
                        </div>
                        <Tag color={guest.amountUsdc ? 'var(--go)' : 'var(--hold)'}>
                          {guest.amountUsdc ? `${guest.amountUsdc} USDC` : 'No Deposit'}
                        </Tag>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--line)]">
                        <span className="text-xs text-[var(--text-3)]">
                          Check-in: {guest.startDatetime ? new Date(guest.startDatetime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                        </span>
                        <Button
                          size="sm"
                          disabled={actionPending}
                          onClick={() => handleCheckIn(guest.id)}
                          className="px-3 py-1 bg-[var(--accent)] text-[var(--text)]:bg-[var(--accent)] opacity-90:opacity-100 flex items-center gap-1 text-xs"
                        >
                          <LogIn size={12} /> Check In
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* In-House Card */}
            <Card className="flex flex-col h-full border border-[var(--line)]">
              <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[rgba(61,116,219,0.02)]">
                <div className="flex items-center gap-2">
                  <BedDouble className="text-[var(--info)]" size={18} />
                  <h3 className="font-semibold text-[var(--text)]">In-House Guests</h3>
                </div>
                <Tag tone="neutral">{inHouse.length}</Tag>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
                {inHouse.length === 0 ? (
                  <Empty icon={BedDouble} title="No active guests" description="There are currently no guests registered in-house." />
                ) : (
                  inHouse.map(guest => (
                    <div key={guest.id} className="p-3 bg-[var(--f-bg)] rounded-lg border border-[var(--line)]:border-[var(--info)] transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm text-[var(--text)]">{guest.customer?.username || guest.customerName || 'Guest'}</p>
                          <p className="text-xs text-[var(--text-3)]">Room {guest.room?.roomNumber || 'Unassigned'} ({guest.room?.roomType || 'Standard'})</p>
                        </div>
                        <Tag tone="neutral">In House</Tag>
                      </div>
                      <div className="grid grid-cols-2 gap-2 my-2 text-xs text-[var(--text-3)] bg-[var(--surface)] p-2 rounded">
                        <div>Nights Remaining: <strong className="text-[var(--text)]">{guest.nightsRemaining ?? 1}</strong></div>
                        <div>Total spend: <strong className="text-[var(--text)]">{guest.amountUsdc || 0} USDC</strong></div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-[var(--line)]">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openMoveRoomModal(guest)}
                          className="px-2 py-1 text-xs text-[var(--text-3)]:text-[var(--text)] border border-[var(--line)] flex items-center gap-1"
                        >
                          <Move size={12} /> Move Room
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Departures Card */}
            <Card className="flex flex-col h-full border border-[var(--line)]">
              <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[rgba(222,168,50,0.02)]">
                <div className="flex items-center gap-2">
                  <LogOut className="text-[var(--hold)]" size={18} />
                  <h3 className="font-semibold text-[var(--text)]">Departures Today</h3>
                </div>
                <Tag tone="neutral">{departures.length}</Tag>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
                {departures.length === 0 ? (
                  <Empty icon={Calendar} title="No departures today" description="No departures are scheduled or outstanding for today." />
                ) : (
                  departures.map(guest => (
                    <div key={guest.id} className="p-3 bg-[var(--f-bg)] rounded-lg border border-[var(--line)]:border-[var(--hold)] transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm text-[var(--text)]">{guest.customer?.username || guest.customerName || 'Guest'}</p>
                          <p className="text-xs text-[var(--text-3)]">Room {guest.room?.roomNumber || 'Unassigned'}</p>
                        </div>
                        <Tag color={guest.amountUsdc ? 'var(--stop)' : 'var(--go)'}>
                          {guest.amountUsdc ? `${guest.amountUsdc} USDC Due` : 'No Balance'}
                        </Tag>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--line)]">
                        <span className="text-xs text-[var(--text-3)]">
                          Checkout: {guest.endDatetime ? new Date(guest.endDatetime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                        </span>
                        <Button
                          size="sm"
                          disabled={actionPending}
                          onClick={() => openCheckoutConfirm(guest)}
                          className="px-3 py-1 bg-[var(--hold)] text-[var(--text)]:bg-[var(--hold)] opacity-90:opacity-100 flex items-center gap-1 text-xs"
                        >
                          <LogOut size={12} /> Check Out
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )
    },
    {
      label: 'Room Rack Grid',
      icon: Calendar,
      count: 0,
      content: (
        <div className="space-y-6 mt-6">
          {/* Room Rack Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mr-2">Status Legend:</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 rounded bg-[var(--go)] inline-block" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 rounded bg-[var(--info)] inline-block" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 rounded bg-[var(--accent)] inline-block" />
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 rounded bg-[var(--hold)] inline-block" />
                <span>Dirty / Cleaning</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3.5 h-3.5 rounded bg-[var(--stop)] inline-block" />
                <span>Maintenance</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Start Date:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40 py-1"
              />
            </div>
          </div>

          {/* Grid Rack View */}
          <Card className="overflow-x-auto border border-[var(--line)] p-4">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--text-3)] border-b border-[var(--line)] uppercase tracking-wider min-w-[200px]">
                    Room Information
                  </th>
                  {rackDates.map((rd, i) => (
                    <th key={rd.dateStr} className={`p-3 text-center text-xs font-semibold border-b border-[var(--line)] uppercase tracking-wider ${i === 0 ? 'text-[var(--accent)] font-bold bg-[rgba(108,79,209,0.02)]' : 'text-[var(--text-3)]'}`}>
                      {rd.label} {i === 0 && '(Today)'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(roomsByFloor).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-[var(--text-3)]">
                      No hotel rooms configured or found.
                    </td>
                  </tr>
                ) : (
                  Object.entries(roomsByFloor).map(([floor, rooms]) => (
                    <tr key={floor}>
                      <td colSpan={8} className="p-0">
                        <table className="w-full table-fixed">
                          <thead>
                            <tr className="bg-[var(--f-bg)]">
                              <td colSpan={8} className="p-2 text-xs font-bold text-[var(--text)] border-b border-t border-[var(--line)]">
                                {floor}
                              </td>
                            </tr>
                          </thead>
                          <tbody>
                            {rooms.map(room => {
                              return (
                                <tr key={room.id} className="hover:bg-[rgba(214,210,203,0.1)]">
                                  {/* Room description column */}
                                  <td className="p-3 text-sm border-b border-[var(--line)] w-[200px]">
                                    <div className="font-semibold text-[var(--text)]">
                                      Room {room.roomNumber}
                                    </div>
                                    <div className="text-xs text-[var(--text-3)] capitalize">
                                      {room.roomType || 'Standard'}
                                    </div>
                                  </td>

                                  {/* Days schedule grids */}
                                  {rackDates.map((rd, idx) => {
                                    // Status and meta matching logic
                                    let status = 'AVAILABLE';
                                    let guestName = '';
                                    let checkOutDate = '';

                                    if (idx === 0) {
                                      // Utilize direct room status mapping if on current day
                                      status = room.status || 'AVAILABLE';
                                      if (room.isOccupied) {
                                        status = 'OCCUPIED';
                                        guestName = room.guestName || 'Occupied';
                                      } else if (room.reservation) {
                                        status = 'RESERVED';
                                        guestName = room.reservation?.customer?.username || room.reservation?.customerName || 'Reserved';
                                      }
                                    } else {
                                      // Future reservations logic fallback simulation
                                      if (room.futureReservations?.some(f => f.startDate <= rd.dateStr && f.endDate >= rd.dateStr)) {
                                        status = 'RESERVED';
                                        const resMatch = room.futureReservations.find(f => f.startDate <= rd.dateStr && f.endDate >= rd.dateStr);
                                        guestName = resMatch?.guestName || 'Reserved';
                                      }
                                    }

                                    // Color mapping
                                    let cellColor = 'var(--go)';
                                    if (status === 'OCCUPIED') cellColor = 'var(--info)';
                                    if (status === 'RESERVED') cellColor = 'var(--accent)';
                                    if (status === 'DIRTY') cellColor = 'var(--hold)';
                                    if (status === 'MAINTENANCE') cellColor = 'var(--stop)';

                                    const displayTooltip = status === 'OCCUPIED' || status === 'RESERVED';

                                    return (
                                      <td key={rd.dateStr} className="p-2 border-b border-r border-[var(--line)] text-center relative">
                                        {displayTooltip ? (
                                          <Tooltip
                                            content={
                                              <div className="text-xs p-1">
                                                <p className="font-semibold">{guestName}</p>
                                                <p className="opacity-80">Status: {status}</p>
                                                {checkOutDate && <p className="opacity-80">Checkout: {checkOutDate}</p>}
                                              </div>
                                            }
                                          >
                                            <div
                                              style={{ backgroundColor: cellColor }}
                                              className="h-9 rounded flex items-center justify-center text-[10px] font-bold text-[var(--text)] cursor-pointer:brightness-95 transition-all shadow-sm"
                                            >
                                              {status.slice(0, 3)}
                                            </div>
                                          </Tooltip>
                                        ) : (
                                          <div
                                            style={{ backgroundColor: cellColor }}
                                            onClick={() => {
                                              if (status === 'AVAILABLE') {
                                                setWalkInForm(prev => ({
                                                  ...prev,
                                                  roomId: room.id
                                                }));
                                                setWalkInOpen(true);
                                              }
                                            }}
                                            className="h-9 rounded flex items-center justify-center text-[10px] font-bold text-[var(--text)] cursor-pointer:brightness-95 transition-all shadow-sm"
                                            title={status === 'AVAILABLE' ? 'Click to Book for this date' : status}
                                          >
                                            {status.slice(0, 3)}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Hotel Front Desk</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">
            Overview of arrivals, in-house guests, checkouts and reservations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={loadData} className="border border-[var(--line)] flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh Desk
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Arrivals Today"
          value={arrivals.length}
          icon={LogIn}
          color="var(--accent)"
        />
        <StatCard
          label="In-House Guests"
          value={inHouse.length}
          icon={BedDouble}
          color="var(--info)"
        />
        <StatCard
          label="Departures Today"
          value={departures.length}
          icon={LogOut}
          color="var(--hold)"
        />
        <StatCard
          label="Available Rooms"
          value={availableRoomsCount}
          icon={Calendar}
          color="var(--go)"
        />
      </div>

      {/* Page Navigation Tabs */}
      <Tabs
        tabs={tabConfig}
        defaultIndex={activeTab}
        onChange={setActiveTab}
      />

      {/* MODAL 1: Walk-In Booking Form */}
      <Dialog
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        title="Walk-In Booking Registration"
        className="max-w-lg"
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Guest Full Name *"
              required
              placeholder="e.g. Alice Vance"
              value={walkInForm.guestName}
              onChange={(e) => setWalkInForm(prev => ({ ...prev, guestName: e.target.value }))}
            />
            <Input
              label="Phone Number"
              placeholder="+233..."
              value={walkInForm.phone}
              onChange={(e) => setWalkInForm(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assign Room *"
              required
              value={walkInForm.roomId}
              onChange={(e) => setWalkInForm(prev => ({ ...prev, roomId: e.target.value }))}
              options={[
                { label: 'Select Room...', value: '' },
                ...availableRoomsList.map(r => ({
                  label: `Room ${r.roomNumber} - ${r.roomType || 'Standard'}`,
                  value: r.id
                }))
              ]}
            />
            <Input
              label="Nights Stay *"
              type="number"
              min={1}
              required
              value={walkInForm.nights}
              onChange={(e) => setWalkInForm(prev => ({ ...prev, nights: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Deposit Received (USDC)"
              type="number"
              min={0}
              step="any"
              value={walkInForm.depositUsdc}
              onChange={(e) => setWalkInForm(prev => ({ ...prev, depositUsdc: e.target.value }))}
            />
          </div>

          <Input
            label="Notes / Special Requirements"
            placeholder="e.g. Extra towels, quiet room request"
            value={walkInForm.notes}
            onChange={(e) => setWalkInForm(prev => ({ ...prev, notes: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
            <Button variant="ghost" type="button" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionPending}>
              Create Booking
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: Move Room Form */}
      <Dialog
        open={moveRoomOpen}
        onClose={() => setMoveRoomOpen(false)}
        title="Move Room Allocation"
        className="max-w-md"
      >
        <form onSubmit={handleMoveRoomSubmit} className="space-y-4 pt-3">
          <div className="bg-[var(--f-bg)] p-3 rounded border border-[var(--line)] text-sm space-y-1">
            <p className="text-[var(--text-3)]">Guest Name: <strong className="text-[var(--text)]">{moveRoomForm.guestName}</strong></p>
            <p className="text-[var(--text-3)]">Current Room: <strong className="text-[var(--text)]">{moveRoomForm.currentRoomNumber}</strong></p>
          </div>

          <Select
            label="Select New Room *"
            required
            value={moveRoomForm.newRoomId}
            onChange={(e) => setMoveRoomForm(prev => ({ ...prev, newRoomId: e.target.value }))}
            options={[
              { label: 'Select Room...', value: '' },
              ...availableRoomsList.map(r => ({
                label: `Room ${r.roomNumber} - ${r.roomType || 'Standard'}`,
                value: r.id
              }))
            ]}
          />

          <Input
            label="Reason for Room Move *"
            required
            placeholder="e.g. AC unit malfunction, guest request"
            value={moveRoomForm.reason}
            onChange={(e) => setMoveRoomForm(prev => ({ ...prev, reason: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
            <Button variant="ghost" type="button" onClick={() => setMoveRoomOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionPending}>
              Update Room
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 3: Check-out Confirmation */}
      <Dialog
        open={checkoutConfirmOpen}
        onClose={() => setCheckoutConfirmOpen(false)}
        title="Confirm Guest Check-Out"
        className="max-w-md"
      >
        <div className="space-y-4 pt-3">
          <div className="bg-[rgba(222,168,50,0.05)] border border-[var(--hold)] p-4 rounded-lg flex items-start gap-3">
            <Info className="text-[var(--hold)] shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="font-semibold text-[var(--text)]">Review Checkout Details</p>
              <p className="text-[var(--text-3)] mt-1">
                You are checking out <strong className="text-[var(--text)]">{checkoutConfirmData.guestName}</strong> from Room <strong className="text-[var(--text)]">{checkoutConfirmData.roomNumber}</strong>.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[var(--f-bg)] rounded border border-[var(--line)] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Outstanding Balance:</span>
              <strong className={checkoutConfirmData.balanceDue > 0 ? 'text-[var(--stop)] font-bold' : 'text-[var(--go)] font-bold'}>
                {checkoutConfirmData.balanceDue ? `${checkoutConfirmData.balanceDue} USDC` : 'Settled'}
              </strong>
            </div>
            <div className="flex justify-between border-t border-[var(--line)] pt-2 mt-1">
              <span className="text-[var(--text-3)]">Housekeeping Task:</span>
              <span className="text-[var(--text)] font-medium">Automatic Clean Created (DIRTY)</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-3)] italic">
            Note: Once finalized, Room {checkoutConfirmData.roomNumber} will immediately set to DIRTY status to notify cleaning crews.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
            <Button variant="ghost" type="button" onClick={() => setCheckoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={actionPending}
              className="bg-[var(--hold)]:bg-[var(--hold)] text-[var(--text)]"
            >
              Confirm Checkout
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
