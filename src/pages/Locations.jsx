import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locations as locApi, businessOS } from '@/lib/api';
import { uploadImageToCloudinary, isCloudinaryConfigured, validateImageFile } from '@/lib/cloudinary';
import { Card, Button, Input, Badge, Empty, Skeleton, Modal } from '@/components/ui';
import { MapPin, Plus, Pencil, Trash2, Clock, ChevronDown, ChevronUp, Image, CalendarDays, X } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_LABELS = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
const BLANK_HOURS = Object.fromEntries(DAYS.map(d => [d, { open:"08:00", close:"22:00", closed: d === "sun" }]));

function serializeHours(hours) {
  const out = {};
  DAYS.forEach(d => {
    out[d] = hours[d].closed ? "closed" : `${hours[d].open}-${hours[d].close}`;
  });
  return out;
}

function parseHours(raw) {
  if (!raw) return BLANK_HOURS;
  return Object.fromEntries(DAYS.map(d => {
    const v = raw[d] || "closed";
    if (v === "closed") return [d, { open:"08:00", close:"22:00", closed: true }];
    const [open, close] = v.split("-");
    return [d, { open: open||"08:00", close: close||"22:00", closed: false }];
  }));
}

function hoursSummary(raw) {
  if (!raw) return 'Hours not set';
  const openDays = DAYS.filter(d => raw[d] && raw[d] !== 'closed').length;
  if (openDays === 0) return 'Closed all week';
  if (openDays === 7) return 'Open every day';
  return `Open ${openDays} day${openDays > 1 ? 's' : ''}/week`;
}

const BLANK_LOC = {
  label:'', address:'', city:'', region:'', country:'',
  latitude:'', longitude:'', phoneNumber:'',
  galleryUrls: [], isPrimary: false,
};

export default function Locations() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | "create" | { ...location }
  const [form, setForm] = useState(BLANK_LOC);
  const [hours, setHours] = useState(BLANK_HOURS);
  const [uploading, setUploading] = useState(false);
  const [expandedTables, setExpandedTables] = useState({}); // { [locId]: bool }
  const [newTableLabel, setNewTableLabel] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['biz-locations'],
    queryFn:  () => locApi.list(),
  });
  const locs = data?.locations || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["biz-locations"] });

  const createMut = useMutation({
    mutationFn: (d) => locApi.create(d),
    onSuccess: () => { toast.success('Location added'); invalidate(); setModal(null); },
    onError:   (e) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data: d }) => locApi.update(id, d),
    onSuccess: () => { toast.success('Location updated'); invalidate(); setModal(null); },
    onError:   (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => locApi.remove(id),
    onSuccess: () => { toast.success('Location deactivated'); invalidate(); },
    onError:   (e) => toast.error(e.message),
  });

  const createTableMut = useMutation({
    mutationFn: ({ locId, label }) => locApi.createTable(locId, label),
    onSuccess: (_, { locId }) => {
      toast.success('Table added');
      setNewTableLabel(s => ({ ...s, [locId]: '' }));
      qc.invalidateQueries({ queryKey: ['biz-location-tables', locId] });
      invalidate(); // refresh the table-count shown on the card
    },
    onError:   (e) => toast.error(e.message),
  });

  const openCreate = () => { setForm(BLANK_LOC); setHours(BLANK_HOURS); setModal("create"); };
  const openEdit   = (loc) => { setForm({ ...loc, galleryUrls: loc.galleryUrls || [] }); setHours(parseHours(loc.operatingHours)); setModal(loc); };
  const closeModal = () => setModal(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const err = validateImageFile(file); if (err) { toast.error(err); return; }
    if (form.galleryUrls.length >= 10) { toast.error("Max 10 gallery images."); return; }
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, "azaman-locations");
      setForm(f => ({ ...f, galleryUrls: [...f.galleryUrls, url] }));
      toast.success('Image uploaded');
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = () => {
    if (!form.label.trim()) { toast.error("Branch name required."); return; }
    if (!form.address.trim()) { toast.error("Address required."); return; }
    const lat = parseFloat(form.latitude); const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) { toast.error("Valid latitude and longitude are required."); return; }
    const payload = {
      label: form.label, address: form.address, city: form.city, region: form.region,
      country: form.country, phoneNumber: form.phoneNumber, galleryUrls: form.galleryUrls,
      isPrimary: form.isPrimary, latitude: lat, longitude: lng,
      operatingHours: serializeHours(hours),
    };
    if (modal === "create") createMut.mutate(payload);
    else updateMut.mutate({ id: modal.id, data: payload });
  };

  if (isLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i=><Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--az-text)]">Locations &amp; Branches</h1>
          <p className="text-sm text-[var(--az-text-muted)] mt-0.5">Manage where customers can find and pay you</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Location</Button>
      </div>

      {locs.length === 0 ? (
        <Empty icon={MapPin} title='No locations yet'
               description='Add your first branch so customers can discover and visit you.'
               action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Location</Button>} />
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {locs.map(loc => <LocationCard key={loc.id} loc={loc}
            onEdit={() => openEdit(loc)}
            onDelete={() => { if (confirm(`Deactivate "${loc.label}"?`)) deleteMut.mutate(loc.id); }}
            expandedTables={expandedTables}
            setExpandedTables={setExpandedTables}
            newTableLabel={newTableLabel}
            setNewTableLabel={setNewTableLabel}
            createTableMut={createTableMut}
          />)}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal !== null}
        onClose={closeModal}
        title={modal === 'create' ? 'Add Location' : 'Edit Location'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Branch Name *" placeholder="e.g. Osu Branch" value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))} />
          <Input label="Address *" placeholder="Street address" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} />
          <div className='grid grid-cols-2 gap-3'>
            <Input label="City" value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} />
            <Input label="Region" value={form.region} onChange={e => setForm(f=>({...f,region:e.target.value}))} />
          </div>
          <Input label="Country (2-char ISO)" placeholder="GH" maxLength={2} value={form.country} onChange={e => setForm(f=>({...f,country:e.target.value}))} />
          <div className='grid grid-cols-2 gap-3'>
            <Input label='Latitude *' placeholder='5.6037' value={form.latitude} onChange={e => setForm(f=>({...f,latitude:e.target.value}))} />
            <Input label='Longitude *' placeholder='-0.1870' value={form.longitude} onChange={e => setForm(f=>({...f,longitude:e.target.value}))} />
          </div>
          <p className='text-xs text-[var(--az-text-muted)] -mt-2'>Open Google Maps → right-click your location → copy coordinates</p>
          <Input label="Phone (optional)" value={form.phoneNumber} onChange={e => setForm(f=>({...f,phoneNumber:e.target.value}))} />
          {/* Operating Hours */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wide'>Operating Hours</p>
            {DAYS.map(d => (
              <div key={d} className='flex items-center gap-3'>
                <span className='text-xs text-[var(--az-text-muted)] w-20'>{DAY_LABELS[d]}</span>
                <input type="checkbox" checked={hours[d].closed} onChange={e => setHours(h=>({...h,[d]:{...h[d],closed:e.target.checked}}))} className="accent-[var(--az-accent)]" />
                <span className='text-xs text-[var(--az-text-muted)]'>Closed</span>
                {!hours[d].closed && (<>
                  <input type='time' value={hours[d].open}  onChange={e=>setHours(h=>({...h,[d]:{...h[d],open:e.target.value}}))}  className='bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-2 py-1 text-xs text-[var(--az-text)]' />
                  <span className='text-xs text-[var(--az-text-muted)]'>to</span>
                  <input type='time' value={hours[d].close} onChange={e=>setHours(h=>({...h,[d]:{...h[d],close:e.target.value}}))} className='bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-2 py-1 text-xs text-[var(--az-text)]' />
                </>)}
              </div>
            ))}
          </div>
          {/* Gallery */}
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wide'>Gallery Photos (max 10)</p>
            <div className='grid grid-cols-4 gap-2'>
              {form.galleryUrls.map((url,i) => (
                <div key={i} className='relative aspect-square rounded-xl overflow-hidden border border-[var(--az-border)]'>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={()=>setForm(f=>({...f,galleryUrls:f.galleryUrls.filter((_,j)=>j!==i)}))}
                    className='absolute top-1 right-1 w-5 h-5 bg-[var(--az-danger)] rounded-full text-[var(--az-text)] text-[10px] font-bold flex items-center justify-center'>×</button>
                </div>
              ))}
              {form.galleryUrls.length < 10 && (
                <label className='aspect-square rounded-xl border-2 border-dashed border-[var(--az-border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--az-accent)]'>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                  {uploading
                    ? <div className='w-4 h-4 border-2 border-[var(--az-accent)] border-t-transparent rounded-full animate-spin'/>
                    : <><Image className='w-4 h-4 text-[var(--az-text-muted)]' /><span className='text-[10px] text-[var(--az-text-muted)] mt-1'>Add</span></>}
                </label>
              )}
            </div>
            {!isCloudinaryConfigured() && (
              <p className='text-xs text-[var(--az-text-muted)]'>Image upload is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to enable uploads.</p>
            )}
          </div>
          {/* isPrimary */}
          <label className='flex items-center gap-3 cursor-pointer'>
            <input type="checkbox" checked={form.isPrimary} onChange={e=>setForm(f=>({...f,isPrimary:e.target.checked}))} className="accent-[var(--az-accent)] w-4 h-4" />
            <span className='text-sm text-[var(--az-text)]'>Set as primary location</span>
          </label>
        </div>
        <div className='flex gap-3 mt-4 pt-4 border-t border-[var(--az-border)]'>
          <Button variant='secondary' onClick={closeModal} className='flex-1'>Cancel</Button>
          <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending} className='flex-1'>
            {modal === 'create' ? 'Add Location' : 'Save Changes'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}


// ── Holiday / Exception Hours sub-component ──────────────────────────────────
// Shows existing exceptions for a location, lets you add new ones, and delete.
function HolidayHours({ locId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newExc, setNewExc] = useState({ date: '', isClosed: false, openTime: '09:00', closeTime: '17:00', note: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['hours-exceptions', locId],
    queryFn: () => businessOS.getHoursExceptions(locId),
  });
  const exceptions = data?.exceptions || [];

  const addMut = useMutation({
    mutationFn: (data) => businessOS.addHoursException(locId, data),
    onSuccess: () => {
      toast.success('Exception added');
      qc.invalidateQueries(['hours-exceptions', locId]);
      setNewExc({ date: '', isClosed: false, openTime: '09:00', closeTime: '17:00', note: '' });
      setShowForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (excId) => businessOS.deleteHoursException(locId, excId),
    onSuccess: () => {
      toast.success('Exception removed');
      qc.invalidateQueries(['hours-exceptions', locId]);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wide">
          Holiday / Exception Hours
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[var(--az-accent)] hover:underline"
        >
          {showForm ? 'Cancel' : '+ Add Exception'}
        </button>
      </div>

      {/* Existing exceptions */}
      {isLoading ? (
        <p className="text-xs text-[var(--az-text-muted)]">Loading...</p>
      ) : exceptions.length === 0 ? (
        <p className="text-xs text-[var(--az-text-muted)]">No holiday exceptions set.</p>
      ) : (
        <div className="space-y-1.5">
          {exceptions.map(exc => (
            <div key={exc.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--az-black)] border border-[var(--az-border)] text-xs">
              <CalendarDays className="w-3.5 h-3.5 text-[var(--az-accent)] flex-shrink-0" />
              <span className="text-[var(--az-text)] font-medium">
                {new Date(exc.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {exc.isClosed ? (
                <Badge color="var(--az-danger)" className="text-xs">Closed</Badge>
              ) : (
                <span className="text-[var(--az-text-muted)]">{exc.openTime} – {exc.closeTime}</span>
              )}
              {exc.note && <span className="text-[var(--az-text-muted)] truncate">· {exc.note}</span>}
              <button
                onClick={() => delMut.mutate(exc.id)}
                className="ml-auto text-[var(--az-text-muted)] hover:text-[var(--az-danger)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add exception form */}
      {showForm && (
        <div className="space-y-2 p-3 rounded-lg border border-[var(--az-border)] bg-[var(--az-surface)]">
          <input
            type="date"
            value={newExc.date}
            onChange={e => setNewExc({ ...newExc, date: e.target.value })}
            className="w-full bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-3 py-2 text-xs text-[var(--az-text)] outline-none focus:border-[var(--az-accent)]"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--az-text)]">
              <input
                type="checkbox"
                checked={newExc.isClosed}
                onChange={e => setNewExc({ ...newExc, isClosed: e.target.checked })}
                className="accent-[var(--az-accent)]"
              />
              Closed all day
            </label>
            {!newExc.isClosed && (
              <div className="flex items-center gap-2">
                <input type="time" value={newExc.openTime}
                  onChange={e => setNewExc({ ...newExc, openTime: e.target.value })}
                  className="bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-2 py-1 text-xs text-[var(--az-text)]" />
                <span className="text-xs text-[var(--az-text-muted)]">to</span>
                <input type="time" value={newExc.closeTime}
                  onChange={e => setNewExc({ ...newExc, closeTime: e.target.value })}
                  className="bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-2 py-1 text-xs text-[var(--az-text)]" />
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="Note (e.g. Christmas Eve — half day)"
            value={newExc.note}
            onChange={e => setNewExc({ ...newExc, note: e.target.value })}
            className="w-full bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-3 py-2 text-xs text-[var(--az-text)] placeholder:text-[var(--az-text-muted)] outline-none focus:border-[var(--az-accent)]"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!newExc.date) { toast.error('Date is required'); return; }
              addMut.mutate(newExc);
            }}
            loading={addMut.isPending}
            className="w-full"
          >
            <Plus className="w-3.5 h-3.5" /> Save Exception
          </Button>
        </div>
      )}
    </div>
  );
}
function LocationCard({ loc, onEdit, onDelete, expandedTables, setExpandedTables, newTableLabel, setNewTableLabel, createTableMut }) {
  const qc = useQueryClient();
  const expanded = !!expandedTables[loc.id];
  const galleryCount = Array.isArray(loc.galleryUrls) ? loc.galleryUrls.length : 0;

  const { data: tablesData } = useQuery({
    queryKey: ['biz-location-tables', loc.id],
    queryFn:  () => locApi.listTables(loc.id),
    enabled:  expanded,
    initialData: loc.tables ? { success: true, tables: loc.tables } : undefined,
  });
  const tables = tablesData?.tables || loc.tables || [];

  const deleteTableMut = useMutation({
    mutationFn: (tableId) => locApi.deleteTable(tableId),
    onSuccess: () => {
      toast.success('Table removed');
      qc.invalidateQueries({ queryKey: ['biz-location-tables', loc.id] });
      qc.invalidateQueries({ queryKey: ['biz-locations'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = () => setExpandedTables(s => ({ ...s, [loc.id]: !s[loc.id] }));

  const submitTable = () => {
    const label = (newTableLabel[loc.id] || '').trim();
    if (!label) { toast.error('Table label required.'); return; }
    createTableMut.mutate({ locId: loc.id, label });
  };

  return (
    <Card className={`flex flex-col gap-3 ${!loc.isActive ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--az-accent-subtle)] border border-[#00d97e30] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-[var(--az-accent)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[var(--az-text)] truncate">{loc.label}</p>
              {loc.isPrimary && <Badge color="var(--az-accent)">Primary</Badge>}
            </div>
            <p className="text-xs text-[var(--az-text-muted)] mt-0.5 truncate">{loc.address}</p>
            {(loc.city || loc.region) && (
              <p className="text-xs text-[var(--az-text-muted)] mt-0.5 truncate">{[loc.city, loc.region].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>
        <Badge color={loc.isActive ? 'var(--az-accent)' : 'var(--az-text-muted)'} bg={loc.isActive ? 'var(--az-accent-subtle)' : '#7b7b9a1a'}>
          {loc.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-[var(--az-text-muted)]">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {hoursSummary(loc.operatingHours)}</span>
        <span className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> {galleryCount} photo{galleryCount === 1 ? '' : 's'}</span>
        <span>{(loc.tables?.length || 0)} table{(loc.tables?.length || 0) === 1 ? '' : 's'}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onEdit} className="flex-1">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={toggle} className="flex-1">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Tables
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tables sub-panel */}
      {/* Holiday / Exception Hours */}
      {expanded && (
        <div className="mt-1 pt-3 border-t border-[var(--az-border)]">
          <HolidayHours locId={loc.id} />
        </div>
      )}

      {expanded && (
        <div className="mt-1 pt-3 border-t border-[var(--az-border)] space-y-2">
          {tables.length === 0 ? (
            <p className="text-xs text-[var(--az-text-muted)]">No tables yet. Add one below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tables.map(t => (
                <span key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--az-black)] border border-[var(--az-border)] text-xs text-[var(--az-text)]">
                  {t.label}
                  <button
                    onClick={() => { if (confirm(`Remove table "${t.label}"?`)) deleteTableMut.mutate(t.id); }}
                    className="text-[var(--az-text-muted)] hover:text-[var(--az-danger)] transition-colors"
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Table label, e.g. T1"
              value={newTableLabel[loc.id] || ''}
              onChange={e => setNewTableLabel(s => ({ ...s, [loc.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') submitTable(); }}
              className="flex-1 bg-[var(--az-black)] border border-[var(--az-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--az-text)] placeholder:text-[var(--az-text-muted)] outline-none focus:border-[var(--az-accent)]"
            />
            <Button size="sm" onClick={submitTable} loading={createTableMut.isPending}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
