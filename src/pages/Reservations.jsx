import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locations } from '@/lib/api';
import { reservations, bookingOpsApi } from '@/lib/marketplaceApi';
import { 
  Card, 
  Button, 
  Badge, 
  Skeleton, 
  Empty, 
  Modal, 
  Input, 
  Select, 
  Textarea, 
  Tabs, 
  Progress 
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
// Widget replaced by KpiCard/Card
import { fmtUSDC, fmt, formatDateTime, relativeTime, cn } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Eye, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  UserX, 
  RefreshCw, 
  Info, 
  Check, 
  CornerDownRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const RESERVATION_STATUS = {
  PENDING: { label: 'Pending', color: 'var(--f-warn)' },
  CONFIRMED: { label: 'Confirmed', color: 'var(--f-info)' },
  CHECKED_IN: { label: 'Checked In', color: 'var(--f-tint-color)' },
  COMPLETED: { label: 'Completed', color: 'var(--f-ok)' },
  CANCELLED: { label: 'Cancelled', color: 'var(--f-bad)' },
  NO_SHOW: { label: 'No-Show', color: 'var(--f-bad)' },
};

export default function Reservations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // View States
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'calendar'
  const [showSlotsPanel, setShowSlotsPanel] = useState(false);

  // Filters
  const [locationId, setLocationId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action States
  const [cancelReservation, setCancelReservation] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const [rescheduleReservation, setRescheduleReservation] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  const [noShowReservation, setNoShowReservation] = useState(null);

  // Calendar Pagination State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Overbooking mode state
  const [overbookingAllowed, setOverbookingAllowed] = useState(false);

  // Fetch Locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  });
  const locationList = locationsData?.locations || [];

  // Fetch Dashboard details to sync Overbooking & stats
  const { data: dashboardData } = useQuery({
    queryKey: ['bookingDashboard'],
    queryFn: () => bookingOpsApi.bookingDashboard(),
  });

  useEffect(() => {
    if (dashboardData?.overbookingAllowed !== undefined) {
      setOverbookingAllowed(dashboardData.overbookingAllowed);
    }
  }, [dashboardData]);

  // Fetch Reservations Stats
  const { data: statsData } = useQuery({
    queryKey: ['reservation-stats'],
    queryFn: () => reservations.stats(),
  });
  const stats = statsData?.stats || {};

  // Fetch Reservations List
  const { data: resData, isLoading, isError, refetch } = useQuery({
    queryKey: ['reservations', locationId, statusFilter, dateRange, searchQuery],
    queryFn: () => reservations.list({
      locationId: locationId !== 'all' ? locationId : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      search: searchQuery || undefined,
    }),
  });
  const reservationList = resData?.reservations || [];

  // Fetch Slot Preview (Next 7 days)
  const { data: slotPreviewData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['slotsPreview'],
    queryFn: () => bookingOpsApi.slotsPreview({ days: 7 }),
    enabled: showSlotsPanel,
  });
  const slotsPreview = slotPreviewData?.slots || [];

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: (id) => reservations.confirm(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Reservation confirmed', variant: 'success' });
      qc.invalidateQueries(['reservations']);
      qc.invalidateQueries(['reservation-stats']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => reservations.cancel(id, reason),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Reservation cancelled', variant: 'success' });
      setCancelReservation(null);
      setCancelReason('');
      qc.invalidateQueries(['reservations']);
      qc.invalidateQueries(['reservation-stats']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const checkInMutation = useMutation({
    mutationFn: (id) => reservations.checkIn(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Guest checked in successfully', variant: 'success' });
      qc.invalidateQueries(['reservations']);
      qc.invalidateQueries(['reservation-stats']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id) => reservations.checkOut(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Guest checked out successfully', variant: 'success' });
      qc.invalidateQueries(['reservations']);
      qc.invalidateQueries(['reservation-stats']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const noShowMutation = useMutation({
    mutationFn: (id) => reservations.markNoShow(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Marked as No-Show. Penalties applied.', variant: 'success' });
      setNoShowReservation(null);
      qc.invalidateQueries(['reservations']);
      qc.invalidateQueries(['reservation-stats']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, data }) => bookingOpsApi.proposeReschedule(id, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Reschedule proposed to customer', variant: 'success' });
      setRescheduleReservation(null);
      setRescheduleDate('');
      setRescheduleNotes('');
      qc.invalidateQueries(['reservations']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const respondRescheduleMutation = useMutation({
    mutationFn: ({ id, accept }) => bookingOpsApi.respondReschedule(id, accept),
    onSuccess: (_, variables) => {
      toast({ 
        title: 'Success', 
        description: variables.accept ? 'Reschedule proposal accepted' : 'Reschedule proposal rejected', 
        variant: 'success' 
      });
      qc.invalidateQueries(['reservations']);
      qc.invalidateQueries(['reservation-stats']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Action failed', variant: 'destructive' }),
  });

  const overbookingMutation = useMutation({
    mutationFn: (allowed) => bookingOpsApi.setOverbooking(allowed),
    onSuccess: (data, allowed) => {
      setOverbookingAllowed(allowed);
      toast({ 
        title: 'Settings Updated', 
        description: allowed ? 'Overbooking is now enabled' : 'Overbooking is now disabled', 
        variant: 'success' 
      });
      qc.invalidateQueries(['bookingDashboard']);
    },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Failed to update settings', variant: 'destructive' }),
  });

  // Filtered reservations logic
  const filteredReservations = reservationList.filter(res => {
    // Front-end safety filtering if backend list parameters aren't fully robust
    if (locationId !== 'all' && res.locationId !== locationId) return false;
    if (statusFilter !== 'all' && res.status !== statusFilter) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchRef = res.reference?.toLowerCase().includes(query);
      const matchCustomer = res.customerName?.toLowerCase().includes(query) || res.azamanId?.toLowerCase().includes(query);
      if (!matchRef && !matchCustomer) return false;
    }

    if (dateRange.start) {
      const resDate = new Date(res.scheduledFor || res.createdAt);
      if (resDate < new Date(dateRange.start)) return false;
    }
    if (dateRange.end) {
      const resDate = new Date(res.scheduledFor || res.createdAt);
      const endLimit = new Date(dateRange.end);
      endLimit.setHours(23, 59, 59, 999);
      if (resDate > endLimit) return false;
    }

    return true;
  });

  // Calendar Helper Logic (Month Grid)
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Pad previous month's days
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Pad next month's days to fill up full grid weeks
    const totalSlots = 42; // 6 rows of 7 days
    const nextPadding = totalSlots - days.length;
    for (let i = 1; i <= nextPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const calendarDays = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getReservationsForDate = (date) => {
    return filteredReservations.filter(res => {
      const resDate = new Date(res.scheduledFor || res.createdAt);
      return (
        resDate.getDate() === date.getDate() &&
        resDate.getMonth() === date.getMonth() &&
        resDate.getFullYear() === date.getFullYear()
      );
    });
  };

  return (
    <div className="min-h-screen bg-[var(--f-bg)] text-[var(--f-text)] p-6 ">
      {/* Upper Dashboard Header & Fast Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--f-text)] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--f-info)]" />
            Reservations Console
          </h1>
          <p className="text-sm text-[var(--f-text-3)]">
            Unified status deck, reschedule negotiations, slot previews, and customer trust ratings.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Overbooking Mode Controller */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
            <SlidersHorizontal className="w-4 h-4 text-[var(--f-text-3)]" />
            <span className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Overbooking Mode</span>
            <button
              onClick={() => overbookingMutation.mutate(!overbookingAllowed)}
              disabled={overbookingMutation.isPending}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                overbookingAllowed ? "bg-[var(--f-info)]" : "bg-[var(--f-line)]"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--f-bg)] shadow ring-0 transition duration-200 ease-in-out",
                  overbookingAllowed ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowSlotsPanel(!showSlotsPanel)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showSlotsPanel ? "Hide Slot Preview" : "Show Slot Preview"}
          </Button>

          <Button
            variant="secondary"
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-[var(--f-line)] text-[var(--f-text-3)]:text-[var(--f-text)]"
            title="Reload Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Numerical Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="All Bookings" icon={Calendar} iconColor="var(--f-info)">
          <KpiCardStat value={fmt(stats.total || filteredReservations.length, 0)} label="Total reservation scope" />
        </KpiCard>
        <KpiCard title="Pending Confirmation" icon={Clock} iconColor="var(--f-warn)">
          <KpiCardStat value={fmt(stats.pending || 0, 0)} label="Requires verification" color="var(--f-warn)" />
        </KpiCard>
        <KpiCard title="Checked In" icon={CheckCircle2} iconColor="var(--f-tint-color)">
          <KpiCardStat value={fmt(stats.checkedIn || 0, 0)} label="Currently on premises" color="var(--f-tint-color)" />
        </KpiCard>
        <KpiCard title="No-Shows / Reschedules" icon={UserX} iconColor="var(--f-bad)">
          <KpiCardStat value={fmt(stats.noShows || 0, 0)} label="No-shows reported" color="var(--f-bad)" />
        </KpiCard>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Work Console Container */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Hybrid View Selector + Filters Toolbar */}
          <Card className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-[var(--f-line)] pb-4">
              <div className="flex items-center gap-1.5 p-1 bg-[var(--f-bg)] rounded-xl border border-[var(--f-line)] w-fit">
                <button
                  onClick={() => setActiveTab('list')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    activeTab === 'list' 
                      ? "bg-[var(--f-surface)] text-[var(--f-info)] border border-[var(--f-line)] shadow" 
                      : "text-[var(--f-text-3)]:text-[var(--f-text)]"
                  )}
                >
                  Filtered List
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    activeTab === 'calendar' 
                      ? "bg-[var(--f-surface)] text-[var(--f-info)] border border-[var(--f-line)] shadow" 
                      : "text-[var(--f-text-3)]:text-[var(--f-text)]"
                  )}
                >
                  Calendar Hybrid Grid
                </button>
              </div>

              {/* Fast Location Selector & Status Filter Bubbles */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--f-bg)] border border-[var(--f-line)] text-[var(--f-text)] focus:border-[var(--f-info)] outline-none cursor-pointer"
                >
                  <option value="all">All Locations</option>
                  {locationList.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 bg-[var(--f-bg)] p-1 rounded-lg border border-[var(--f-line)]">
                  {['all', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'NO_SHOW'].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors uppercase tracking-wider",
                        statusFilter === status
                          ? "bg-[var(--f-info)] text-[var(--f-bg)]"
                          : "text-[var(--f-text-3)]:text-[var(--f-text)]"
                      )}
                    >
                      {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Filters & Search (Reference / Customer Name) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--f-text-3)]" />
                <input
                  type="text"
                  placeholder="Search reservationRef or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-[var(--f-bg)] border border-[var(--f-line)] text-[var(--f-text)] placeholder:text-[var(--f-text-3)] outline-none focus:border-[var(--f-info)] focus:ring-1 focus:ring-[var(--f-info)] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--f-text-3)] flex-shrink-0">From:</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--f-bg)] border border-[var(--f-line)] text-[var(--f-text)] focus:border-[var(--f-info)] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--f-text-3)] flex-shrink-0">To:</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--f-bg)] border border-[var(--f-line)] text-[var(--f-text)] focus:border-[var(--f-info)] outline-none"
                />
              </div>
            </div>
          </Card>

          {/* MAIN VIEWPORT */}
          {isLoading ? (
            <div className="space-y-4">
              <Skel className="h-20 w-full" />
              <Skel className="h-64 w-full" />
            </div>
          ) : isError ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center border-[var(--f-bad)] bg-[#ef444405]">
              <AlertCircle className="w-10 h-10 text-[var(--f-bad)] mb-3" />
              <p className="text-base font-bold text-[var(--f-text)]">Failed to retrieve reservations</p>
              <p className="text-sm text-[var(--f-text-3)] mt-1 max-w-sm">
                There was a network error fetching your booking details. Please refresh the query deck.
              </p>
              <Button variant="secondary" onClick={() => refetch()} className="mt-4">
                Retry Query
              </Button>
            </Card>
          ) : filteredReservations.length === 0 ? (
            <Card className="p-0">
              <Empty
                icon={Calendar}
                title="No Reservations Found"
                description="Adjust your search criteria, selected location, or filters to view reservation bookings."
                action={
                  <Button variant="outline" onClick={() => {
                    setLocationId('all');
                    setStatusFilter('all');
                    setDateRange({ start: '', end: '' });
                    setSearchQuery('');
                  }}>
                    Reset Filters
                  </Button>
                }
              />
            </Card>
          ) : activeTab === 'calendar' ? (
            /* Calendar Hybrid View Grid */
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--f-line)] pb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--f-text)]">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg border border-[var(--f-line)]:bg-[var(--f-bg)] transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--f-text-3)]:text-[var(--f-text)]" />
                  </button>
                  <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1 text-xs font-semibold border border-[var(--f-line)] rounded-lg:bg-[var(--f-bg)] transition"
                  >
                    Today
                  </button>
                  <button 
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg border border-[var(--f-line)]:bg-[var(--f-bg)] transition"
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--f-text-3)]:text-[var(--f-text)]" />
                  </button>
                </div>
              </div>

              {/* Day names headers */}
              <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-[10px] font-bold text-[var(--f-text-3)] uppercase tracking-widest py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Month calendar cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell, idx) => {
                  const dayReservations = getReservationsForDate(cell.date);
                  const isToday = new Date().toDateString() === cell.date.toDateString();

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all",
                        cell.isCurrentMonth 
                          ? "bg-[var(--f-bg)] border-[var(--f-line)]" 
                          : "bg-black/10 border-[var(--f-line)] opacity-40",
                        isToday && "border-[var(--f-info)] ring-1 ring-[var(--f-info)]"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn(
                          "text-xs font-bold",
                          isToday ? "text-[var(--f-info)]" : "text-[var(--f-text-3)]"
                        )}>
                          {cell.date.getDate()}
                        </span>
                        {dayReservations.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--f-line)] text-[var(--f-text)] font-semibold">
                            {dayReservations.length}
                          </span>
                        )}
                      </div>

                      {/* Displaying Colored Block reservations inside current cell */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                        {dayReservations.slice(0, 3).map((res) => {
                          const statusMeta = RESERVATION_STATUS[res.status] || RESERVATION_STATUS.PENDING;
                          return (
                            <div
                              key={res.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate border flex flex-col"
                              style={{ 
                                backgroundColor: `${statusMeta.color}15`, 
                                borderColor: `${statusMeta.color}35`,
                                color: statusMeta.color 
                              }}
                            >
                              <div className="font-semibold truncate">
                                {res.customerName || res.reference || 'Guest'}
                              </div>
                              <div className="text-[8px] opacity-80 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(res.scheduledFor || res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                        {dayReservations.length > 3 && (
                          <div className="text-[9px] text-[var(--f-text-3)] text-center font-semibold pt-0.5">
                            + {dayReservations.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            /* Filtered Table List View */
            <div className="space-y-4">
              {filteredReservations.map((res) => {
                const statusMeta = RESERVATION_STATUS[res.status] || RESERVATION_STATUS.PENDING;
                const locationName = locationList.find(loc => loc.id === res.locationId)?.name || 'Unknown Location';
                const hasProposedReschedule = res.proposedStartDatetime ? true : false;

                return (
                  <Card key={res.id} className="p-5 border-[var(--f-line)] bg-[var(--f-surface)]:border-slate-700 transition duration-150">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Customer + Location Context */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--f-line)] flex items-center justify-center flex-shrink-0 border border-slate-700">
                          <span className="text-sm font-bold text-[var(--f-info)]">
                            {(res.customerName || res.azamanId || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[var(--f-text)]">
                              {res.customerName || 'Anonymous Guest'}
                            </span>
                            <Tag variant="neutral" className="text-[10px] tracking-widest uppercase">
                              {res.reference || 'No Ref'}
                            </Tag>
                            
                            {/* Reschedule Proposal Indicator Badge */}
                            {hasProposedReschedule && (
                              <Tag variant="neutral" className="animate-pulse text-[10px]">
                                Reschedule Proposed
                              </Tag>
                            )}

                            {/* Trust Rating Metric Indicator */}
                            {res.customerTrustScore !== undefined && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--f-info)] px-2 py-0.5 rounded-full bg-[var(--f-info)]">
                                Trust: {res.customerTrustScore}%
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[var(--f-text-3)] mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] font-medium">
                              <MapPin className="w-3 h-3 text-[var(--f-text-3)]" />
                              {locationName}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium">
                              <Calendar className="w-3 h-3 text-[var(--f-text-3)]" />
                              {formatDateTime(res.scheduledFor || res.createdAt)}
                            </span>
                            {res.partySize && (
                              <span className="flex items-center gap-1 text-[10px] font-medium">
                                <Users className="w-3 h-3 text-[var(--f-text-3)]" />
                                {res.partySize} Guests
                              </span>
                            )}
                          </div>

                          {/* Message / Proposed rescheduling block info */}
                          {hasProposedReschedule && (
                            <div className="mt-3 p-3 rounded-xl bg-[var(--f-bg)] border border-[var(--f-warn)]/20 flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 text-[var(--f-warn)] text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                Reschedule Requested by customer
                              </div>
                              <p className="text-xs text-[var(--f-text)] flex items-center gap-2">
                                <span className="line-through text-[var(--f-text-3)]">
                                  {formatDateTime(res.scheduledFor || res.createdAt)}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-[var(--f-text-3)]" />
                                <span className="font-semibold text-[var(--f-info)]">
                                  {formatDateTime(res.proposedStartDatetime)}
                                </span>
                              </p>
                              {res.rescheduleReason && (
                                <p className="text-xs text-[var(--f-text-3)] italic">
                                  "{res.rescheduleReason}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Status Badge, Amount, and Action Center */}
                      <div className="flex items-center justify-between lg:justify-end gap-6 flex-wrap lg:flex-nowrap border-t lg:border-t-0 border-[var(--f-line)] pt-3 lg:pt-0">
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-[var(--f-text-3)] font-medium">Total Price</p>
                          <p className="text-base font-bold text-[var(--f-info)] tracking-tight f-mono">
                            {res.amountUsdc ? fmtUSDC(res.amountUsdc) : "—"}
                          </p>
                          <div className="mt-1">
                            <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                          </div>
                        </div>

                        {/* Inline Actions Selector */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Accept / Reject Customer Proposed Reschedule */}
                          {hasProposedReschedule && (
                            <div className="flex items-center gap-1.5 p-1 bg-[var(--f-bg)] border border-[var(--f-warn)]/35 rounded-xl">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => respondRescheduleMutation.mutate({ id: res.id, accept: true })}
                                disabled={respondRescheduleMutation.isPending}
                                className="px-2.5 py-1 text-[10px] bg-[var(--f-ok)] text-[var(--f-text)]:bg-ok h-7"
                              >
                                Accept Prop
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => respondRescheduleMutation.mutate({ id: res.id, accept: false })}
                                disabled={respondRescheduleMutation.isPending}
                                className="px-2.5 py-1 text-[10px] text-[var(--f-bad)] border-[var(--f-bad)]/40:bg-[var(--f-bad)]/10 h-7"
                              >
                                Decline Prop
                              </Button>
                            </div>
                          )}

                          {/* CONFIRM reservation */}
                          {res.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => confirmMutation.mutate(res.id)}
                              disabled={confirmMutation.isPending}
                              className="text-xs h-8 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirm Booking
                            </Button>
                          )}

                          {/* CHECK-IN / CHECK-OUT */}
                          {res.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => checkInMutation.mutate(res.id)}
                              disabled={checkInMutation.isPending}
                              className="text-xs h-8 border-[var(--f-info)] text-[var(--f-info)]:bg-[var(--f-info)]/10"
                            >
                              Check-In Guest
                            </Button>
                          )}

                          {res.status === 'CHECKED_IN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => checkOutMutation.mutate(res.id)}
                              disabled={checkOutMutation.isPending}
                              className="text-xs h-8 border-[var(--f-ok)] text-[var(--f-ok)]:bg-[var(--f-ok)]/10"
                            >
                              Check-Out
                            </Button>
                          )}

                          {/* Propose reschedule (Business initiated) */}
                          {['PENDING', 'CONFIRMED'].includes(res.status) && !hasProposedReschedule && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setRescheduleReservation(res);
                                setRescheduleDate(res.scheduledFor ? new Date(res.scheduledFor).toISOString().slice(0, 16) : '');
                              }}
                              className="text-xs h-8 text-[var(--f-warn)] border-[var(--f-warn)]/20:bg-[var(--f-warn)]/5"
                            >
                              Reschedule
                            </Button>
                          )}

                          {/* Mark No Show */}
                          {res.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setNoShowReservation(res)}
                              className="text-xs h-8 text-[var(--f-bad)] border-[var(--f-bad)]/20:bg-[var(--f-bad)]/5"
                            >
                              No-Show
                            </Button>
                          )}

                          {/* Cancel Booking */}
                          {['PENDING', 'CONFIRMED'].includes(res.status) && (
                            <button
                              onClick={() => setCancelReservation(res)}
                              className="p-2 rounded-lg:bg-[var(--f-line)] text-[var(--f-text-3)]:text-[var(--f-bad)] transition-colors h-8 w-8 flex items-center justify-center border border-slate-800"
                              title="Decline/Cancel Booking"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Slots Preview Side Panel */}
        {showSlotsPanel && (
          <div className="w-[340px] flex-shrink-0 animate-scale-in">
            <Card className="sticky top-6 p-4 border-[var(--f-line)] bg-[var(--f-surface)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--f-line)] pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--f-info)]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--f-text)]">
                    Slots Monitor (7 Days)
                  </h3>
                </div>
                <button
                  onClick={() => setShowSlotsPanel(false)}
                  className="text-xs font-bold text-[var(--f-text-3)]:text-[var(--f-text)]"
                >
                  Close
                </button>
              </div>

              {isLoadingSlots ? (
                <div className="space-y-2.5">
                  {[...Array(5)].map((_, i) => (
                    <Skel key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : slotsPreview.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[var(--f-text-3)]">No slot configurations listed on the server.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {slotsPreview.map((slot, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "p-3 rounded-xl border flex flex-col gap-1.5 transition-all",
                        slot.isOpen 
                          ? "bg-[var(--f-bg)] border-[var(--f-line)]" 
                          : "bg-[var(--f-bad)]/5 border-red-500/15 opacity-60"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[var(--f-text)]">
                          {slot.date ? new Date(slot.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : `Day ${index + 1}`}
                        </span>
                        <Tag 
                          color={slot.isOpen ? "var(--f-ok)" : "var(--f-bad)"}
                          className="text-[9px] tracking-wider uppercase font-semibold"
                        >
                          {slot.isOpen ? "Open" : "Closed"}
                        </Tag>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[var(--f-text-3)]">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3 h-3 text-[var(--f-text-3)]" />
                          {slot.bookedCount || 0} Booked
                        </span>
                        <span>
                          Remaining: {slot.remainingSlots !== undefined ? slot.remainingSlots : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-xl bg-[var(--f-info)]/5 border border-blue-500/10 flex gap-2">
                <Info className="w-4 h-4 text-[var(--f-info)] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[var(--f-text-3)] leading-normal">
                  This preview lets you audit what external customers see on the main marketplace scheduling feed.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: Cancel / Decline Reservation */}
      <Modal
        open={cancelReservation !== null}
        onClose={() => { setCancelReservation(null); setCancelReason(''); }}
        title="Decline / Cancel Reservation"
        className="max-w-md"
      >
        {cancelReservation && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--f-bg)] border border-[var(--f-line)]">
              <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Reservation Reference</p>
              <p className="text-sm font-bold text-[var(--f-text)] mt-0.5">{cancelReservation.reference}</p>
              
              <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mt-3">Customer Name</p>
              <p className="text-sm font-bold text-[var(--f-text)] mt-0.5">{cancelReservation.customerName || 'Anonymous'}</p>
            </div>

            <Textarea
              label="Reason for Cancellation"
              placeholder="Provide a detailed explanation (visible to customer)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />

            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--f-warn)]/5 border border-amber-500/10">
              <Info className="w-4 h-4 text-[var(--f-warn)] flex-shrink-0" />
              <p className="text-[11px] text-[var(--f-text-3)]">
                The customer will be notified, and the smart contract escrow balance will be fully refunded.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button 
                variant="secondary" 
                onClick={() => { setCancelReservation(null); setCancelReason(''); }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => cancelMutation.mutate({ id: cancelReservation.id, reason: cancelReason })}
                disabled={cancelMutation.isPending || !cancelReason}
                className="bg-[var(--f-bad)] text-[var(--f-text)]:bg-red-600"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Propose Reschedule */}
      <Modal
        open={rescheduleReservation !== null}
        onClose={() => { setRescheduleReservation(null); setRescheduleDate(''); setRescheduleNotes(''); }}
        title="Propose Alternative Time Slot"
        className="max-w-md"
      >
        {rescheduleReservation && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--f-bg)] border border-[var(--f-line)]">
              <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Current Schedule</p>
              <p className="text-sm font-bold text-[var(--f-text)] mt-0.5">
                {formatDateTime(rescheduleReservation.scheduledFor || rescheduleReservation.createdAt)}
              </p>
            </div>

            <Input
              type="datetime-local"
              label="Proposed Date & Time"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              required
            />

            <Textarea
              label="Message to Customer"
              placeholder="Explain why you are requesting this rescheduled time..."
              value={rescheduleNotes}
              onChange={(e) => setRescheduleNotes(e.target.value)}
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button 
                variant="secondary" 
                onClick={() => { setRescheduleReservation(null); setRescheduleDate(''); setRescheduleNotes(''); }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => rescheduleMutation.mutate({ 
                  id: rescheduleReservation.id, 
                  data: {
                    proposedStartDatetime: new Date(rescheduleDate).toISOString(),
                    businessNotes: rescheduleNotes
                  } 
                })}
                disabled={rescheduleMutation.isPending || !rescheduleDate}
              >
                Propose Reschedule
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: No-Show Penalty Warning Center */}
      <Modal
        open={noShowReservation !== null}
        onClose={() => setNoShowReservation(null)}
        title="Declare Customer No-Show"
        className="max-w-md"
      >
        {noShowReservation && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--f-bg)] border border-red-500/10 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[var(--f-bad)] font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-[var(--f-bad)]" />
                Deductible Smart Penalty Warnings
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                <div className="bg-[var(--f-surface)] p-2.5 rounded-lg border border-[var(--f-line)]">
                  <span className="text-[var(--f-text-3)] block text-[10px] uppercase tracking-wider">Computed Penalty</span>
                  <span className="text-sm font-bold text-[var(--f-text)] f-mono">
                    {fmtUSDC(noShowReservation.noShowPenaltyUsdc || noShowReservation.penaltyAmountUsdc || 0)}
                  </span>
                </div>

                <div className="bg-[var(--f-surface)] p-2.5 rounded-lg border border-[var(--f-line)]">
                  <span className="text-[var(--f-text-3)] block text-[10px] uppercase tracking-wider">Penalty Percentage</span>
                  <span className="text-sm font-bold text-[var(--f-text)] f-mono">
                    {noShowReservation.noShowPenaltyPct || 0}%
                  </span>
                </div>
              </div>

              {/* Customer trust level context alert box */}
              {noShowReservation.customerTrustScore !== undefined && (
                <div className={cn(
                  "p-3 rounded-lg border flex flex-col gap-1 mt-1",
                  noShowReservation.customerTrustScore < 80 
                    ? "bg-[var(--f-bad)]/5 border-red-500/10" 
                    : "bg-[var(--f-info)]/5 border-blue-500/10"
                )}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    Customer Trust Rating: {noShowReservation.customerTrustScore}%
                  </div>
                  {noShowReservation.customerTrustScore < 80 ? (
                    <p className="text-[10px] text-[var(--f-bad)] leading-normal">
                      This customer has a history of high cancel / no-show percentages. Full penalty deduction is highly recommended.
                    </p>
                  ) : (
                    <p className="text-[10px] text-[var(--f-text-3)] leading-normal">
                      This customer has maintained an exemplary rating of creditworthy transactions.
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--f-text-3)] leading-relaxed">
              Marking this reservation as No-Show triggers an immediate lock-and-charge function. The computed percentage penalty amount will be drawn from escrow to reimburse your business.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <Button 
                variant="secondary" 
                onClick={() => setNoShowReservation(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => noShowMutation.mutate(noShowReservation.id)}
                disabled={noShowMutation.isPending}
                className="bg-[var(--f-bad)] text-[var(--f-text)]:bg-red-600"
              >
                Confirm Penalty Deduction
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
