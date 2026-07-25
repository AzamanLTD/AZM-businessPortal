import { useMemo, useState, useEffect } from 'react';
import { generateInvoicePDF } from '@/lib/invoicePdf';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices as invoicesApi, locations as locApi } from '@/lib/api';
import { bookingOpsApi } from '@/lib/marketplaceApi';
import { Card, Badge, Button, Input, Textarea, Select, Empty, Skeleton, Modal, Tabs, Progress } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Widget, WidgetStat, WidgetRow } from '@/components/ui/Widget';
import { fmtUSDC, fmt, formatDateTime, relativeTime, cn } from '@/lib/utils';
import {
  Receipt, Plus, Search, X, Trash2, Eye, Send, Ban,
  User, MapPin, Star, AlertCircle, Loader2, ChevronDown, ChevronUp, Check
} from 'lucide-react';

// ── Invoice status display config ───────────────────────────────────────────
const INVOICE_STATUS_META = {
  DRAFT:  { label: 'Draft',  color: 'var(--az-text-muted)', bg: '#7b7b9a1a' },
  SENT:   { label: 'Sent',   color: 'var(--az-info)', bg: 'var(--az-info)' },
  PAID:   { label: 'Paid',   color: 'var(--az-success)', bg: 'var(--az-success)' },
  VOID: { label: 'Void', color: 'var(--az-danger)', bg: 'var(--az-danger)' },
};
const TABS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'VOID'];

const initials = (name) => (name || '?').trim().charAt(0).toUpperCase();

// ════════════════════════════════════════════════════════════════════════════
export default function Invoices() {
  const qc = useQueryClient();
  const { bizProfile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [showVoidReason, setShowVoidReason] = useState(null); // stores invoice ID to void
  const [voidReason, setVoidReason] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [taxSectionOpen, setTaxSectionOpen] = useState(false);

  // Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ['biz-invoices'],
    queryFn: () => invoicesApi.list({ limit: 100 }),
  });
  const all = data?.invoices || [];

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => bookingOpsApi.invoiceStats(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['biz-invoices'] });
    qc.invalidateQueries({ queryKey: ['biz-invoice'] });
    qc.invalidateQueries({ queryKey: ['invoice-stats'] });
  };

  // Mutations
  const sendMut = useMutation({
    mutationFn: (id) => invoicesApi.send(id),
    onSuccess: () => {
      toast({ title: 'Invoice Sent', description: 'The invoice has been locked and sent to the customer.', variant: 'success' });
      invalidate();
    },
    onError: (e) => toast({ title: 'Error Sending', description: e.message, variant: 'destructive' }),
  });

  const voidMut = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.void(id, { reason }),
    onSuccess: () => {
      toast({ title: 'Invoice Voided', description: 'The invoice is now cancelled.', variant: 'success' });
      setShowVoidReason(null);
      setVoidReason('');
      invalidate();
    },
    onError: (e) => toast({ title: 'Error Voiding', description: e.message, variant: 'destructive' }),
  });

  // Bulk mutations
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const handleBulkSend = async () => {
    const drafts = all.filter(i => selectedIds.includes(i.id) && i.status === 'DRAFT');
    if (drafts.length === 0) return;
    setIsBulkProcessing(true);
    let successCount = 0;
    for (const inv of drafts) {
      try {
        await invoicesApi.send(inv.id);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    toast({
      title: 'Bulk Send Complete',
      description: `Successfully sent ${successCount} of ${drafts.length} draft invoices.`,
      variant: 'success'
    });
    setSelectedIds([]);
    invalidate();
    setIsBulkProcessing(false);
  };

  const handleBulkVoid = async () => {
    const sents = all.filter(i => selectedIds.includes(i.id) && i.status === 'SENT');
    if (sents.length === 0) return;
    if (!confirm(`Are you sure you want to void ${sents.length} sent invoices?`)) return;
    setIsBulkProcessing(true);
    let successCount = 0;
    for (const inv of sents) {
      try {
        await invoicesApi.void(inv.id);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    toast({
      title: 'Bulk Void Complete',
      description: `Successfully voided ${successCount} of ${sents.length} sent invoices.`,
      variant: 'success'
    });
    setSelectedIds([]);
    invalidate();
    setIsBulkProcessing(false);
  };

  // Filter & Search
  const filtered = useMemo(() => {
    let list = all;
    if (tab !== 'ALL') {
      list = list.filter(i => i.status === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => 
        (i.invoiceRef && i.invoiceRef.toLowerCase().includes(q)) ||
        (i.customer?.username && i.customer.username.toLowerCase().includes(q)) ||
        (i.customer?.azamanId && i.customer.azamanId.toLowerCase().includes(q))
      );
    }
    return list;
  }, [all, tab, search]);

  // Selections
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filtered.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const selectedDraftsCount = all.filter(i => selectedIds.includes(i.id) && i.status === 'DRAFT').length;
  const selectedSentsCount = all.filter(i => selectedIds.includes(i.id) && i.status === 'SENT').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in text-[var(--az-text)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--az-text)]">Invoices</h1>
          <p className="text-sm text-[var(--az-text-muted)] mt-1">Create, send, and track business invoices in real-time.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTaxSectionOpen(prev => !prev)} variant="secondary" className="flex items-center gap-1.5">
            Tax Presets {taxSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[var(--az-info)] hover:opacity-90">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoadingStats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 bg-[var(--az-bg)] border-[var(--az-border)]">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))
        ) : (
          <>
            <Card className="p-4 bg-[var(--az-bg)] border-[var(--az-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--az-text-muted)] font-semibold uppercase tracking-wider">Drafts</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold az-mono text-[var(--az-text-muted)]">{statsData?.draftCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--az-bg)] border-[var(--az-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--az-info)] font-semibold uppercase tracking-wider">Sent</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold az-mono text-[var(--az-info)]">{statsData?.sentCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--az-bg)] border-[var(--az-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--az-success)] font-semibold uppercase tracking-wider">Paid</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold az-mono text-[var(--az-success)]">{statsData?.paidCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--az-bg)] border-[var(--az-border)] flex flex-col justify-between">
              <span className="text-xs text-[var(--az-danger)] font-semibold uppercase tracking-wider">Voided</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold az-mono text-[var(--az-danger)]">{statsData?.voidedCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--az-bg)] border-[var(--az-border)] flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-xs text-[var(--az-accent)] font-semibold uppercase tracking-wider">Total Revenue</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold az-mono text-[var(--az-accent)]">{fmtUSDC(statsData?.totalRevenueUsdc || 0)}</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Tax Presets Collapsible Section */}
      {taxSectionOpen && (
        <Card className="p-4 bg-[var(--az-bg)] border-[var(--az-border)]">
          <TaxPresetsSection />
        </Card>
      )}

      {/* Bulk Operations Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-[#4f8ef71a] border border-[var(--az-info)] rounded-xl animate-fade-in">
          <span className="text-sm font-semibold text-[var(--az-info)]">
            {selectedIds.length} invoice{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            {selectedDraftsCount > 0 && (
              <Button size="sm" onClick={handleBulkSend} loading={isBulkProcessing}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send Selected Drafts ({selectedDraftsCount})
              </Button>
            )}
            {selectedSentsCount > 0 && (
              <Button size="sm" variant="danger" onClick={handleBulkVoid} loading={isBulkProcessing}>
                <Ban className="w-3.5 h-3.5 mr-1" /> Void Selected Sent ({selectedSentsCount})
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setSelectedIds([])}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main List Section */}
      <div className="space-y-4">
        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 border-b border-[var(--az-border)] w-full md:w-auto">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedIds([]); }}
                className={cn(
                  "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-[var(--az-accent)] text-[var(--az-accent)]"
                    : "border-transparent text-[var(--az-text-muted)] hover:text-[var(--az-text)]"
                )}
              >
                {t === 'ALL' ? 'All' : INVOICE_STATUS_META[t]?.label || t}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--az-text-muted)]" />
            <Input
              placeholder="Search by reference, name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[var(--az-bg)] border-[var(--az-border)]"
            />
          </div>
        </div>

        {/* List View */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[var(--az-danger)] flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>Failed to load invoices: {error.message}</p>
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={Receipt}
            title={tab === 'ALL' ? 'No invoices found' : `No ${INVOICE_STATUS_META[tab]?.label.toLowerCase()} invoices found`}
            description="Create your first invoice to bill a customer instantly."
            action={tab === 'ALL' ? <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Invoice</Button> : null}
          />
        ) : (
          <Card className="p-0 overflow-hidden border-[var(--az-border)] bg-[var(--az-bg)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--az-border)] bg-[var(--az-surface)] text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="rounded bg-[var(--az-bg)] border-[var(--az-border)] focus:ring-0"
                      />
                    </th>
                    <th className="py-3 px-4">Ref / Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Bill Total</th>
                    <th className="py-3 px-4">Timestamps</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--az-border)]">
                  {filtered.map(inv => {
                    const isVoided = inv.status === 'VOID' || inv.status === 'VOIDED';
                    const meta = INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.DRAFT;
                    const isSelected = selectedIds.includes(inv.id);

                    return (
                      <tr
                        key={inv.id}
                        className={cn(
                          "hover:bg-[var(--az-surface)] transition-colors text-sm",
                          isVoided && "opacity-65 line-through decoration-[var(--az-danger)] decoration-1"
                        )}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectOne(inv.id, e.target.checked)}
                            className="rounded bg-[var(--az-bg)] border-[var(--az-border)] focus:ring-0"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[var(--az-text)] az-mono">{inv.invoiceRef}</div>
                          <div className="text-xs text-[var(--az-text-muted)] mt-0.5">
                            {inv.customer?.username || 'Unknown Customer'} ({inv.customer?.azamanId})
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-bold az-mono">
                          {fmtUSDC(inv.billTotalUsdc)}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--az-text-muted)]">
                          <div>Created: {formatDateTime(inv.createdAt)}</div>
                          {inv.status === 'PAID' && inv.paidAt && (
                            <div className="text-[var(--az-success)] font-semibold">Paid: {formatDateTime(inv.paidAt)}</div>
                          )}
                          {inv.status === 'SENT' && inv.sentAt && (
                            <div className="text-[var(--az-info)]">Sent: {formatDateTime(inv.sentAt)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setDetailId(inv.id)}>
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => generateInvoicePDF(inv, bizProfile)} title="Download PDF">
                              <Receipt className="w-3.5 h-3.5" />
                            </Button>
                            {inv.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() => sendMut.mutate(inv.id)}
                                loading={sendMut.isPending && sendMut.variables === inv.id}
                              >
                                <Send className="w-3.5 h-3.5" /> Send
                              </Button>
                            )}
                            {(inv.status === 'DRAFT' || inv.status === 'SENT') && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setShowVoidReason(inv.id)}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onCreated={(invoice) => {
            setShowCreate(false);
            invalidate();
            setDetailId(invoice.id);
          }}
        />
      )}

      {/* Detail Modal */}
      {detailId && (
        <InvoiceDetailModal
          invoiceId={detailId}
          onClose={() => setDetailId(null)}
          onSend={(id) => sendMut.mutate(id)}
          onVoid={(id) => setShowVoidReason(id)}
          sending={sendMut.isPending}
        />
      )}

      {/* Void Reason Modal */}
      {showVoidReason && (
        <Modal
          open
          onClose={() => { setShowVoidReason(null); setVoidReason(''); }}
          title="Void Invoice"
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--az-text-muted)]">
              Are you sure you want to void this invoice? Enter a cancellation reason below. This action cannot be undone.
            </p>
            <Textarea
              placeholder="Reason for cancellation..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              className="bg-[var(--az-bg)] border-[var(--az-border)]"
            />
            <div className="flex gap-3 justify-end pt-2 border-t border-[var(--az-border)]">
              <Button variant="secondary" onClick={() => { setShowVoidReason(null); setVoidReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!voidReason.trim()}
                loading={voidMut.isPending}
                onClick={() => voidMut.mutate({ id: showVoidReason, reason: voidReason.trim() })}
              >
                Confirm Void
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Customer Lookup
function CustomerLookup({ customer, onSelect, onClear }) {
  const [azamanId, setAzamanId] = useState('');
  const { toast } = useToast();

  const lookupMut = useMutation({
    mutationFn: (id) => invoicesApi.lookupCustomer(id),
    onSuccess: (res) => onSelect(res.customer),
    onError: () => toast({ title: 'Lookup Failed', description: 'No user found with that AZM ID.', variant: 'destructive' }),
  });

  const submit = () => {
    const id = azamanId.trim();
    if (!id.toUpperCase().startsWith('AZM-')) {
      toast({ title: 'Invalid ID format', description: 'Enter a valid AZM ID (e.g. AZM-00123456).', variant: 'destructive' });
      return;
    }
    lookupMut.mutate(id);
  };

  if (customer) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--az-surface)] border border-[#00d97e30]">
        {customer.profilePictureUrl ? (
          <img src={customer.profilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--az-info)] border border-[#4f8ef730] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[var(--az-info)]">{initials(customer.username)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--az-text)] truncate">{customer.username}</p>
          <p className="text-xs text-[var(--az-text-muted)] az-mono truncate">{customer.azamanId}</p>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-[var(--az-border)] text-[var(--az-text-muted)] hover:text-[var(--az-text)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Input
          placeholder="Customer AZM ID, e.g. AZM-00123456"
          value={azamanId}
          onChange={e => setAzamanId(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          className="bg-[var(--az-bg)] border-[var(--az-border)]"
        />
      </div>
      <Button onClick={submit} loading={lookupMut.isPending} className="flex-shrink-0">
        <Search className="w-4 h-4" /> Find
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Create Invoice Modal
const BLANK_LINE = { description: '', quantity: '1', unitPrice: '' };
const BLANK_TAX  = { name: '', type: 'PERCENTAGE', value: '' };

function CreateInvoiceModal({ onClose, onCreated }) {
  const { toast } = useToast();
  const [customer, setCustomer] = useState(null);
  const [lineItems, setLineItems] = useState([{ ...BLANK_LINE }]);
  const [taxLines, setTaxLines] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [tableId, setTableId] = useState('');
  const [businessNote, setBusinessNote] = useState('');

  const { data: locsData } = useQuery({
    queryKey: ['biz-locations'],
    queryFn: () => locApi.list(),
  });
  const activeLocs = (locsData?.locations || []).filter(l => l.isActive);
  const selectedLoc = activeLocs.find(l => l.id === locationId);
  const tablesForLoc = selectedLoc?.tables || [];

  const { data: presets = [] } = useQuery({
    queryKey: ['tax-presets'],
    queryFn: () => bookingOpsApi.taxPresets(),
  });

  const createMut = useMutation({
    mutationFn: (payload) => invoicesApi.create(payload),
    onSuccess: (res) => {
      toast({ title: 'Invoice Created', description: 'Draft saved successfully.', variant: 'success' });
      onCreated(res.invoice);
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const sendMut = useMutation({
    mutationFn: (id) => invoicesApi.send(id),
    onSuccess: (res) => {
      toast({ title: 'Invoice Sent', description: 'Invoice successfully drafted and sent to customer.', variant: 'success' });
      onCreated(res.invoice);
    },
    onError: (e) => toast({ title: 'Error Sending', description: e.message, variant: 'destructive' }),
  });

  // Line item helpers
  const setLine = (i, key, val) => setLineItems(rows => rows.map((r, j) => j === i ? { ...r, [key]: val } : r));
  const addLine = () => setLineItems(rows => [...rows, { ...BLANK_LINE }]);
  const removeLine = (i) => setLineItems(rows => rows.length > 1 ? rows.filter((_, j) => j !== i) : rows);

  // Tax helpers
  const setTax = (i, key, val) => setTaxLines(rows => rows.map((r, j) => j === i ? { ...r, [key]: val } : r));
  const addTax = () => setTaxLines(rows => [...rows, { ...BLANK_TAX }]);
  const removeTax = (i) => setTaxLines(rows => rows.filter((_, j) => j !== i));

  // Add tax preset
  const addTaxPreset = (presetId) => {
    const selected = presets.find(p => p.id === presetId);
    if (!selected) return;
    setTaxLines(rows => [...rows, { name: selected.name, type: selected.type, value: selected.value.toString() }]);
  };

  // Live computations
  const lineTotals = lineItems.map(it => {
    const qty = Math.max(1, parseInt(it.quantity, 10) || 0);
    const unit = parseFloat(it.unitPrice) || 0;
    return qty * unit;
  });
  const subtotal = lineTotals.reduce((s, n) => s + n, 0);
  const taxComputed = taxLines.map(t => {
    const v = parseFloat(t.value) || 0;
    return t.type === 'PERCENTAGE' ? subtotal * (v / 100) : v;
  });
  const taxTotal = taxComputed.reduce((s, n) => s + n, 0);
  const billTotal = subtotal + taxTotal;

  const preparePayload = () => {
    if (!customer) {
      toast({ title: 'Required', description: 'Find a customer first.', variant: 'destructive' });
      return null;
    }
    const cleanLines = lineItems
      .map(it => ({
        description: it.description.trim(),
        quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
        unitPrice: parseFloat(it.unitPrice)
      }))
      .filter(it => it.description && !isNaN(it.unitPrice) && it.unitPrice >= 0);
    if (cleanLines.length === 0) {
      toast({ title: 'Invalid Line Items', description: 'Add at least one valid line item (description + price).', variant: 'destructive' });
      return null;
    }

    const cleanTaxes = [];
    for (const t of taxLines) {
      const name = t.name.trim();
      const value = parseFloat(t.value);
      if (!name && isNaN(value)) continue; // skip fully-empty rows
      if (!name) {
        toast({ title: 'Invalid Tax', description: 'Every tax line needs a name.', variant: 'destructive' });
        return null;
      }
      if (isNaN(value) || value < 0) {
        toast({ title: 'Invalid Tax', description: `Invalid value for tax "${name}".`, variant: 'destructive' });
        return null;
      }
      cleanTaxes.push({ name, type: t.type === 'FLAT' ? 'FLAT' : 'PERCENTAGE', value });
    }

    return {
      customerId: customer.id,
      locationId: locationId || undefined,
      tableId: tableId || undefined,
      lineItems: cleanLines,
      taxLines: cleanTaxes,
      businessNote: businessNote.trim() || undefined,
    };
  };

  const handleCreate = () => {
    const payload = preparePayload();
    if (payload) createMut.mutate(payload);
  };

  const handleSend = async () => {
    const payload = preparePayload();
    if (!payload) return;
    try {
      const res = await invoicesApi.create(payload);
      sendMut.mutate(res.invoice.id);
    } catch (err) {
      toast({ title: 'Error Creating', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Modal open onClose={onClose} title="New Invoice" className="max-w-2xl text-[var(--az-text)]">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Step 1 — customer */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wide">Customer Lookup</p>
          <CustomerLookup customer={customer} onSelect={setCustomer} onClear={() => setCustomer(null)} />
        </div>

        {/* Step 2 — line items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wide">Line Items</p>
          <div className="space-y-2">
            {lineItems.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    type="text" maxLength={200} placeholder="Description"
                    value={it.description} onChange={e => setLine(i, 'description', e.target.value)}
                    className="w-full bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg px-3 py-2 text-sm text-[var(--az-text)] placeholder:text-[var(--az-text-muted)] outline-none focus:border-[var(--az-accent)]"
                  />
                </div>
                <input
                  type="number" min="1" step="1" placeholder="Qty"
                  value={it.quantity} onChange={e => setLine(i, 'quantity', e.target.value)}
                  className="w-16 bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg px-2 py-2 text-sm text-[var(--az-text)] text-center outline-none focus:border-[var(--az-accent)]"
                />
                <input
                  type="number" min="0" step="0.01" placeholder="Price"
                  value={it.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)}
                  className="w-24 bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg px-2 py-2 text-sm text-[var(--az-text)] text-right outline-none focus:border-[var(--az-accent)]"
                />
                <div className="w-24 text-right text-sm font-semibold text-[var(--az-text)] az-mono py-2">{fmtUSDC(lineTotals[i])}</div>
                <button
                  onClick={() => removeLine(i)} disabled={lineItems.length === 1}
                  className="p-2 rounded-lg text-[var(--az-text-muted)] hover:text-[var(--az-danger)] disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--az-accent)] hover:opacity-80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            <span className="text-xs text-[var(--az-text-muted)]">Subtotal: <span className="font-bold text-[var(--az-text)] az-mono">{fmtUSDC(subtotal)}</span></span>
          </div>
        </div>

        {/* Tax lines */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wide">Taxes &amp; Charges</p>
            {presets.length > 0 && (
              <select
                onChange={e => { addTaxPreset(e.target.value); e.target.value = ''; }}
                className="bg-[var(--az-surface)] border border-[var(--az-border)] rounded-lg px-2 py-1 text-xs text-[var(--az-text-muted)] outline-none cursor-pointer"
              >
                <option value="">Apply Tax Preset...</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type === 'PERCENTAGE' ? `${p.value}%` : fmtUSDC(p.value)})
                  </option>
                ))}
              </select>
            )}
          </div>
          {taxLines.map((t, i) => (
            <div key={i} className="flex items-end gap-2">
              <input
                type="text" maxLength={100} placeholder="e.g. VAT"
                value={t.name} onChange={e => setTax(i, 'name', e.target.value)}
                className="flex-1 bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg px-3 py-2 text-sm text-[var(--az-text)] placeholder:text-[var(--az-text-muted)] outline-none focus:border-[var(--az-accent)]"
              />
              <select
                value={t.type} onChange={e => setTax(i, 'type', e.target.value)}
                className="bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg px-2 py-2 text-sm text-[var(--az-text)] outline-none focus:border-[var(--az-accent)] cursor-pointer"
              >
                <option value="PERCENTAGE">%</option>
                <option value="FLAT">Flat</option>
              </select>
              <input
                type="number" min="0" step="0.01" placeholder="Value"
                value={t.value} onChange={e => setTax(i, 'value', e.target.value)}
                className="w-24 bg-[var(--az-bg)] border border-[var(--az-border)] rounded-lg px-2 py-2 text-sm text-[var(--az-text)] text-right outline-none focus:border-[var(--az-accent)]"
              />
              <div className="w-24 text-right text-sm font-semibold text-[var(--az-text)] az-mono py-2">{fmtUSDC(taxComputed[i])}</div>
              <button onClick={() => removeTax(i)} className="p-2 rounded-lg text-[var(--az-text-muted)] hover:text-[var(--az-danger)] transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button onClick={addTax} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--az-accent)] hover:opacity-80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Manual Tax
            </button>
            {taxTotal > 0 && <span className="text-xs text-[var(--az-text-muted)]">Tax total: <span className="font-bold text-[var(--az-text)] az-mono">{fmtUSDC(taxTotal)}</span></span>}
          </div>
        </div>

        {/* Step 3 — location / table */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Location (optional)"
            value={locationId}
            onChange={e => { setLocationId(e.target.value); setTableId(''); }}
            options={[{ value: '', label: 'No location' }, ...activeLocs.map(l => ({ value: l.id, label: l.label }))]}
          />
          <Select
            label="Table (optional)"
            value={tableId}
            onChange={e => setTableId(e.target.value)}
            disabled={!selectedLoc || tablesForLoc.length === 0}
            options={[{ value: '', label: tablesForLoc.length ? 'No table' : '—' }, ...tablesForLoc.map(t => ({ value: t.id, label: t.label }))]}
          />
        </div>

        <Textarea
          label="Business Note (optional)"
          placeholder="A note shown to the customer on this invoice..."
          value={businessNote}
          onChange={e => setBusinessNote(e.target.value)}
          className="bg-[var(--az-bg)] border-[var(--az-border)]"
        />

        {/* Live Preview / Totals Summary */}
        <div className="p-4 rounded-xl bg-[var(--az-surface)] border border-[var(--az-border)] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--az-text-muted)]">Subtotal</span>
            <span className="text-[var(--az-text)] az-mono">{fmtUSDC(subtotal)}</span>
          </div>
          {taxLines.map((t, i) => (t.name || t.value) ? (
            <div key={i} className="flex justify-between text-sm animate-fade-in">
              <span className="text-[var(--az-text-muted)]">{t.name || 'Tax'}{t.type === 'PERCENTAGE' && t.value ? ` (${t.value}%)` : ''}</span>
              <span className="text-[var(--az-text)] az-mono">{fmtUSDC(taxComputed[i])}</span>
            </div>
          ) : null)}
          <div className="flex justify-between pt-2 border-t border-[var(--az-border)]">
            <span className="text-sm font-bold text-[var(--az-text)]">Total Preview</span>
            <span className="text-sm font-bold text-[var(--az-info)] az-mono">{fmtUSDC(billTotal)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--az-border)]">
        <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleCreate} loading={createMut.isPending} className="flex-1 bg-[var(--az-surface)] text-[var(--az-text)] border border-[var(--az-border)] hover:bg-[var(--az-border)]">
          Save as Draft
        </Button>
        <Button onClick={handleSend} loading={sendMut.isPending} className="flex-1 bg-[var(--az-info)] text-white hover:opacity-90">
          <Send className="w-4 h-4 mr-1" /> Create &amp; Send
        </Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Invoice Detail Modal
function InvoiceDetailModal({ invoiceId, onClose, onSend, onVoid, sending }) {
  const { bizProfile } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['biz-invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: !!invoiceId,
  });
  const inv = data?.invoice;
  const meta = inv ? (INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.DRAFT) : INVOICE_STATUS_META.DRAFT;

  return (
    <Modal open onClose={onClose} title={inv ? inv.invoiceRef : 'Invoice Details'} className="max-w-2xl text-[var(--az-text)]">
      {isLoading || !inv ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-32" /></div>
      ) : (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge color={meta.color} bg={meta.bg} className="text-sm px-3 py-1">{meta.label}</Badge>
            <div className="text-right text-xs text-[var(--az-text-muted)]">
              {inv.paidAt && <p>Paid {formatDateTime(inv.paidAt)}</p>}
              {inv.sentAt && !inv.paidAt && <p>Sent {formatDateTime(inv.sentAt)}</p>}
              {inv.voidedAt && <p className="text-[var(--az-danger)] font-semibold">Voided {formatDateTime(inv.voidedAt)}</p>}
              {!inv.sentAt && !inv.paidAt && !inv.voidedAt && <p>Created {formatDateTime(inv.createdAt)}</p>}
            </div>
          </div>

          {/* Cancellation Reason if Voided */}
          {inv.voidReason && (
            <div className="p-3 rounded-xl bg-[#ff4a4a1a] border border-[var(--az-danger)]">
              <p className="text-xs font-semibold text-[var(--az-danger)] mb-1 uppercase tracking-wide">Cancellation Reason</p>
              <p className="text-sm text-[var(--az-text)]">{inv.voidReason}</p>
            </div>
          )}

          {/* Customer + location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--az-surface)] border border-[var(--az-border)]">
              <p className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Customer</p>
              <div className="flex items-center gap-2.5">
                {inv.customer?.profilePictureUrl ? (
                  <img src={inv.customer.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--az-info)] border border-[#4f8ef730] flex items-center justify-center">
                    <span className="text-xs font-bold text-[var(--az-info)]">{initials(inv.customer?.username)}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--az-text)] truncate">{inv.customer?.username || 'Customer'}</p>
                  <p className="text-xs text-[var(--az-text-muted)] az-mono">{inv.customer?.azamanId}</p>
                </div>
              </div>
            </div>
            {(inv.location || inv.table) && (
              <div className="p-3 rounded-xl bg-[var(--az-surface)] border border-[var(--az-border)]">
                <p className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</p>
                {inv.location && <p className="text-sm text-[var(--az-text)]">{inv.location.label}</p>}
                {inv.location?.address && <p className="text-xs text-[var(--az-text-muted)] mt-0.5">{inv.location.address}</p>}
                {inv.table && <p className="text-xs text-[var(--az-text-muted)] mt-1">Table: {inv.table.label}</p>}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-[var(--az-border)] overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[var(--az-surface)] text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            <div className="divide-y divide-[var(--az-border)] bg-[var(--az-bg)]">
              {(inv.lineItems || []).map(li => (
                <div key={li.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm">
                  <span className="col-span-6 text-[var(--az-text)] truncate">{li.description}</span>
                  <span className="col-span-2 text-center text-[var(--az-text-muted)] az-mono">{li.quantity}</span>
                  <span className="col-span-2 text-right text-[var(--az-text-muted)] az-mono">{fmtUSDC(li.unitPrice)}</span>
                  <span className="col-span-2 text-right text-[var(--az-text)] az-mono">{fmtUSDC(li.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 bg-[var(--az-surface)] p-4 rounded-xl border border-[var(--az-border)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--az-text-muted)]">Subtotal</span>
              <span className="text-[var(--az-text)] az-mono">{fmtUSDC(inv.subtotalUsdc)}</span>
            </div>
            {(inv.taxLines || []).map(t => (
              <div key={t.id} className="flex justify-between text-sm">
                <span className="text-[var(--az-text-muted)]">{t.name}{t.type === 'PERCENTAGE' ? ` (${fmt(t.value, 0)}%)` : ''}</span>
                <span className="text-[var(--az-text)] az-mono">{fmtUSDC(t.computedAmount)}</span>
              </div>
            ))}
            {inv.status === 'PAID' && Number(inv.tipUsdc) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--az-text-muted)]">Tip</span>
                <span className="text-[var(--az-text)] az-mono">{fmtUSDC(inv.tipUsdc)}</span>
              </div>
            )}
            {inv.status === 'PAID' && Number(inv.feeUsdc) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--az-text-muted)]">Platform fee</span>
                <span className="text-[var(--az-text-muted)] az-mono">{fmtUSDC(inv.feeUsdc)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--az-border)]">
              <span className="text-sm font-bold text-[var(--az-text)]">{inv.status === 'PAID' ? 'Total Paid' : 'Bill Total'}</span>
              <span className="text-sm font-bold text-[var(--az-accent)] az-mono">{fmtUSDC(inv.status === 'PAID' && inv.customerPaidUsdc != null ? inv.customerPaidUsdc : inv.billTotalUsdc)}</span>
            </div>
          </div>

          {/* Notes */}
          {inv.businessNote && (
            <div className="p-3 rounded-xl bg-[var(--az-surface)] border border-[var(--az-border)]">
              <p className="text-xs font-semibold text-[var(--az-text-muted)] mb-1">Your Note</p>
              <p className="text-sm text-[var(--az-text-muted)]">{inv.businessNote}</p>
            </div>
          )}
          {inv.customerNote && (
            <div className="p-3 rounded-xl bg-[var(--az-surface)] border border-[var(--az-border)]">
              <p className="text-xs font-semibold text-[var(--az-text-muted)] mb-1">Customer Note</p>
              <p className="text-sm text-[var(--az-text-muted)]">{inv.customerNote}</p>
            </div>
          )}

          {/* Review */}
          {inv.review && (
            <div className="p-3 rounded-xl bg-[var(--az-warning)] bg-opacity-10 border border-[var(--az-warning)] border-opacity-30">
              <p className="text-xs font-semibold text-[var(--az-warning)] mb-1.5">Customer Review</p>
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className="w-4 h-4" fill={n <= inv.review.rating ? 'var(--az-warning)' : 'none'} style={{ color: n <= inv.review.rating ? 'var(--az-warning)' : 'var(--az-text-muted)' }} />
                ))}
              </div>
              {inv.review.comment && <p className="text-sm text-[var(--az-text-muted)]">{inv.review.comment}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--az-border)]">
        <Button variant="secondary" onClick={() => inv && generateInvoicePDF(inv, bizProfile)} className="flex-1" style={{ background: "var(--az-accent-subtle)", color: "var(--az-accent)" }}>
          <Receipt className="w-4 h-4 mr-1" /> Download PDF
        </Button>
        <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
        {inv?.status === 'DRAFT' && (
          <Button onClick={() => onSend(inv.id)} loading={sending} className="flex-1 bg-[var(--az-info)] hover:opacity-95">
            <Send className="w-4 h-4 mr-1" /> Send Invoice
          </Button>
        )}
        {(inv?.status === 'DRAFT' || inv?.status === 'SENT') && (
          <Button variant="danger" onClick={() => onVoid(inv.id)} className="flex-1">
            <Ban className="w-4 h-4 mr-1" /> Void Invoice
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Tax Presets Section Component
function TaxPresetsSection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingPreset, setEditingPreset] = useState(null); // stores { id, name, type, value, isDefault } or blank for new
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [value, setValue] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['tax-presets'],
    queryFn: () => bookingOpsApi.taxPresets(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tax-presets'] });

  const createMut = useMutation({
    mutationFn: (data) => bookingOpsApi.createTaxPreset(data),
    onSuccess: () => {
      toast({ title: 'Preset Created', description: 'Saved successfully.', variant: 'success' });
      resetForm();
      invalidate();
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => bookingOpsApi.updateTaxPreset(id, data),
    onSuccess: () => {
      toast({ title: 'Preset Updated', description: 'Changes saved.', variant: 'success' });
      resetForm();
      invalidate();
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => bookingOpsApi.deleteTaxPreset(id),
    onSuccess: () => {
      toast({ title: 'Preset Deleted', description: 'Tax preset deleted.', variant: 'success' });
      invalidate();
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setName('');
    setType('PERCENTAGE');
    setValue('');
    setIsDefault(false);
    setEditingPreset(null);
    setShowForm(false);
  };

  const startEdit = (p) => {
    setEditingPreset(p);
    setName(p.name);
    setType(p.type);
    setValue(p.value.toString());
    setIsDefault(!!p.isDefault);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: 'Required', description: 'Name is required.', variant: 'destructive' });
      return;
    }
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Invalid Value', description: 'Enter a valid positive number.', variant: 'destructive' });
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      value: val,
      isDefault
    };

    if (editingPreset) {
      updateMut.mutate({ id: editingPreset.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--az-border)] pb-2">
        <h3 className="text-sm font-bold text-[var(--az-text)] uppercase tracking-wide">Saved Tax Presets</h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Preset
          </Button>
        )}
      </div>

      {showForm && (
        <div className="p-4 bg-[var(--az-surface)] border border-[var(--az-border)] rounded-xl space-y-3 animate-fade-in">
          <p className="text-xs font-semibold text-[var(--az-accent)] uppercase tracking-wide">
            {editingPreset ? 'Edit Tax Preset' : 'New Tax Preset'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="e.g. VAT"
              label="Tax Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-[var(--az-bg)] border-[var(--az-border)]"
            />
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value)}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage (%)' },
                { value: 'FLAT', label: 'Flat Cash (USDC)' }
              ]}
            />
            <Input
              type="number"
              placeholder="0.00"
              label="Value"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="bg-[var(--az-bg)] border-[var(--az-border)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded bg-[var(--az-bg)] border-[var(--az-border)] text-[var(--az-accent)] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="isDefault" className="text-xs text-[var(--az-text-muted)] cursor-pointer select-none">
              Set as default on all new invoices
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>Save Preset</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-20" />
      ) : presets.length === 0 ? (
        <p className="text-xs text-[var(--az-text-muted)] italic">No saved tax presets yet. Create one to apply it easily to new invoices.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {presets.map(p => (
            <div key={p.id} className="p-3 rounded-xl bg-[var(--az-surface)] border border-[var(--az-border)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[var(--az-text)]">{p.name}</span>
                  {p.isDefault && (
                    <span className="text-[10px] bg-[#4f8ef71a] text-[var(--az-info)] px-1.5 py-0.5 rounded-full font-semibold">Default</span>
                  )}
                </div>
                <div className="text-xs text-[var(--az-text-muted)] az-mono mt-0.5">
                  {p.type === 'PERCENTAGE' ? `${p.value}%` : fmtUSDC(p.value)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => startEdit(p)} className="px-2 py-1">
                  Edit
                </Button>
                <button
                  onClick={() => { if (confirm(`Delete preset "${p.name}"?`)) deleteMut.mutate(p.id); }}
                  className="p-1.5 rounded-lg text-[var(--az-text-muted)] hover:text-[var(--az-danger)] hover:bg-[#ff4a4a10] transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
