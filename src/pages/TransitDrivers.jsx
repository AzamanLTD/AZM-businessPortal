import { useState, useEffect } from 'react';
import { transitOpsApi } from '@/lib/marketplaceApi';
import { Card, Button, Tag, Skel, Empty, Dialog, Select, Input } from '@/components/instrument';
import { Users, Bus, AlertCircle, Clock, CheckCircle2, XCircle, Calendar, Truck } from 'lucide-react';
import { toast } from '@/lib/toast';

const DRIVER_STATUS = {
  ASSIGNED: { label: 'Assigned', color: 'var(--text-3)' },
  CHECKED_IN: { label: 'Checked In', color: 'var(--info)' },
  ON_DUTY: { label: 'On Duty', color: 'var(--accent)' },
  COMPLETED: { label: 'Completed', color: 'var(--go)' },
  NO_SHOW: { label: 'No Show', color: 'var(--stop)' },
};

const NEXT_DRIVER_STATUS = {
  ASSIGNED: 'CHECKED_IN',
  CHECKED_IN: 'ON_DUTY',
  ON_DUTY: 'COMPLETED',
  COMPLETED: null,
};

export default function TransitDrivers() {
    const [assignments, setAssignments] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [viewMonth] = useState(new Date().toISOString().slice(0, 7));
  const [iropsOpen, setIropsOpen] = useState(false);
  const [iropsForm, setIropsForm] = useState({ sourceTripId: '', targetVehicleId: '' });
  const [vehicles, setVehicles] = useState([]);

  const load = async () => {
    try {
      const [assignRes, calRes] = await Promise.all([
        transitOpsApi.drivers(),
        transitOpsApi.driverCalendar(viewMonth),
      ]);
      setAssignments(assignRes.data?.drivers || assignRes.data || []);
      setCalendar(calRes.data?.days || calRes.data || []);
    } catch { toast.stop('Failed to load driver data'); setAssignments([]); }
  };

  const loadVehicles = async () => {
    try {
      const res = await transitOpsApi.fleet();
      setVehicles(res.data?.fleet || []);
    } catch { /* optional */ }
  };

  useEffect(() => { load(); loadVehicles(); }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await transitOpsApi.updateDriverStatus(id, status);
      toast.go('Driver status updated');
      load();
    } catch { toast.stop('Failed to update status'); }
  };

  const handleIropsReassign = async () => {
    try {
      const res = await transitOpsApi.iropsReassign(iropsForm);
      const data = res.data || res;
      toast.go('Reassigned ' + (data.passengerCount || 0) + ' passengers and ' + (data.cargoCount || 0) + ' cargo items');
      setIropsOpen(false);
      setIropsForm({ sourceTripId: '', targetVehicleId: '' });
      load();
    } catch { toast.stop('Failed to reassign'); }
  };

  // Group assignments by driver
  const byDriver = {};
  const todayStr = new Date().toISOString().slice(0, 10);
  (assignments || []).forEach(a => {
    const dateStr = a.assignmentDate ? new Date(a.assignmentDate).toISOString().slice(0, 10) : todayStr;
    if (dateStr === todayStr) {
      const key = a.employeeId || a.id;
      if (!byDriver[key]) {
        byDriver[key] = {
          name: a.employee?.user?.username || a.employee?.fullName || 'Unknown',
          phone: a.employee?.phone || a.employee?.user?.phone || null,
          assignments: [],
        };
      }
      byDriver[key].assignments.push(a);
    }
  });

  const driverKeys = Object.keys(byDriver);
  // Collect all trips for IROPS dropdown
  const allTrips = (assignments || []).filter(a => a.trip).map(a => ({ id: a.trip.id, label: a.trip.routeName + ' → ' + (a.trip.destination || '') }));

  if (!assignments) return <Skel className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Driver Dispatch</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Manage driver assignments and emergency reassignment</p>
        </div>
        <Button variant="destructive" onClick={() => setIropsOpen(true)}>
          <AlertCircle className="w-4 h-4" /> Emergency Reassign
        </Button>
      </div>

      {/* Dispatch Board */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
          <Clock className="w-4 h-4" /> Today's Dispatch Board
        </h3>
        {driverKeys.length === 0 && (
          <Empty icon={Users} title="No driver assignments today" description="Assign drivers to trips to see them here" />
        )}
        {driverKeys.map(key => {
          const driver = byDriver[key];
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--info)]/10 border border-[var(--info)]/30 flex items-center justify-center">
                    <Bus className="w-5 h-5 text-[var(--info)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">{driver.name}</p>
                    {driver.phone && <p className="text-xs text-[var(--text-3)]">{driver.phone}</p>}
                  </div>
                </div>
                <span className="text-xs text-[var(--text-3)]">{driver.assignments.length} trip(s)</span>
              </div>
              {/* Timeline */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {driver.assignments.map(a => {
                  const st = a.status || 'ASSIGNED';
                  const stInfo = DRIVER_STATUS[st] || DRIVER_STATUS.ASSIGNED;
                  return (
                    <div key={a.id} className="min-w-[200px] border border-[var(--line)] rounded-lg p-3 space-y-2" style={{ borderColor: stInfo.color + '40' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text)]">{a.trip?.routeName || 'Trip'}</span>
                        <Tag color={stInfo.color}>{stInfo.label}</Tag>
                      </div>
                      <div className="text-xs text-[var(--text-3)]">
                        {a.trip?.origin} → {a.trip?.destination}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <Clock className="w-3 h-3" />
                        {a.trip?.departureAt ? new Date(a.trip.departureAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                      </div>
                      {a.vehicle && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                          <Truck className="w-3 h-3" /> {a.vehicle.make} {a.vehicle.model} ({a.vehicle.licensePlate || 'No plate'})
                        </div>
                      )}
                      {st === 'NO_SHOW' ? (
                        <div className="flex items-center gap-1 text-xs text-[var(--stop)]">
                          <XCircle className="w-3 h-3" /> No-show flagged
                        </div>
                      ) : NEXT_DRIVER_STATUS[st] ? (
                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleStatusUpdate(a.id, NEXT_DRIVER_STATUS[st])}>
                          Advance to {NEXT_DRIVER_STATUS[st].replace('_', ' ')}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-[var(--go)]">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Monthly Calendar */}
      {calendar?.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-[var(--text)] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Monthly Schedule ({viewMonth})
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <p key={d} className="text-[10px] text-center text-[var(--text-3)] font-bold uppercase pb-1">{d}</p>
            ))}
            {calendar.map(day => (
              <div key={day.date} className={'rounded-lg p-2 min-h-[60px] border ' + (day.hasAssignment ? 'border-[var(--info)]/30 bg-[var(--info)]/5' : 'border-[var(--line)]')}>
                <p className="text-xs font-bold text-[var(--text)]">{day.day}</p>
                {day.assignments?.map(a => (
                  <div key={a.id} className="mt-1 text-[10px] rounded px-1 py-0.5 bg-[var(--info)]/10 text-[var(--info)] truncate">
                    {a.driverName} → {a.route}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* IROPS Reassignment Modal */}
      <Dialog open={iropsOpen} onClose={() => setIropsOpen(false)} title="Emergency Vehicle Reassignment">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--stop)]">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Vehicle breakdown? Reassign all passengers and cargo to a replacement vehicle.</p>
          </div>
          <Select label="Source Trip" value={iropsForm.sourceTripId} onChange={e => setIropsForm({ ...iropsForm, sourceTripId: e.target.value })}
            options={[{ value: '', label: 'Select trip...' }, ...allTrips.map(t => ({ value: t.id, label: t.label }))]} />
          <Select label="Replacement Vehicle" value={iropsForm.targetVehicleId} onChange={e => setIropsForm({ ...iropsForm, targetVehicleId: e.target.value })}
            options={[{ value: '', label: 'Select vehicle...' }, ...vehicles.map(v => ({ value: v.id, label: (v.make || '') + ' ' + (v.model || '') + ' (' + (v.licensePlate || 'No plate') + ')' }))]} />
          <Button variant="destructive" onClick={handleIropsReassign} className="w-full" disabled={!iropsForm.sourceTripId || !iropsForm.targetVehicleId}>
            Execute Emergency Reassignment
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
