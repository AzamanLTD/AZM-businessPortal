import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retailApi } from '@/lib/marketplaceApi';
import { products as productsListApi } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import {
  Card,
  Tag,
  Button,
  Input,
  Textarea,
  Select,
  Empty,
  Skel,
  Dialog,
} from '@/components/instrument';
import { fmtUSDC } from '@/lib/utils';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Barcode,
  ClipboardCheck,
  ShoppingCart,
  AlertTriangle,
  X,
  Search,
  TrendingDown,
  TrendingUp,
  Save,
  RotateCcw,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Package },
  { key: 'suppliers', label: 'Suppliers', icon: Building2 },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { key: 'stock-count', label: 'Stock Count', icon: ClipboardCheck },
];

const STATUS_COLORS = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  RECEIVED: 'green',
  CANCELLED: 'red',
  OPEN: 'amber',
  COUNTED: 'blue',
  RECONCILED: 'green',
};

export default function RetailInventory() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['retail', 'low-stock'],
    queryFn: retailApi.lowStock,
    staleTime: 30000,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['retail', 'suppliers'],
    queryFn: retailApi.listSuppliers,
    staleTime: 30000,
  });

  const { data: poData } = useQuery({
    queryKey: ['retail', 'purchase-orders'],
    queryFn: retailApi.listPurchaseOrders,
    staleTime: 30000,
  });

  const { data: stockCountsData } = useQuery({
    queryKey: ['retail', 'stock-counts'],
    queryFn: retailApi.listStockCounts,
    staleTime: 30000,
  });

  const lowStockItems = lowStockData?.items || [];
  const suppliers = suppliersData?.suppliers || [];
  const purchaseOrders = poData?.purchaseOrders || [];
  const stockCounts = stockCountsData?.stockCounts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Retail Inventory</h1>
          <p className="text-sm text-ink-2 mt-1">
            Barcode/SKU management, stock counts, purchase orders & supplier directory.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[var(--hold)]" />
            <span className="text-xs uppercase text-ink-2">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)]">{lowStockItems.length}</p>
          <p className="text-xs text-ink-3 mt-0.5">items need reorder</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-[var(--info)]" />
            <span className="text-xs uppercase text-ink-2">Suppliers</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)]">{suppliers.length}</p>
          <p className="text-xs text-ink-3 mt-0.5">{suppliers.filter(s => s.isActive).length} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-[var(--go)]" />
            <span className="text-xs uppercase text-ink-2">Open POs</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)]">
            {purchaseOrders.filter(po => po.status === 'SUBMITTED').length}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">{purchaseOrders.length} total</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs uppercase text-ink-2">Stock Counts</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text)]">
            {stockCounts.filter(sc => sc.status === 'OPEN').length}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">{stockCounts.length} total</p>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-line pb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-[var(--go)]'
                  : 'border-transparent text-ink-2:text-[var(--text)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab lowStockItems={lowStockItems} />}
      {activeTab === 'suppliers' && <SuppliersTab />}
      {activeTab === 'purchase-orders' && <PurchaseOrdersTab suppliers={suppliers} />}
      {activeTab === 'stock-count' && <StockCountTab />}
    </div>
  );
}

function OverviewTab({ lowStockItems, loading }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => retailApi.updateProductBarcode(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditingId(null);
      toast.success('Barcode updated');
    },
    onError: (e) => toast.error(e.message || 'Failed to update barcode'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'retail-list'],
    queryFn: () => productsListApi.list({ limit: 100 }),
    staleTime: 30000,
  });

  const products = productsData?.products || productsData || [];

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      sku: product.sku || '',
      barcode: product.barcode || '',
      costPrice: product.costPrice || '',
      stockQty: product.stockQty ?? '',
      lowStockThreshold: product.lowStockThreshold || 5,
    });
  }

  function handleSave(productId) {
    const data = {};
    if (editForm.sku !== '') data.sku = editForm.sku || null;
    if (editForm.barcode !== '') data.barcode = editForm.barcode || null;
    if (editForm.costPrice !== '') data.costPrice = parseFloat(editForm.costPrice) || null;
    if (editForm.stockQty !== '') data.stockQty = parseInt(editForm.stockQty, 10);
    if (editForm.lowStockThreshold !== '') data.lowStockThreshold = parseInt(editForm.lowStockThreshold, 10);
    updateMutation.mutate({ id: productId, data });
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--hold)] uppercase tracking-wide mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Low Stock Alerts
        </h2>
        {loading ? (
          <Skel rows={3} />
        ) : lowStockItems.length === 0 ? (
          <Empty
            icon={CheckCircle2}
            title="All stock levels healthy"
            subtitle="No items are below their low-stock threshold."
          />
        ) : (
          <div className="space-y-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-surface rounded-lg p-3 border border-line/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--f-warn-bg)] flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-[var(--hold)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{item.name}</p>
                    <p className="text-xs text-ink-3">SKU: {item.sku || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--hold)]">{item.stockQty || 0} units</p>
                  <p className="text-xs text-ink-3">threshold: {item.lowStockThreshold || 5}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--info)] uppercase tracking-wide mb-3 flex items-center gap-2">
          <Barcode className="w-4 h-4" /> Barcode & SKU Management
        </h2>
        {products.length === 0 ? (
          <Empty icon={Barcode} title="No products yet" subtitle="Create products to assign barcodes and SKUs." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-3 border-b border-line">
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 px-3 font-medium">SKU</th>
                  <th className="py-2 px-3 font-medium">Barcode</th>
                  <th className="py-2 px-3 font-medium">Cost</th>
                  <th className="py-2 px-3 font-medium">Stock</th>
                  <th className="py-2 px-3 font-medium">Threshold</th>
                  <th className="py-2 pl-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 30).map(product => (
                  <tr key={product.id} className="border-b border-line/30:bg-surface/50">
                    <td className="py-2 pr-3 text-[var(--text)]">{product.name}</td>
                    {editingId === product.id ? (
                      <>
                        <td className="py-2 px-3">
                          <Input value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" className="h-7 text-xs w-24" />
                        </td>
                        <td className="py-2 px-3">
                          <Input value={editForm.barcode} onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))} placeholder="EAN/UPC" className="h-7 text-xs w-28" />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" value={editForm.costPrice} onChange={e => setEditForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0.00" className="h-7 text-xs w-20" />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" value={editForm.stockQty} onChange={e => setEditForm(f => ({ ...f, stockQty: e.target.value }))} placeholder="0" className="h-7 text-xs w-16" />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" value={editForm.lowStockThreshold} onChange={e => setEditForm(f => ({ ...f, lowStockThreshold: e.target.value }))} placeholder="5" className="h-7 text-xs w-16" />
                        </td>
                        <td className="py-2 pl-3 flex gap-1 justify-end">
                          <Button size="sm" onClick={() => handleSave(product.id)} disabled={updateMutation.isPending}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-ink-2 font-mono text-xs">{product.sku || '—'}</td>
                        <td className="py-2 px-3 text-ink-2 font-mono text-xs">{product.barcode || '—'}</td>
                        <td className="py-2 px-3 text-ink-2 text-xs">{product.costPrice ? fmtUSDC(product.costPrice) : '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`text-xs font-medium ${product.stockQty !== null && (product.stockQty || 0) <= (product.lowStockThreshold || 5) ? 'text-[var(--hold)]' : 'text-[var(--text)]'}`}>
                            {product.stockQty ?? '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-ink-3 text-xs">{product.lowStockThreshold || 5}</td>
                        <td className="py-2 pl-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => startEdit(product)}><Pencil className="w-3 h-3" /></Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SuppliersTab() {
  const qc = useQueryClient();
  const [showDialog, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' });

  const { data, isLoading } = useQuery({ queryKey: ['retail', 'suppliers'], queryFn: retailApi.listSuppliers });
  const createMut = useMutation({
    mutationFn: retailApi.createSupplier,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retail'] }); setShowModal(false); resetForm(); toast.success('Supplier created'); },
    onError: (e) => toast.error(e.message || 'Failed to create supplier'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => retailApi.updateSupplier(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retail'] }); setShowModal(false); resetForm(); toast.success('Supplier updated'); },
    onError: (e) => toast.error(e.message || 'Failed to update supplier'),
  });
  const deleteMut = useMutation({
    mutationFn: retailApi.deleteSupplier,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retail'] }); toast.success('Supplier deleted'); },
    onError: (e) => toast.error(e.message || 'Failed to delete supplier'),
  });

  function resetForm() { setForm({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' }); setEditSupplier(null); }
  function handleSubmit() { if (editSupplier) updateMut.mutate({ id: editSupplier.id, data: form }); else createMut.mutate(form); }
  function startEdit(supplier) {
    setEditSupplier(supplier);
    setForm({ name: supplier.name || '', contactName: supplier.contactName || '', email: supplier.email || '', phone: supplier.phone || '', address: supplier.address || '', notes: supplier.notes || '' });
    setShowModal(true);
  }

  const suppliers = data?.suppliers || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-ink-2">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => { resetForm(); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Supplier</Button>
      </div>
      {isLoading ? <Skel rows={4} /> : suppliers.length === 0 ? (
        <Empty icon={Building2} title="No suppliers yet" subtitle="Add suppliers to create purchase orders." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{s.name}</p>
                  {s.contactName && <p className="text-xs text-ink-2 mt-0.5">{s.contactName}</p>}
                </div>
                <Tag color={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Active' : 'Inactive'}</Tag>
              </div>
              <div className="mt-3 space-y-1">
                {s.email && <p className="text-xs text-ink-3">✉ {s.email}</p>}
                {s.phone && <p className="text-xs text-ink-3">☎ {s.phone}</p>}
                {s.address && <p className="text-xs text-ink-3">⌂ {s.address}</p>}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => startEdit(s)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete supplier "${s.name}"?`)) deleteMut.mutate(s.id); }}>
                  <Trash2 className="w-3 h-3 text-[var(--stop)]" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editSupplier ? 'Edit Supplier' : 'Add Supplier'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-2 mb-1 block">Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Supplies Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-2 mb-1 block">Contact Name</label>
              <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-xs text-ink-2 mb-1 block">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+233 20 000 0000" />
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-2 mb-1 block">Email</label>
            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="orders@acme.com" />
          </div>
          <div>
            <label className="text-xs text-ink-2 mb-1 block">Address</label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Industrial Ave, Accra" />
          </div>
          <div>
            <label className="text-xs text-ink-2 mb-1 block">Notes</label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, delivery schedule, etc." rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {editSupplier ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function PurchaseOrdersTab({ suppliers }) {
  const qc = useQueryClient();
  const [showDialog, setShowModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poForm, setPoForm] = useState({ supplierId: '', notes: '', expectedDate: '', items: [{ productName: '', sku: '', quantity: 1, unitCost: 0 }] });

  const { data, isLoading } = useQuery({ queryKey: ['retail', 'purchase-orders'], queryFn: retailApi.listPurchaseOrders });
  const createMut = useMutation({
    mutationFn: retailApi.createPurchaseOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retail'] }); setShowModal(false); resetPOForm(); toast.success('Purchase order created'); },
    onError: (e) => toast.error(e.message || 'Failed to create purchase order'),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, data }) => retailApi.updatePurchaseOrder(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retail'] }); toast.success('Purchase order updated'); },
    onError: (e) => toast.error(e.message || 'Failed to update purchase order'),
  });

  function resetPOForm() { setPoForm({ supplierId: '', notes: '', expectedDate: '', items: [{ productName: '', sku: '', quantity: 1, unitCost: 0 }] }); }
  function addItem() { setPoForm(f => ({ ...f, items: [...f.items, { productName: '', sku: '', quantity: 1, unitCost: 0 }] })); }
  function removeItem(idx) { setPoForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })); }
  function updateItem(idx, field, val) { setPoForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: val } : item) })); }
  const poTotal = poForm.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0), 0);

  function handleSubmit() {
    createMut.mutate({ supplierId: poForm.supplierId, notes: poForm.notes, expectedDate: poForm.expectedDate || undefined, items: poForm.items.filter(i => i.productName) });
  }

  const purchaseOrders = data?.purchaseOrders || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-ink-2">{purchaseOrders.length} purchase order{purchaseOrders.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => { resetPOForm(); setShowModal(true); }} disabled={suppliers.length === 0}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Create PO
        </Button>
      </div>
      {suppliers.length === 0 && (
        <div className="bg-[var(--f-warn-bg)] border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--hold)]" />
          <p className="text-xs text-amber-300">Add at least one supplier before creating purchase orders.</p>
        </div>
      )}
      {isLoading ? <Skel rows={4} /> : purchaseOrders.length === 0 ? (
        <Empty icon={ShoppingCart} title="No purchase orders yet" subtitle="Create a PO to order stock from your suppliers." />
      ) : (
        <div className="space-y-2">
          {purchaseOrders.map(po => (
            <Card key={po.id} className="p-4 cursor-pointer:border-line/60 transition-colors" onClick={() => setSelectedPO(po)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--go)]/15 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[var(--go)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{po.poNumber}</p>
                    <p className="text-xs text-ink-3">{po.supplier?.name || 'Unknown'} • {po.items?.length || 0} item{po.items?.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text)]">{fmtUSDC(po.totalCost)}</p>
                    <p className="text-xs text-ink-3">{new Date(po.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Tag color={STATUS_COLORS[po.status] || 'gray'}>{po.status}</Tag>
                </div>
              </div>
              {po.status === 'SUBMITTED' && (
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <Button size="sm" onClick={() => statusMut.mutate({ id: po.id, data: { status: 'RECEIVED' } })} disabled={statusMut.isPending}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Received
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: po.id, data: { status: 'CANCELLED' } })}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Create Purchase Order" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-2 mb-1 block">Supplier *</label>
              <Select value={poForm.supplierId} onChange={e => setPoForm(f => ({ ...f, supplierId: e.target.value }))}>
                <option value="">Select supplier…</option>
                {suppliers.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-ink-2 mb-1 block">Expected Date</label>
              <Input type="date" value={poForm.expectedDate} onChange={e => setPoForm(f => ({ ...f, expectedDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-ink-2">Line Items</label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-2">
              {poForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input value={item.productName} onChange={e => updateItem(idx, 'productName', e.target.value)} placeholder="Product name" className="flex-1" />
                  <Input value={item.sku} onChange={e => updateItem(idx, 'sku', e.target.value)} placeholder="SKU" className="w-24" />
                  <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="Qty" className="w-16" />
                  <Input type="number" step="0.01" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', e.target.value)} placeholder="Unit cost" className="w-24" />
                  <span className="text-xs text-ink-2 w-20 text-right">{fmtUSDC((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0))}</span>
                  <Button size="sm" variant="outline" onClick={() => removeItem(idx)} disabled={poForm.items.length === 1}><X className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2"><span className="text-sm font-bold text-[var(--text)]">Total: {fmtUSDC(poTotal)}</span></div>
          </div>
          <div>
            <label className="text-xs text-ink-2 mb-1 block">Notes</label>
            <Textarea value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} placeholder="Delivery instructions…" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!poForm.supplierId || poForm.items.every(i => !i.productName) || createMut.isPending}>Create Purchase Order</Button>
          </div>
        </div>
      </Dialog>

      {selectedPO && (
        <Dialog open={!!selectedPO} onClose={() => setSelectedPO(null)} title={selectedPO.poNumber} size="lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-2">Supplier: <span className="text-[var(--text)]">{selectedPO.supplier?.name}</span></p>
                <p className="text-xs text-ink-3 mt-0.5">Created: {new Date(selectedPO.createdAt).toLocaleString()}</p>
              </div>
              <Tag color={STATUS_COLORS[selectedPO.status] || 'gray'}>{selectedPO.status}</Tag>
            </div>
            {selectedPO.notes && <div className="bg-surface rounded-lg p-3"><p className="text-xs text-ink-3 mb-1">Notes</p><p className="text-sm text-ink-2">{selectedPO.notes}</p></div>}
            <div>
              <p className="text-xs text-ink-2 mb-2">Line Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3 border-b border-line">
                    <th className="py-1.5 pr-2 font-medium">Product</th>
                    <th className="py-1.5 px-2 font-medium">SKU</th>
                    <th className="py-1.5 px-2 font-medium text-right">Qty</th>
                    <th className="py-1.5 px-2 font-medium text-right">Unit Cost</th>
                    <th className="py-1.5 pl-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items?.map(item => (
                    <tr key={item.id} className="border-b border-line/30">
                      <td className="py-1.5 pr-2 text-[var(--text)]">{item.productName}</td>
                      <td className="py-1.5 px-2 text-ink-2 font-mono text-xs">{item.sku || '—'}</td>
                      <td className="py-1.5 px-2 text-right text-[var(--text)]">{item.quantity}</td>
                      <td className="py-1.5 px-2 text-right text-ink-2">{fmtUSDC(item.unitCost)}</td>
                      <td className="py-1.5 pl-2 text-right text-[var(--text)] font-medium">{fmtUSDC(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-2 text-right text-xs text-ink-2 font-medium">Total</td>
                    <td className="py-2 pl-2 text-right text-[var(--text)] font-bold">{fmtUSDC(selectedPO.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {selectedPO.status === 'SUBMITTED' && (
              <div className="flex gap-2">
                <Button onClick={() => { statusMut.mutate({ id: selectedPO.id, data: { status: 'RECEIVED' } }); setSelectedPO(null); }}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Received & Update Stock
                </Button>
                <Button variant="outline" onClick={() => { statusMut.mutate({ id: selectedPO.id, data: { status: 'CANCELLED' } }); setSelectedPO(null); }}>Cancel PO</Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function StockCountTab() {
  const qc = useQueryClient();
  const [selectedCount, setSelectedCount] = useState(null);
  const [countedValues, setCountedValues] = useState({});

  const { data, isLoading } = useQuery({ queryKey: ['retail', 'stock-counts'], queryFn: retailApi.listStockCounts });
  const createMut = useMutation({
    mutationFn: retailApi.createStockCount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retail'] }),
  });
  const itemMut = useMutation({
    mutationFn: ({ countId, itemId, data }) => retailApi.updateStockCountItem(countId, itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retail'] }),
  });
  const reconcileMut = useMutation({
    mutationFn: retailApi.reconcileStockCount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retail'] }); setSelectedCount(null); },
  });

  const stockCounts = data?.stockCounts || [];
  const activeCount = selectedCount ? stockCounts.find(sc => sc.id === selectedCount) : null;

  function handleCount(countId, itemId, qty) {
    setCountedValues(v => ({ ...v, [itemId]: qty }));
    itemMut.mutate({ countId, itemId, data: { countedQty: parseInt(qty, 10) } });
  }

  return (
    <div className="space-y-4">
      {!activeCount ? (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-ink-2">{stockCounts.length} stock count{stockCounts.length !== 1 ? 's' : ''}</p>
            <Button onClick={() => createMut.mutate({})} disabled={createMut.isPending}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Stock Count
            </Button>
          </div>
          {isLoading ? <Skel rows={4} /> : stockCounts.length === 0 ? (
            <Empty icon={ClipboardCheck} title="No stock counts yet" subtitle="Start a new stock count to reconcile your inventory." />
          ) : (
            <div className="space-y-2">
              {stockCounts.map(sc => (
                <Card key={sc.id} className="p-4 cursor-pointer:border-line/60 transition-colors" onClick={() => setSelectedCount(sc.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck className="w-5 h-5 text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{sc.countNumber}</p>
                        <p className="text-xs text-ink-3">{sc.items?.length || 0} items • {new Date(sc.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Tag color={STATUS_COLORS[sc.status] || 'gray'}>{sc.status}</Tag>
                  </div>
                  {sc.status === 'OPEN' && sc.items && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs text-ink-3">
                        <Clock className="w-3 h-3" />
                        {sc.items.filter(i => i.countedQty !== null).length} / {sc.items.length} counted
                      </div>
                      <div className="h-1 bg-surface rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${sc.items.length > 0 ? (sc.items.filter(i => i.countedQty !== null).length / sc.items.length * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedCount(null)}><X className="w-3.5 h-3.5 mr-1" /> Close</Button>
              <h2 className="text-sm font-medium text-[var(--text)]">{activeCount.countNumber}</h2>
              <Tag color={STATUS_COLORS[activeCount.status] || 'gray'}>{activeCount.status}</Tag>
            </div>
            {activeCount.status === 'OPEN' && (
              <Button onClick={() => reconcileMut.mutate(activeCount.id)} disabled={activeCount.items?.every(i => i.countedQty === null) || reconcileMut.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Reconcile & Apply
              </Button>
            )}
          </div>
          <Card className="p-4">
            {activeCount.items?.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-4">No tracked products in this count.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-3 border-b border-line">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 px-3 font-medium">Product</th>
                      <th className="py-2 px-3 font-medium text-right">System Qty</th>
                      <th className="py-2 px-3 font-medium text-right">Counted Qty</th>
                      <th className="py-2 px-3 font-medium text-right">Discrepancy</th>
                      <th className="py-2 pl-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCount.items?.map((item, idx) => {
                      const discrepancy = item.discrepancy !== null && item.discrepancy !== undefined
                        ? item.discrepancy
                        : (item.countedQty !== null && item.countedQty !== undefined ? item.countedQty - item.systemQty : null);
                      return (
                        <tr key={item.id} className="border-b border-line/30">
                          <td className="py-2 pr-3 text-ink-3 text-xs">{idx + 1}</td>
                          <td className="py-2 px-3 text-[var(--text)] text-xs font-mono">{item.productId?.slice(0, 8)}…</td>
                          <td className="py-2 px-3 text-right text-ink-2">{item.systemQty}</td>
                          <td className="py-2 px-3 text-right">
                            {activeCount.status === 'OPEN' ? (
                              <Input type="number" value={countedValues[item.id] ?? item.countedQty ?? ''} onChange={e => handleCount(activeCount.id, item.id, e.target.value)} placeholder="—" className="h-7 w-20 text-right text-xs" />
                            ) : <span className="text-[var(--text)]">{item.countedQty ?? '—'}</span>}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {discrepancy !== null ? (
                              <span className={`text-xs font-medium ${discrepancy === 0 ? 'text-ink-3' : discrepancy > 0 ? 'text-[var(--go)]' : 'text-[var(--stop)]'}`}>{discrepancy > 0 ? '+' : ''}{discrepancy}</span>
                            ) : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="py-2 pl-3 text-ink-3 text-xs">{item.notes || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          {activeCount.status === 'RECONCILED' && (
            <div className="bg-[var(--f-ok-bg)] border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--go)]" />
              <p className="text-xs text-emerald-300">
                Stock count reconciled. Product stock quantities updated.
                {activeCount.reconciledAt && ` Reconciled on ${new Date(activeCount.reconciledAt).toLocaleString()}.`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
