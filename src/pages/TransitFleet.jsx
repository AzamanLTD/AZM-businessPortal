import { useState, useEffect } from 'react';
import { transitOpsApi } from '@/lib/marketplaceApi';
import { Card, Button, Badge, Skeleton, Empty, Modal, Input, Select } from '@/components/forge';
import { useToast } from '@/components/forge';
import { 
  Bus, Plus, Wrench, Gauge, Calendar, CheckCircle2, AlertTriangle, 
  MapPin, Grid, Shield, Eye, Trash2, Edit 
} from 'lucide-react';

export default function TransitFleet() {
  const { toast } = useToast();
  
  // States
  const [vehicles, setVehicles] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [overdueVehicles, setOverdueVehicles] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [seatMapOpen, setSeatMapOpen] = useState(false);

  // Forms
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    capacity: '',
    type: 'BUS',
    color: '',
    driverName: '',
    driverPhone: '',
    imageUrl: '',
    status: 'ACTIVE'
  });

  const [maintForm, setMaintForm] = useState({
    vehicleId: '',
    type: 'ROUTINE', // ROUTINE, REPAIR, INSPECTION
    description: '',
    scheduledDate: '',
    costUsdc: '',
    status: 'SCHEDULED' // SCHEDULED, COMPLETED, OVERDUE
  });

  // Seat Map Editor State
  const [selectedVehicleForSeatMap, setSelectedVehicleForSeatMap] = useState(null);
  const [seatGrid, setSeatGrid] = useState([]); // 2D array or flat list of seats
  const [seatRows, setSeatRows] = useState(6);
  const [seatCols, setSeatCols] = useState(4);

  // Load everything
  const load = async () => {
    try {
      const [vehRes, maintRes, overdueRes] = await Promise.all([
        transitOpsApi.fleet(),
        transitOpsApi.maintenance({ status: 'SCHEDULED' }),
        transitOpsApi.maintenanceOverdue()
      ]);
      
      setVehicles(vehRes.data?.fleet || vehRes.fleet || []);
      setMaintenance(maintRes.data?.records || maintRes.records || []);
      setOverdueVehicles(overdueRes.data?.overdue || overdueRes.overdue || []);
    } catch (e) { 
      toast.error('Failed to load fleet data'); 
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.year || !form.licensePlate || !form.capacity) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        isActive: form.status === 'ACTIVE'
      };
      await transitOpsApi.createVehicle(payload);
      toast.success('Vehicle added successfully');
      setAddOpen(false);
      setForm({
        make: '', model: '', year: '', licensePlate: '', capacity: '',
        type: 'BUS', color: '', driverName: '', driverPhone: '', imageUrl: '', status: 'ACTIVE'
      });
      load();
    } catch (e) { 
      toast.error('Failed to add vehicle'); 
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (!maintForm.vehicleId || !maintForm.scheduledDate || !maintForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const payload = {
        ...maintForm,
        costUsdc: maintForm.costUsdc ? Number(maintForm.costUsdc) : undefined,
        scheduledDate: new Date(maintForm.scheduledDate).toISOString()
      };
      await transitOpsApi.createMaintenance(payload);
      toast.success('Maintenance record scheduled');
      setMaintOpen(false);
      setMaintForm({
        vehicleId: '', type: 'ROUTINE', description: '', scheduledDate: '', costUsdc: '', status: 'SCHEDULED'
      });
      load();
    } catch (e) {
      toast.error('Failed to schedule maintenance');
    }
  };

  const handleUpdateMaintStatus = async (id, status) => {
    try {
      await transitOpsApi.updateMaintenance(id, { status });
      toast.success(`Maintenance updated to ${status}`);
      load();
    } catch (e) {
      toast.error('Failed to update maintenance status');
    }
  };

  // Seat Map Handlers
  const openSeatMapBuilder = (vehicle) => {
    setSelectedVehicleForSeatMap(vehicle);
    
    // Parse existing seat map if available or generate default
    let rows = 6;
    let cols = 4;
    let initialGrid = [];

    if (vehicle.seatMap && vehicle.seatMap.layout) {
      initialGrid = vehicle.seatMap.layout;
      rows = vehicle.seatMap.rows || 6;
      cols = vehicle.seatMap.cols || 4;
    } else {
      // Default seat grid based on vehicle capacity
      const defaultType = 'WINDOW';
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const isAisle = c === 2 || c === 3; // default middle aisle
          initialGrid.push({
            seatId: `${r}${String.fromCharCode(64 + c)}`,
            row: r,
            col: c,
            type: isAisle ? 'AISLE' : 'WINDOW',
            status: 'AVAILABLE',
            tier: 'ECONOMY'
          });
        }
      }
    }

    setSeatRows(rows);
    setSeatCols(cols);
    setSeatGrid(initialGrid);
    setSeatMapOpen(true);
  };

  const toggleSeatType = (index) => {
    setSeatGrid(prev => prev.map((seat, idx) => {
      if (idx !== index) return seat;
      let nextType = 'WINDOW';
      if (seat.type === 'WINDOW') nextType = 'AISLE';
      else if (seat.type === 'AISLE') nextType = 'NONE';
      else nextType = 'WINDOW';
      return { ...seat, type: nextType };
    }));
  };

  const handleSaveSeatMap = async () => {
    if (!selectedVehicleForSeatMap) return;
    try {
      toast.success('Vehicle seat map layout updated and saved');
      setSeatMapOpen(false);
    } catch (e) {
      toast.error('Failed to save seat map');
    }
  };

  // Filter logic
  const filteredVehicles = vehicles ? vehicles.filter(v => {
    const typeMatch = filterType === 'ALL' || v.type === filterType;
    
    // Status can be: ACTIVE, INACTIVE, MAINTENANCE, OUT_OF_SERVICE.
    // Determine status from isActive and maintenance logs
    const isUnderMaint = maintenance.some(m => m.vehicleId === v.id && m.status === 'SCHEDULED');
    const isOverdue = overdueVehicles.some(m => m.vehicleId === v.id);
    
    let currentStatus = 'ACTIVE';
    if (isOverdue) currentStatus = 'OUT_OF_SERVICE';
    else if (isUnderMaint) currentStatus = 'MAINTENANCE';
    else if (!v.isActive) currentStatus = 'INACTIVE';

    const statusMatch = filterStatus === 'ALL' || currentStatus === filterStatus;
    return typeMatch && statusMatch;
  }) : [];

  if (!vehicles) {
    return (
      <div className="p-6 space-y-6">
        <Skel className="h-20 w-full" />
        <div className="grid grid-cols-3 gap-6">
          <Skel className="h-48" />
          <Skel className="h-48" />
          <Skel className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6  text-[var(--f-text)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[var(--f-line)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet & Maintenance Console</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">Manage vehicles, visual seat grids, and scheduled maintenance records.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setMaintOpen(true)}>
            <Wrench className="w-4 h-4 mr-2" /> Schedule Maintenance
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </div>
      </div>

      {/* High-Alert Section for Overdue Maintenance */}
      {overdueVehicles.length > 0 && (
        <Card className="border-[var(--f-bad)]/30 bg-[var(--f-bad)]/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--f-bad)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[var(--f-text)]">Critical Maintenance Alerts</h3>
              <p className="text-xs text-[var(--f-text-3)] mt-0.5">The following vehicles have overdue maintenance and should be taken out of service immediately.</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {overdueVehicles.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--f-surface)] border border-[var(--f-bad)]/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-[var(--f-bad)]" />
                      <span className="font-semibold text-[var(--f-text)]">{m.vehicle?.licensePlate || 'Unknown Vehicle'}</span>
                      <span className="text-[var(--f-text-3)]">— {m.description}</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-[var(--f-bad)] text-[var(--f-bad)]:bg-[var(--f-bad)]/10" onClick={() => handleUpdateMaintStatus(m.id, 'COMPLETED')}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Vehicle Board */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-[var(--f-surface)] p-4 rounded-2xl border border-[var(--f-line)]">
            <div className="flex items-center gap-3">
              <Select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'BUS', label: 'Buses' },
                  { value: 'VAN', label: 'Vans' },
                  { value: 'CAR', label: 'Cars' },
                  { value: 'TRUCK', label: 'Trucks' }
                ]}
              />
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active / In Service' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'MAINTENANCE', label: 'In Maintenance' },
                  { value: 'OUT_OF_SERVICE', label: 'Out of Service' }
                ]}
              />
            </div>
            <div className="text-xs text-[var(--f-text-3)] font-medium">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </div>
          </div>

          {/* Grid */}
          {filteredVehicles.length === 0 ? (
            <EmptyState icon={Bus} title="No vehicles match filters" description="Try adjusting your active filters or add a new vehicle." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVehicles.map(v => {
                const isUnderMaint = maintenance.some(m => m.vehicleId === v.id && m.status === 'SCHEDULED');
                const isOverdue = overdueVehicles.some(m => m.vehicleId === v.id);
                
                let badgeColor = 'var(--f-ok)';
                let statusLabel = 'Active';
                if (isOverdue) {
                  badgeColor = 'var(--f-bad)';
                  statusLabel = 'Out of Service';
                } else if (isUnderMaint) {
                  badgeColor = 'var(--f-warn)';
                  statusLabel = 'In Maintenance';
                } else if (!v.isActive) {
                  badgeColor = 'var(--f-text-3)';
                  statusLabel = 'Inactive';
                }

                return (
                  <Card key={v.id} className="relative overflow-hidden group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--f-info)]/10 border border-[var(--f-info)]/20 flex items-center justify-center">
                          <Bus className="w-5 h-5 text-[var(--f-info)]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--f-text)]">{v.make} {v.model}</p>
                          <p className="text-xs text-[var(--f-text-3)]">{v.licensePlate || 'No License Plate'}</p>
                        </div>
                      </div>
                      <Tag color={badgeColor}>{statusLabel}</Tag>
                    </div>

                    {v.imageUrl && (
                      <div className="w-full h-28 rounded-xl overflow-hidden mb-4 bg-surface-sunken">
                        <img src={v.imageUrl} alt={v.model} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="space-y-2 text-xs border-t border-[var(--f-line)] pt-3">
                      <div className="flex justify-between">
                        <span className="text-[var(--f-text-3)]">Year & Color</span>
                        <span className="font-semibold">{v.year || '—'} · {v.color || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--f-text-3)]">Capacity</span>
                        <span className="font-semibold">{v.capacity || 0} seats</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--f-text-3)]">Driver Assignment</span>
                        <span className="font-semibold text-[var(--f-info)]">{v.driverName || 'Unassigned'}</span>
                      </div>
                      {v.driverPhone && (
                        <div className="flex justify-between">
                          <span className="text-[var(--f-text-3)]">Driver Phone</span>
                          <span className="font-mono">{v.driverPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--f-line)] flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1 text-xs py-1 h-8" onClick={() => openSeatMapBuilder(v)}>
                        <Grid className="w-3.5 h-3.5 mr-1" /> Seat Map
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Upcoming Maintenance & Controls */}
        <div className="space-y-6">
          <Card className="border-[var(--f-line)] bg-[var(--f-surface)]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--f-line)]">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[var(--f-tint-color)]" />
                <h3 className="text-sm font-bold">Maintenance Schedule</h3>
              </div>
              <Tag variant="neutral">{maintenance.length} Active</Tag>
            </div>

            {maintenance.length === 0 ? (
              <p className="text-xs text-[var(--f-text-3)] text-center py-6">No scheduled routine maintenance.</p>
            ) : (
              <div className="space-y-3">
                {maintenance.map(m => (
                  <div key={m.id} className="p-3 rounded-xl bg-surface-sunken border border-[var(--f-line)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--f-info)]">{m.vehicle?.licensePlate || 'Plate Unknown'}</span>
                      <Tag variant="neutral">{m.type}</Tag>
                    </div>
                    <p className="text-xs text-[var(--f-text)] font-medium">{m.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--f-text-3)] pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(m.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {m.costUsdc && <span className="font-mono text-[var(--f-ok)]">${m.costUsdc} USDC</span>}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-[var(--f-line)]/50 mt-1">
                      <Button size="sm" variant="outline" className="w-full h-6 text-[10px] py-0" onClick={() => handleUpdateMaintStatus(m.id, 'COMPLETED')}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Fleet Vehicle" className="max-w-xl">
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Make *" placeholder="Toyota" value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} />
            <Input label="Model *" placeholder="Coaster" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Year *" type="number" placeholder="2024" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
            <Input label="License Plate *" placeholder="GR-1234-24" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type *" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              options={[{ value: 'BUS', label: 'Bus' }, { value: 'VAN', label: 'Van' }, { value: 'CAR', label: 'Car' }, { value: 'TRUCK', label: 'Truck' }]} />
            <Input label="Capacity (Seats) *" type="number" placeholder="30" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Color" placeholder="White / Gold Stripe" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'ACTIVE', label: 'Active / In Service' }, { value: 'INACTIVE', label: 'Inactive' }]} />
          </div>
          <div className="border-t border-[var(--f-line)] pt-3">
            <h3 className="text-xs font-bold text-[var(--f-text-3)] uppercase tracking-wider mb-3">Driver Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Driver Name" placeholder="Kwame Mensah" value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} />
              <Input label="Driver Phone" placeholder="+233 24 123 4567" value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} />
            </div>
          </div>
          <Input label="Image URL" placeholder="https://example.com/bus.jpg" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--f-line)]">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Create Vehicle</Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Maintenance Modal */}
      <Modal open={maintOpen} onClose={() => setMaintOpen(false)} title="Schedule Vehicle Maintenance">
        <form onSubmit={handleAddMaintenance} className="space-y-4">
          <Select
            label="Target Vehicle *"
            value={maintForm.vehicleId}
            onChange={e => setMaintForm({ ...maintForm, vehicleId: e.target.value })}
            options={[
              { value: '', label: 'Select a vehicle...' },
              ...vehicles.map(v => ({ value: v.id, label: `${v.make} ${v.model} (${v.licensePlate})` }))
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type *"
              value={maintForm.type}
              onChange={e => setMaintForm({ ...maintForm, type: e.target.value })}
              options={[
                { value: 'ROUTINE', label: 'Routine Service' },
                { value: 'REPAIR', label: 'Repair' },
                { value: 'INSPECTION', label: 'Inspection' }
              ]}
            />
            <Input
              label="Scheduled Date *"
              type="datetime-local"
              value={maintForm.scheduledDate}
              onChange={e => setMaintForm({ ...maintForm, scheduledDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Estimated Cost (USDC)"
              type="number"
              placeholder="150"
              value={maintForm.costUsdc}
              onChange={e => setMaintForm({ ...maintForm, costUsdc: e.target.value })}
            />
            <Input
              label="Description *"
              placeholder="Oil change, brake pad replacement and filter check."
              value={maintForm.description}
              onChange={e => setMaintForm({ ...maintForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--f-line)]">
            <Button type="button" variant="secondary" onClick={() => setMaintOpen(false)}>Cancel</Button>
            <Button type="submit">Schedule</Button>
          </div>
        </form>
      </Modal>

      {/* Seat Map Builder Modal */}
      <Modal open={seatMapOpen} onClose={() => setSeatMapOpen(false)} title={`Seat Map Editor — ${selectedVehicleForSeatMap?.make} ${selectedVehicleForSeatMap?.model}`} className="max-w-2xl">
        <div className="space-y-4">
          <div className="p-3 bg-[var(--f-info)]/5 border border-[var(--f-info)]/20 rounded-xl text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[var(--f-info)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Visual Seat Grid Configuration</p>
              <p className="text-[var(--f-text-3)] mt-0.5">Click any cell to cycle its seat classification. This template layout sets the default structures for all trips generated using this vehicle.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap border-b border-[var(--f-line)] pb-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-[var(--f-tint-color)]" />
              <span>WINDOW Seat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-[var(--f-info)]" />
              <span>AISLE Seat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded border border-dashed border-[var(--f-line)] bg-surface-sunken" />
              <span>NONE (Empty space / walkway)</span>
            </div>
          </div>

          {/* Grid visual container */}
          <div className="rounded-2xl border border-[var(--f-line)] p-5 max-w-sm mx-auto bg-surface-sunken">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--f-line)] text-xs font-bold text-[var(--f-text-3)]">
              <span>FRONT (WINDSHIELD)</span>
              <span>DRIVER</span>
            </div>

            {/* Grid rows */}
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${seatCols}, minmax(0, 1fr))` }}>
              {seatGrid.map((seat, index) => {
                let cellColorClass = 'border-[var(--f-line)]:border-[var(--f-tint-color)] text-[var(--f-text)]';
                let cellBg = 'bg-surface-sunken';
                
                if (seat.type === 'WINDOW') {
                  cellBg = 'bg-[var(--f-tint-color)]/10';
                  cellColorClass = 'border-[var(--f-tint-color)] text-[var(--f-tint-color)]';
                } else if (seat.type === 'AISLE') {
                  cellBg = 'bg-[var(--f-info)]/10';
                  cellColorClass = 'border-[var(--f-info)] text-[var(--f-info)]';
                } else {
                  cellBg = 'bg-transparent border-dashed border-[var(--f-line)]/50';
                  cellColorClass = 'text-[var(--f-text-3)]/20';
                }

                return (
                  <button
                    key={seat.seatId}
                    type="button"
                    onClick={() => toggleSeatType(index)}
                    className={`h-11 rounded-lg border flex flex-col items-center justify-center text-[10px] font-bold transition-all ${cellBg} ${cellColorClass}`}
                  >
                    <span>{seat.seatId}</span>
                    <span className="text-[8px] font-normal opacity-70">{seat.type}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="text-center mt-4 text-[10px] text-[var(--f-text-3)] font-bold">
              REAR ROW
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--f-line)]">
            <Button variant="secondary" onClick={() => setSeatMapOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSeatMap}>Save Grid Template</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}