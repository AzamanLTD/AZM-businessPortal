import { useState, useEffect, useMemo, useCallback } from 'react';
import { shiftApi, employeeApi } from '@/lib/marketplaceApi';
import { usePermission } from '@/hooks/usePermission';
import { Card, Button, Badge, Input, Select, Modal, Empty, Skeleton, Avatar, StatCard, Tabs } from '@/components/ui';
import { useToast } from '@/components/forge';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
  Edit2, Trash2, Repeat, ArrowLeftRight, AlertCircle
} from 'lucide-react';

const STATUS_COLORS = {
  SCHEDULED: 'var(--f-tint-color)',
  IN_PROGRESS: 'var(--f-ok)',
  COMPLETED: 'var(--f-text-3)',
  NO_SHOW: 'var(--f-bad)',
  CANCELLED: 'var(--f-text-3)',
};

const SWAP_STATUS_COLORS = {
  PENDING: 'var(--f-warn)',
  APPROVED: 'var(--f-ok)',
  REJECTED: 'var(--f-bad)',
  CLAIMED: 'var(--f-tint-color)',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTimeRange(start, end) {
  if (!start || !end) return '—';
  const s = new Date(start), e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay
    ? `${s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : `${s.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })} – ${e.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(weekStart) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function shiftDuration(start, end) {
  if (!start || !end) return '—';
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Scheduling() {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [onDuty, setOnDuty] = useState([]);
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [rejectSwap, setRejectSwap] = useState(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', shiftDate: '', startTime: '', endTime: '', breakMinutes: 30, locationId: '', shiftLabel: '', notes: '' });
  const [rotationForm, setRotationForm] = useState({ employeeId: '', daysOfWeek: [], startTime: '09:00', endTime: '17:00', breakMinutes: 30, weeks: 4, shiftLabel: '' });

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split('T')[0];

      const [shiftRes, empRes, swapRes, dutyRes] = await Promise.all([
        shiftApi.list({ startDate, endDate: endDateStr }),
        employeeApi.list(),
        shiftApi.listSwaps(),
        shiftApi.teamOnDuty().catch(() => ({ data: { shifts: [] } })),
      ]);

      setShifts(shiftRes.data?.shifts || []);
      setEmployees(empRes.data?.employees || []);
      setSwaps(swapRes.data?.swaps || []);
      setOnDuty(dutyRes.data?.shifts || dutyRes.data?.onDuty || []);
    } catch (err) {
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  }, [weekStart, toast]);

  useEffect(() => { load(); }, [load]);

  const shiftsByDate = useMemo(() => {
    const map = {};
    shifts.forEach(s => {
      const key = new Date(s.shiftDate || s.startTime).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [shifts]);

  const pendingSwaps = swaps.filter(s => s.status === 'PENDING');
  const pastSwaps = swaps.filter(s => s.status !== 'PENDING');

  const handleSave = async () => {
    if (!form.employeeId || !form.shiftDate || !form.startTime || !form.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const startDateTime = new Date(`${form.shiftDate}T${form.startTime}`);
      const endDateTime = new Date(`${form.shiftDate}T${form.endTime}`);
      if (endDateTime <= startDateTime) { toast.error('End time must be after start time'); return; }
      const payload = {
        employeeId: form.employeeId,
        shiftDate: startDateTime.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        breakMinutes: parseInt(form.breakMinutes) || 30,
        locationId: form.locationId || null,
        shiftLabel: form.shiftLabel || null,
        notes: form.notes || null,
      };
      if (editShift) {
        await shiftApi.update(editShift.id, payload);
        toast.success('Shift updated');
      } else {
        await shiftApi.create(payload);
        toast.success('Shift created');
      }
      setAddOpen(false); setEditShift(null); resetForm(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save shift');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try { await shiftApi.remove(id); toast.success('Shift deleted'); load(); }
    catch (err) { toast.error('Failed to delete shift'); }
  };

  const handleNoShow = async (id) => {
    try { await shiftApi.markNoShow(id); toast.success('Marked as no-show'); load(); }
    catch (err) { toast.error('Failed to mark no-show'); }
  };

  const handleApproveSwap = async (id) => {
    try { await shiftApi.approveSwap(id); toast.success('Swap approved'); load(); }
    catch (err) { toast.error('Failed to approve swap'); }
  };

  const handleRejectSwap = async () => {
    if (!rejectSwap) return;
    try {
      await shiftApi.rejectSwap(rejectSwap.id, rejectSwap.note || 'Rejected by manager');
      toast.success('Swap rejected'); setRejectSwap(null); load();
    } catch (err) { toast.error('Failed to reject swap'); }
  };

  const handleCreateRotation = async () => {
    if (!rotationForm.employeeId || rotationForm.daysOfWeek.length === 0) {
      toast.error('Select an employee and at least one day'); return;
    }
    try {
      await shiftApi.createRotation({
        employeeId: rotationForm.employeeId,
        daysOfWeek: rotationForm.daysOfWeek.map(d => parseInt(d)),
        startTime: rotationForm.startTime,
        endTime: rotationForm.endTime,
        breakMinutes: parseInt(rotationForm.breakMinutes) || 30,
        weeks: parseInt(rotationForm.weeks) || 4,
        shiftLabel: rotationForm.shiftLabel || null,
      });
      toast.success('Rotation created'); setRotationOpen(false);
      setRotationForm({ employeeId: '', daysOfWeek: [], startTime: '09:00', endTime: '17:00', breakMinutes: 30, weeks: 4, shiftLabel: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create rotation'); }
  };

  const resetForm = () => { setForm({ employeeId: '', shiftDate: '', startTime: '', endTime: '', breakMinutes: 30, locationId: '', shiftLabel: '', notes: '' }); };

  const openEdit = (shift) => {
    setEditShift(shift);
    const date = new Date(shift.shiftDate || shift.startTime);
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    setForm({
      employeeId: shift.employeeId,
      shiftDate: date.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
      breakMinutes: shift.breakMinutes || 30,
      locationId: shift.locationId || '',
      shiftLabel: shift.shiftLabel || '',
      notes: shift.notes || '',
    });
    setAddOpen(true);
  };

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const thisWeek = () => setWeekStart(getWeekStart(new Date()));

  const employeeName = (shift) => {
    if (shift.employee?.user?.fullName) return shift.employee.user.fullName;
    if (shift.employee?.user?.username) return shift.employee.user.username;
    const emp = employees.find(e => e.id === shift.employeeId);
    return emp?.user?.fullName || emp?.user?.username || 'Unknown';
  };

  const tabs = [
    { label: 'Week Schedule', icon: Calendar },
    { label: `Swap Requests${pendingSwaps.length ? ` (${pendingSwaps.length})` : ''}`, icon: ArrowLeftRight },
    { label: 'On Duty Now', icon: Clock },
    { label: 'Rotations', icon: Repeat },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Scheduling</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">Manage shifts, swaps, and team scheduling.</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('shifts.create') && <Button onClick={() => { resetForm(); setEditShift(null); setAddOpen(true); }} size="md"><Plus className="w-4 h-4 mr-1" /> Add Shift</Button>}
          {hasPermission('shifts.create') && <Button variant="secondary" onClick={() => setRotationOpen(true)} size="md"><Repeat className="w-4 h-4 mr-1" /> Rotation</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This Week" value={shifts.length} sub="scheduled shifts" icon={Calendar} />
        <StatCard label="Pending Swaps" value={pendingSwaps.length} sub="awaiting approval" icon={ArrowLeftRight} color="var(--f-warn)" />
        <StatCard label="On Duty" value={onDuty.length} sub="clocked in now" icon={Clock} color="var(--f-ok)" />
        <StatCard label="No-Shows" value={shifts.filter(s => s.status === 'NO_SHOW').length} sub="this week" icon={AlertCircle} color="var(--f-bad)" />
      </div>

      <Tabs value={tab} onChange={setTab} items={tabs.map(t => t.label)} />

      {tab === 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
              <Button variant="ghost" size="sm" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <Button variant="ghost" size="sm" onClick={thisWeek}>Today</Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDates.map((date, idx) => {
                const dayShifts = shiftsByDate[date.toDateString()] || [];
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className="space-y-2">
                    <div className={`text-center pb-2 border-b ${isToday ? 'border-[var(--f-tint-color)]' : 'border-[var(--f-line)]'}`}>
                      <p className="text-xs text-[var(--f-text-3)]">{DAY_NAMES[idx]}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-[var(--f-tint-color)]' : ''}`}>{date.getDate()}</p>
                    </div>
                    <div className="space-y-2">
                      {dayShifts.length === 0 ? (
                        <p className="text-xs text-[var(--f-text-3)] text-center py-2">No shifts</p>
                      ) : (
                        dayShifts.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).map(shift => (
                          <Card key={shift.id} className="p-2.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openEdit(shift)}>
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{employeeName(shift)}</p>
                                <p className="text-[10px] text-[var(--f-text-3)] mt-0.5">
                                  {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                                </p>
                              </div>
                              <Badge color={STATUS_COLORS[shift.status] || 'var(--f-text-3)'} className="text-[9px] px-1.5 py-0.5">
                                {shift.status === 'IN_PROGRESS' ? 'ACTIVE' : shift.status}
                              </Badge>
                            </div>
                            {shift.shiftLabel && <p className="text-[10px] text-[var(--f-tint-color)] mt-1">{shift.shiftLabel}</p>}
                            {canManage(shift) && shift.status === 'SCHEDULED' && (
                              <div className="flex gap-1 mt-1.5">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(shift); }} className="text-[var(--f-text-3)] hover:text-[var(--f-tint-color)]"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(shift.id); }} className="text-[var(--f-text-3)] hover:text-[var(--f-bad)]"><Trash2 className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleNoShow(shift.id); }} className="text-[var(--f-text-3)] hover:text-[var(--f-warn)]"><AlertCircle className="w-3 h-3" /></button>
                              </div>
                            )}
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-4">
          {pendingSwaps.length === 0 && pastSwaps.length === 0 ? (
            <Empty icon={ArrowLeftRight} title="No swap requests" description="Swap requests from employees will appear here." />
          ) : (
            <>
              {pendingSwaps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--f-warn)]">Pending Approval</h3>
                  {pendingSwaps.map(swap => (
                    <Card key={swap.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Avatar size="sm" name={swap.requestingShift?.employee?.user?.fullName || 'Employee'} src={swap.requestingShift?.employee?.user?.avatarUrl} />
                            <div>
                              <p className="text-sm font-medium">{swap.requestingShift?.employee?.user?.fullName || 'Unknown'}</p>
                              <p className="text-xs text-[var(--f-text-3)]">
                                {formatDate(swap.requestingShift?.shiftDate)} · {formatTimeRange(swap.requestingShift?.startTime, swap.requestingShift?.endTime)}
                              </p>
                            </div>
                          </div>
                          {swap.reason && <p className="text-xs text-[var(--f-text-3)] mt-2">Reason: {swap.reason}</p>}
                        </div>
                        {hasPermission('shifts.approve_swap') && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApproveSwap(swap.id)}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => setRejectSwap({ id: swap.id, note: '' })}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              {pastSwaps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--f-text-3)]">History</h3>
                  {pastSwaps.slice(0, 10).map(swap => (
                    <Card key={swap.id} className="p-3 opacity-70">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{swap.requestingShift?.employee?.user?.fullName || 'Unknown'}</span>
                          <Badge color={SWAP_STATUS_COLORS[swap.status] || 'var(--f-text-3)'}>{swap.status}</Badge>
                        </div>
                        <span className="text-xs text-[var(--f-text-3)]">{formatDate(swap.requestedAt)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-4">
          {loading ? <Skeleton className="h-32 rounded-lg" /> : onDuty.length === 0 ? (
            <Empty icon={Clock} title="No one on duty" description="Employees currently clocked in will appear here." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {onDuty.map(shift => (
                <Card key={shift.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar size="md" name={employeeName(shift)} src={shift.employee?.user?.avatarUrl} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--f-ok)] border-2 border-[var(--f-surface)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{employeeName(shift)}</p>
                      <p className="text-xs text-[var(--f-text-3)]">Since {formatTime(shift.clockInTime || shift.startTime)}</p>
                    </div>
                    <Badge color="var(--f-ok)">ON DUTY</Badge>
                  </div>
                  <div className="mt-3 text-xs text-[var(--f-text-3)] space-y-1">
                    <p>Shift: {formatTimeRange(shift.startTime, shift.endTime)}</p>
                    <p>Duration: {shiftDuration(shift.clockInTime || shift.startTime, new Date().toISOString())}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 3 && (
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--f-tint-color)]/10">
              <Repeat className="w-5 h-5 text-[var(--f-tint-color)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Create Rotation Pattern</h3>
              <p className="text-xs text-[var(--f-text-3)] mt-1">Generate recurring shifts for an employee across multiple weeks.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Employee" value={rotationForm.employeeId} onChange={e => setRotationForm(f => ({ ...f, employeeId: e.target.value }))}
              options={[{ value: '', label: 'Select...' }, ...employees.map(emp => ({ value: emp.id, label: emp.user?.fullName || emp.user?.username || 'Unknown' }))]} />
            <div>
              <label className="text-sm font-medium mb-1.5 block">Days of Week</label>
              <div className="flex gap-1.5">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, idx) => (
                  <button key={idx} type="button"
                    onClick={() => setRotationForm(f => { const days = f.daysOfWeek.includes(idx) ? f.daysOfWeek.filter(d => d !== idx) : [...f.daysOfWeek, idx]; return { ...f, daysOfWeek: days }; })}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${rotationForm.daysOfWeek.includes(idx) ? 'bg-[var(--f-tint-color)] text-white' : 'bg-[var(--f-surface-sunken)] text-[var(--f-text-3)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Start Time" type="time" value={rotationForm.startTime} onChange={e => setRotationForm(f => ({ ...f, startTime: e.target.value }))} />
            <Input label="End Time" type="time" value={rotationForm.endTime} onChange={e => setRotationForm(f => ({ ...f, endTime: e.target.value }))} />
            <Input label="Break (minutes)" type="number" value={rotationForm.breakMinutes} onChange={e => setRotationForm(f => ({ ...f, breakMinutes: e.target.value }))} />
            <Input label="Repeat for (weeks)" type="number" value={rotationForm.weeks} onChange={e => setRotationForm(f => ({ ...f, weeks: e.target.value }))} />
            <Input label="Shift Label (optional)" value={rotationForm.shiftLabel} onChange={e => setRotationForm(f => ({ ...f, shiftLabel: e.target.value }))} placeholder="e.g. Morning A" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleCreateRotation} disabled={!hasPermission('shifts.create')}><Repeat className="w-4 h-4 mr-1" /> Create Rotation</Button>
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditShift(null); }} title={editShift ? 'Edit Shift' : 'Add Shift'}>
        <div className="space-y-4 p-2">
          <Select label="Employee *" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
            options={[{ value: '', label: 'Select employee...' }, ...employees.map(emp => ({ value: emp.id, label: `${emp.user?.fullName || emp.user?.username || 'Unknown'}${emp.title ? ` — ${emp.title}` : ''}` }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" value={form.shiftDate} onChange={e => setForm(f => ({ ...f, shiftDate: e.target.value }))} />
            <Input label="Break (min)" type="number" value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time *" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            <Input label="End Time *" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
          <Input label="Shift Label (optional)" value={form.shiftLabel} onChange={e => setForm(f => ({ ...f, shiftLabel: e.target.value }))} placeholder="e.g. Morning A" />
          <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any shift notes..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setAddOpen(false); setEditShift(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editShift ? 'Update' : 'Create'} Shift</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectSwap} onClose={() => setRejectSwap(null)} title="Reject Swap Request">
        <div className="space-y-4 p-2">
          <p className="text-sm text-[var(--f-text-3)]">Add a note explaining why this swap is rejected.</p>
          <Input label="Manager Note" value={rejectSwap?.note || ''} onChange={e => setRejectSwap(s => s ? { ...s, note: e.target.value } : s)} placeholder="Reason for rejection..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRejectSwap(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRejectSwap}>Reject Swap</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function canManage(shift) {
  // simplified — actual permission check is on the buttons
  return true;
}
