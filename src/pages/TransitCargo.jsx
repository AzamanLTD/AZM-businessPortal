import { useState, useEffect } from 'react';
import { cargoApi, transit as transitApi } from '@/lib/marketplaceApi';
import { Card, Button, Tag, Skel, Empty, Dialog, Input, Select } from '@/components/instrument';
import { fmtUSDC, cn } from '@/lib/utils';
import { Package, Plus, Clock, MapPin, AlertCircle, CheckCircle2, Truck, Link, Filter } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLUMNS = [
  { key: 'PENDING', label: 'Pending', color: 'var(--text-3)' },
  { key: 'LOADED', label: 'Loaded', color: 'var(--info)' },
  { key: 'IN_TRANSIT', label: 'In Transit', color: 'var(--accent)' },
  { key: 'DELIVERED', label: 'Delivered', color: 'var(--go)' },
  { key: 'RETURNED', label: 'Returned', color: 'var(--hold)' },
  { key: 'LOST', label: 'Lost', color: 'var(--stop)' },
];

const NEXT_STATUS = {
  PENDING: 'LOADED',
  LOADED: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
  DELIVERED: null,
  RETURNED: null,
  LOST: null,
};

export default function TransitCargo() {
    const [cargo, setCargo] = useState(null);
  const [trips, setTrips] = useState([]);
  const [filterTrip, setFilterTrip] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [form, setForm] = useState({
    transitTripId: '', senderName: '', senderPhone: '', receiverName: '',
    receiverPhone: '', receiverAddress: '', description: '', weightKg: '',
    priceUsdc: '', fragile: false, notes: '',
  });

  const load = async () => {
    try {
      const params = {};
      if (filterTrip) params.tripId = filterTrip;
      if (filterStatus) params.status = filterStatus;
      const res = await cargoApi.list(params);
      setCargo(res.data?.cargo || res.data || res.cargo || []);
    } catch { toast.error('Failed to load cargo'); setCargo([]); }
  };

  const loadTrips = async () => {
    try {
      const res = await transitApi.list();
      setTrips(res.data || res || []);
    } catch { /* trips optional */ }
  };

  useEffect(() => { loadTrips(); }, []);
  useEffect(() => { load(); }, [filterTrip, filterStatus]);

  const handleCreate = async () => {
    try {
      await cargoApi.create({
        ...form,
        weightKg: Number(form.weightKg),
        priceUsdc: Number(form.priceUsdc),
      });
      toast.success('Cargo parcel created');
      setAddOpen(false);
      setForm({ transitTripId: '', senderName: '', senderPhone: '', receiverName: '', receiverPhone: '', receiverAddress: '', description: '', weightKg: '', priceUsdc: '', fragile: false, notes: '' });
      load();
    } catch { toast.error('Failed to create cargo parcel'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await cargoApi.updateStatus(id, status);
      toast.success('Status updated to ' + status);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const handleAttachProof = async () => {
    try {
      await cargoApi.attachProof(proofOpen.id, proofUrl);
      toast.success('Proof of delivery attached');
      setProofOpen(null);
      setProofUrl('');
      load();
    } catch { toast.error('Failed to attach proof'); }
  };

  if (!cargo) return <Skel className="h-96" />;

  const grouped = {};
  STATUS_COLUMNS.forEach(col => { grouped[col.key] = []; });
  cargo.forEach(item => {
    const s = item.status || 'PENDING';
    if (grouped[s]) grouped[s].push(item);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Cargo & Logistics</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Track parcels from dispatch to delivery</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Parcel</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-[var(--text-3)]" />
        <Select value={filterTrip} onChange={e => setFilterTrip(e.target.value)}
          options={[{ value: '', label: 'All Trips' }, ...trips.map(t => ({ value: t.id, label: (t.routeName || t.origin) + ' → ' + t.destination }))]}
          className="w-56" />
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          options={[{ value: '', label: 'All Statuses' }, ...STATUS_COLUMNS.map(s => ({ value: s.key, label: s.label }))]}
          className="w-44" />
        <span className="text-sm text-[var(--text-3)]">{cargo.length} parcels</span>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-6 gap-3 overflow-x-auto">
        {STATUS_COLUMNS.map(col => (
          <div key={col.key} className="space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-[var(--text)]">{col.label}</span>
              <Tag color={col.color}>{grouped[col.key]?.length || 0}</Tag>
            </div>
            {grouped[col.key]?.map(item => (
              <Card key={item.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--text)]">{item.senderName}</p>
                    <p className="text-xs text-[var(--text-3)]">→ {item.receiverName}</p>
                  </div>
                  {item.fragile && <Tag tone="neutral">Fragile</Tag>}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-[var(--text-3)]">Weight</span><span className="text-[var(--text)] font-medium">{item.weightKg} kg</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-3)]">Price</span><span className="text-[var(--text)] font-medium">{fmtUSDC(item.priceUsdc)}</span></div>
                  {item.loadedAt && <div className="flex items-center gap-1 text-[var(--text-3)]"><Clock className="w-3 h-3" />Loaded {new Date(item.loadedAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</div>}
                  {item.deliveredAt && <div className="flex items-center gap-1 text-[var(--go)]"><CheckCircle2 className="w-3 h-3" />Delivered {new Date(item.deliveredAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</div>}
                </div>
                {item.description && <p className="text-xs text-[var(--text-3)] truncate">{item.description}</p>}
                {item.proofOfDeliveryUrl && (
                  <a href={item.proofOfDeliveryUrl} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-[var(--info)]:underline">
                    <Link className="w-3 h-3" /> Proof of delivery
                  </a>
                )}
                {item.status === 'IN_TRANSIT' && !item.proofOfDeliveryUrl && (
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setProofOpen(item)}>
                    <Link className="w-3 h-3" /> Attach Proof
                  </Button>
                )}
                {NEXT_STATUS[item.status] && (
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleStatusChange(item.id, NEXT_STATUS[item.status])}>
                    <Truck className="w-3 h-3" /> Move to {NEXT_STATUS[item.status].replace('_', ' ')}
                  </Button>
                )}
              </Card>
            ))}
            {grouped[col.key]?.length === 0 && (
              <div className="text-center py-8 text-xs text-[var(--text-3)] border border-dashed border-[var(--line)] rounded-lg">
                <Package className="w-6 h-6 mx-auto mb-1 opacity-30" />
                No parcels
              </div>
            )}
          </div>
        ))}
      </div>

      {cargo.length === 0 && (
        <Empty icon={Package} title="No cargo parcels" description="Create a parcel to start tracking shipments" />
      )}

      {/* Create Parcel Modal */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="New Cargo Parcel">
        <div className="space-y-4">
          <Select label="Trip" value={form.transitTripId} onChange={e => setForm({ ...form, transitTripId: e.target.value })}
            options={[{ value: '', label: 'Select trip...' }, ...trips.map(t => ({ value: t.id, label: (t.routeName || t.origin) + ' → ' + t.destination + ' (' + new Date(t.departureAt).toLocaleDateString('en', { day: 'numeric', month: 'short' }) + ')' }))]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sender Name" placeholder="John Doe" value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} />
            <Input label="Sender Phone" placeholder="+233..." value={form.senderPhone} onChange={e => setForm({ ...form, senderPhone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Receiver Name" placeholder="Jane Smith" value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })} />
            <Input label="Receiver Phone" placeholder="+233..." value={form.receiverPhone} onChange={e => setForm({ ...form, receiverPhone: e.target.value })} />
          </div>
          <Input label="Receiver Address" placeholder="123 Main St, Accra" value={form.receiverAddress} onChange={e => setForm({ ...form, receiverAddress: e.target.value })} />
          <Input label="Description" placeholder="Electronics, documents..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Weight (kg)" type="number" placeholder="5.0" value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} />
            <Input label="Price (USDC)" type="number" placeholder="50.00" value={form.priceUsdc} onChange={e => setForm({ ...form, priceUsdc: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.fragile} onChange={e => setForm({ ...form, fragile: e.target.checked })} className="rounded" />
            <span className="text-sm text-[var(--text)]">Fragile</span>
          </label>
          <Input label="Notes" placeholder="Additional handling instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={handleCreate} className="w-full" disabled={!form.transitTripId || !form.senderName || !form.receiverName || !form.weightKg || !form.priceUsdc}>Create Parcel</Button>
        </div>
      </Dialog>

      {/* Proof of Delivery Modal */}
      <Dialog open={!!proofOpen} onClose={() => { setProofOpen(null); setProofUrl(''); }} title="Attach Proof of Delivery">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-3)]">
            Attach a URL to the delivery photo or signature for parcel from <span className="text-[var(--text)] font-medium">{proofOpen?.senderName}</span> to <span className="text-[var(--text)] font-medium">{proofOpen?.receiverName}</span>.
          </p>
          <Input label="Proof of Delivery URL" placeholder="https://..." value={proofUrl} onChange={e => setProofUrl(e.target.value)} />
          <Button onClick={handleAttachProof} className="w-full" disabled={!proofUrl}>Attach & Mark Delivered</Button>
        </div>
      </Dialog>
    </div>
  );
}
