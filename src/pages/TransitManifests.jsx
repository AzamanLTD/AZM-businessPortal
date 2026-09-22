/**
 * TransitManifests.jsx — Live Manifests with Cargo Tab & IROPS Emergency
 */
import { useState, useEffect } from 'react';
import { transitOpsApi, cargoApi } from '@/lib/marketplaceApi';
import { Card, Button, Tag, Empty, Avatar, Sheet, Select } from '@/components/instrument';
import { Progress } from '@/components/instrument';
import {
  Ticket, Users, DollarSign, QrCode, MapPin, Package, AlertTriangle,
  CheckCircle2, Clock, Plus, Truck, Scale, Phone, ArrowRight, RefreshCw,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const CARGO_STATUS_META = {
  PENDING:     { label: 'Pending',     color: 'var(--hold)',  dot: 'bg-amber-400' },
  LOADED:      { label: 'Loaded',      color: 'var(--info)',   dot: 'bg-blue-400' },
  IN_TRANSIT:  { label: 'In Transit',  color: 'var(--accent)', dot: 'bg-purple-400' },
  DELIVERED:   { label: 'Delivered',   color: 'var(--accent)', dot: 'bg-purple-400' },
  RETURNED:    { label: 'Returned',    color: 'var(--stop)',    dot: 'bg-red-400' },
  LOST:        { label: 'Lost',        color: 'var(--stop)',    dot: 'bg-red-400' },
};

const CARGO_STATUS_FLOW = ['PENDING', 'LOADED', 'IN_TRANSIT', 'DELIVERED'];

function useDepartureCountdown(departureAt) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!departureAt) return;
    const tick = () => {
      const diff = new Date(departureAt).getTime() - Date.now();
      if (diff <= 0) { setLabel('Departed'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [departureAt]);
  return label;
}

export default function TransitManifests() {
    const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [cargo, setCargo] = useState([]);
  const [activeTab, setActiveTab] = useState('passengers');
  const [showCargoDialog, setShowCargoModal] = useState(false);
  const [showIrops, setShowIrops] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [iropsVehicle, setIropsVehicle] = useState('');
  const [iropsLoading, setIropsLoading] = useState(false);
  const [cargoForm, setCargoForm] = useState({
    senderName: '', senderPhone: '', receiverName: '', receiverPhone: '',
    receiverAddress: '', description: '', weightKg: '', priceUsdc: '', fragile: false, notes: '',
  });

  const loadTrips = async () => {
    try {
      const res = await transitOpsApi.routes();
      setTrips(res.data?.trips || []);
    } catch { toast.stop('Failed to load trips'); }
  };

  const loadManifest = async (tripId) => {
    setSelectedTrip(tripId);
    try {
      const [manifestRes, cargoRes] = await Promise.all([
        transitOpsApi.liveManifest(tripId),
        cargoApi.list({ tripId }),
      ]);
      setManifest(manifestRes.data);
      setCargo(cargoRes.data?.parcels || []);
    } catch { toast.stop('Failed to load manifest'); }
  };

  const loadVehicles = async () => {
    try {
      const res = await transitOpsApi.fleet();
      setVehicles(res.data?.fleet || []);
    } catch { /* silent */ }
  };

  useEffect(() => { loadTrips(); }, []);

  const handleAddCargo = async () => {
    if (!selectedTrip || !cargoForm.senderName || !cargoForm.receiverName || !cargoForm.description) {
      toast.stop('Fill required fields');
      return;
    }
    try {
      await cargoApi.create({ ...cargoForm, transitTripId: selectedTrip });
      toast.go('Cargo parcel added');
      setShowCargoModal(false);
      setCargoForm({ senderName: '', senderPhone: '', receiverName: '', receiverPhone: '', receiverAddress: '', description: '', weightKg: '', priceUsdc: '', fragile: false, notes: '' });
      loadManifest(selectedTrip);
    } catch { toast.stop('Failed to add cargo'); }
  };

  const advanceCargoStatus = async (parcelId, currentStatus) => {
    const idx = CARGO_STATUS_FLOW.indexOf(currentStatus);
    if (idx < 0 || idx >= CARGO_STATUS_FLOW.length - 1) return;
    const next = CARGO_STATUS_FLOW[idx + 1];
    try {
      await cargoApi.updateStatus(parcelId, next);
      toast.go(`Parcel → ${CARGO_STATUS_META[next].label}`);
      loadManifest(selectedTrip);
    } catch { toast.stop('Failed to update status'); }
  };

  const handleIropsReassign = async () => {
    if (!iropsVehicle) { toast.stop('Select a replacement vehicle'); return; }
    setIropsLoading(true);
    try {
      const res = await cargoApi.reassign({ sourceTripId: selectedTrip, targetVehicleId: iropsVehicle });
      toast.go(res.data?.message || 'Reassignment complete');
      setShowIrops(false);
      setIropsVehicle('');
      loadTrips();
      setSelectedTrip(null);
      setManifest(null);
    } catch { toast.stop('Reassignment failed'); }
    setIropsLoading(false);
  };

  const countdown = useDepartureCountdown(manifest?.departureAt || trips.find(t => t.id === selectedTrip)?.departureAt || trips.find(t => t.id === selectedTrip)?.departureTime);

  const totalWeight = cargo.reduce((s, p) => s + (p.weightKg || 0), 0);
  const cargoRevenue = cargo.reduce((s, p) => s + (p.priceUsdc || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Live Manifests</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Passenger boarding, cargo tracking, and emergency reassignment</p>
        </div>
        {selectedTrip && (
          <button
            onClick={() => { setShowIrops(true); loadVehicles(); }}
            className="bg-tint text-ink font-bold hover:bg-tint/90 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'var(--f-bad-bg)', color: 'var(--stop)', border: '1px solid var(--stop)' }}
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency
          </button>
        )}
      </div>

      {/* Trip selector */}
      <div className="flex gap-3 flex-wrap">
        {trips.length === 0 && (
          <p className="text-sm text-[var(--text-3)]">No trips scheduled. Create trips in Transit Trips first.</p>
        )}
        {trips.map(trip => (
          <button
            key={trip.id}
            onClick={() => loadManifest(trip.id)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${selectedTrip === trip.id ? 'bg-[var(--surface-sunk)] text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-3)] border-[var(--line)]:bg-[var(--surface-sunk)]'}`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            {trip.origin} → {trip.destination}
            <span className="ml-2 text-xs text-[var(--text-3)]">
              {new Date(trip.departureAt || trip.departureTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
      </div>

      {!manifest ? (
        <Empty icon={Ticket} title="Select a trip" description="Choose a trip above to view its live manifest" />
      ) : (
        <>
          {/* Countdown */}
          {countdown && countdown !== 'Departed' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'var(--surface-sunk)', border: '1px solid var(--accent)' }}>
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--accent)]">Departs in {countdown}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[var(--line)]">
            <button
              onClick={() => setActiveTab('passengers')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'passengers' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-3)]:text-[var(--text)]'}`}
            >
              <Users className="w-4 h-4 inline mr-1.5" />
              Passengers
            </button>
            <button
              onClick={() => setActiveTab('cargo')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'cargo' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-3)]:text-[var(--text)]'}`}
            >
              <Package className="w-4 h-4 inline mr-1.5" />
              Cargo ({cargo.length})
            </button>
          </div>

          {/* Passenger tab */}
          {activeTab === 'passengers' && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-[var(--info)]" /><span className="text-xs text-[var(--text-3)] uppercase">Passengers</span></div>
                <p className="text-3xl font-bold text-[var(--text)]">{manifest.boardedCount}/{manifest.totalBooked}</p>
                <p className="text-xs text-[var(--text-3)] mt-1">{manifest.totalBooked - manifest.boardedCount} not yet boarded</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-[var(--accent)]" /><span className="text-xs text-[var(--text-3)] uppercase">Revenue (Escrow)</span></div>
                <p className="text-3xl font-bold text-[var(--text)]">{manifest.totalRevenueUsdc?.toFixed(2)}</p>
                <p className="text-xs text-[var(--text-3)] mt-1">USDC held in Smart Escrow</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-2"><QrCode className="w-4 h-4 text-[var(--accent)]" /><span className="text-xs text-[var(--text-3)] uppercase">Boarding</span></div>
                <p className="text-3xl font-bold text-[var(--text)]">{manifest.boardingProgress}%</p>
                <div className="mt-2"><Progress value={manifest.boardingProgress || 0} /></div>
              </Card>

              <Card className="col-span-3">
                <h3 className="text-sm font-bold text-[var(--text)] mb-4">Passenger Manifest</h3>
                <div className="space-y-1">
                  {manifest.passengers?.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-[var(--line)] last:border-0">
                      <Avatar name={p.user?.fullName || p.name} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--text)]">{p.user?.fullName || p.name}</p>
                        <p className="text-xs text-[var(--text-3)]">Seat {p.seatNumber} - {p.ticketRef}</p>
                      </div>
                      <Tag color={p.boarded ? 'var(--accent)' : 'var(--text-3)'}>
                        {p.boarded ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Boarded</> : 'Waiting'}
                      </Tag>
                    </div>
                  ))}
                  {(!manifest.passengers || manifest.passengers.length === 0) && (
                    <p className="text-sm text-[var(--text-3)] py-4 text-center">No passengers booked yet</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Cargo tab */}
          {activeTab === 'cargo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-[var(--hold)]" /><span className="text-xs text-[var(--text-3)] uppercase">Parcels</span></div>
                  <p className="text-3xl font-bold text-[var(--text)]">{cargo.length}</p>
                </Card>
                <Card>
                  <div className="flex items-center gap-2 mb-2"><Scale className="w-4 h-4 text-[var(--info)]" /><span className="text-xs text-[var(--text-3)] uppercase">Total Weight</span></div>
                  <p className="text-3xl font-bold text-[var(--text)]">{totalWeight.toFixed(1)}<span className="text-sm font-normal text-[var(--text-3)] ml-1">kg</span></p>
                </Card>
                <Card>
                  <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-[var(--accent)]" /><span className="text-xs text-[var(--text-3)] uppercase">Cargo Revenue</span></div>
                  <p className="text-3xl font-bold text-[var(--text)]">{cargoRevenue.toFixed(2)}</p>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowCargoModal(true)} className="bg-tint text-ink font-bold hover:bg-tint/90 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Cargo Parcel
                </Button>
              </div>

              <Card>
                {cargo.length === 0 ? (
                  <Empty icon={Package} title="No cargo" description="Add cargo parcels for this trip" />
                ) : (
                  <div className="space-y-1">
                    {cargo.map(parcel => {
                      const meta = CARGO_STATUS_META[parcel.status] || CARGO_STATUS_META.PENDING;
                      const canAdvance = CARGO_STATUS_FLOW.includes(parcel.status) && CARGO_STATUS_FLOW.indexOf(parcel.status) < CARGO_STATUS_FLOW.length - 1;
                      return (
                        <div key={parcel.id} className="flex items-center gap-3 py-3 border-b border-[var(--line)] last:border-0">
                          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--text)]">{parcel.description}</p>
                              {parcel.fragile && <Tag tone="neutral">Fragile</Tag>}
                            </div>
                            <p className="text-xs text-[var(--text-3)] mt-0.5">
                              {parcel.weightKg}kg - {parcel.receiverName}
                              {parcel.receiverPhone && <><Phone className="w-3 h-3 inline mx-1" />{parcel.receiverPhone}</>}
                              {parcel.priceUsdc > 0 && <span className="ml-2 font-medium text-[var(--accent)]">${parcel.priceUsdc.toFixed(2)}</span>}
                            </p>
                          </div>
                          <Tag color={meta.color}>{meta.label}</Tag>
                          {canAdvance && (
                            <button
                              onClick={() => advanceCargoStatus(parcel.id, parcel.status)}
                              className="p-1.5 rounded-lg:bg-[var(--surface-sunk)] text-[var(--accent)]"
                              title="Advance status"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* Add Cargo Modal */}
      {showCargoModal && (
        <Sheet open={showCargoModal} onClose={() => setShowCargoModal(false)} title="Add Cargo Parcel">
          <div className="space-y-3 px-1">
            <div>
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Sender Name *</label>
              <input className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" value={cargoForm.senderName} onChange={e => setCargoForm({ ...cargoForm, senderName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Sender Phone</label>
              <input className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" value={cargoForm.senderPhone} onChange={e => setCargoForm({ ...cargoForm, senderPhone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Receiver Name *</label>
              <input className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" value={cargoForm.receiverName} onChange={e => setCargoForm({ ...cargoForm, receiverName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Receiver Phone</label>
              <input className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" value={cargoForm.receiverPhone} onChange={e => setCargoForm({ ...cargoForm, receiverPhone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Description *</label>
              <input className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" placeholder="e.g. Document envelope" value={cargoForm.description} onChange={e => setCargoForm({ ...cargoForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Weight (kg)</label>
                <input type="number" step="0.1" className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" value={cargoForm.weightKg} onChange={e => setCargoForm({ ...cargoForm, weightKg: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Price (USDC)</label>
                <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)]" value={cargoForm.priceUsdc} onChange={e => setCargoForm({ ...cargoForm, priceUsdc: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cargoForm.fragile} onChange={e => setCargoForm({ ...cargoForm, fragile: e.target.checked })} className="rounded" />
              <span className="text-sm text-[var(--text)]">Fragile</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowCargoModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddCargo} className="bg-tint text-ink font-bold hover:bg-tint/90 flex-1">Add Parcel</Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* IROPS Emergency Modal */}
      {showIrops && (
        <Sheet open={showIrops} onClose={() => setShowIrops(false)} title="Emergency Reassignment">
          <div className="space-y-4 px-1">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--f-bad-bg)', border: '1px solid var(--stop)' }}>
              <AlertTriangle className="w-5 h-5 text-[var(--stop)]" />
              <div>
                <p className="text-sm font-bold text-[var(--stop)]">Vehicle Breakdown</p>
                <p className="text-xs text-[var(--text-3)]">All passengers and cargo will be transferred to a replacement vehicle.</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-3)] uppercase">Replacement Vehicle</label>
              <Select className="w-full mt-1" value={iropsVehicle} onChange={e => setIropsVehicle(e.target.value)}>
                <option value="">Select a vehicle...</option>
                {vehicles.filter(v => v.isActive).map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} - {v.licensePlate || 'No plate'}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowIrops(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handleIropsReassign}
                disabled={iropsLoading || !iropsVehicle}
                className="bg-tint text-ink font-bold hover:bg-tint/90 flex-1"
                style={{ background: 'var(--stop)', color: 'white' }}
              >
                {iropsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                {iropsLoading ? 'Reassigning...' : 'Reassign Now'}
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
