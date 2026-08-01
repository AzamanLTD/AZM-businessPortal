import { useMemo, useState, useEffect } from 'react';
import { generateInvoicePDF } from '@/lib/invoicePdf';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://azm-backend.onrender.com' : 'http://localhost:3000');

// Server-side PDF download (direct file, no print dialog)
async function downloadServerPdf(invoiceId, invoiceRef) {
  try {
    const token = localStorage.getItem('azaman_token');
    const res = await fetch(`${API_BASE}/api/business-os/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('PDF download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceRef}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Server PDF failed, falling back to print:', err);
    // Fallback to client-side print-to-PDF
    return false;
  }
  return true;
}
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices as invoicesApi, locations as locApi } from '@/lib/api';
import { bookingOpsApi } from '@/lib/marketplaceApi';
import { Card, Badge, Button, Input, Textarea, Select, Empty, Skeleton, Modal, Tabs, Progress } from '@/components/forge';
// Widget replaced by KpiCard/Card
import { fmtUSDC, fmt, formatDateTime, relativeTime, cn } from '@/lib/utils';
import {
  Receipt, Plus, Search, X, Trash2, Eye, Send, Ban, Mail,
  User, MapPin, Star, AlertCircle, Loader2, ChevronDown, ChevronUp, Check, Repeat, RefreshCw, CalendarClock
} from 'lucide-react';
import { toast } from 'sonner';

// ── Invoice status display config ───────────────────────────────────────────
const INVOICE_STATUS_META = {
  DRAFT:  { label: 'Draft',  color: 'var(--f-text-3)', bg: 'var(--f-surface-sunken)' },
  SENT:   { label: 'Sent',   color: 'var(--f-info)', bg: 'var(--f-info)' },
  PAID:   { label: 'Paid',   color: 'var(--f-ok)', bg: 'var(--f-ok)' },
  VOID: { label: 'Void', color: 'var(--f-bad)', bg: 'var(--f-bad)' },
};
const TABS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'VOID', 'RECURRING'];

const initials = (name) => (name || '?').trim().charAt(0).toUpperCase();

// ════════════════════════════════════════════════════════════════════════════
export default function Invoices() {
  const qc = useQueryClient();
  const { bizProfile } = useAuth();
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
  const emailMut = useMutation({
    mutationFn: ({ id, email }) => invoicesApi.email(id, email),
    onSuccess: (data) => toast({ title: 'Invoice Emailed', description: data.message || 'Invoice sent successfully.', variant: 'success' }),
    onError: (e) => toast({ title: 'Error Emailing', description: e.message, variant: 'destructive' }),
  });
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
    if (tab === 'RECURRING') {
      list = list.filter(i => i.isRecurring);
    } else if (tab !== 'ALL') {
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
    <div className="p-6 max-w-6xl mx-auto space-y-6  text-[var(--f-text)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--f-text)]">Invoices</h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">Create, send, and track business invoices in real-time.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTaxSectionOpen(prev => !prev)} variant="secondary" className="flex items-center gap-1.5">
            Tax Presets {taxSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[var(--f-info)]:opacity-90">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoadingStats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 bg-[var(--f-bg)] border-[var(--f-line)]">
              <Skel className="h-4 w-16 mb-2" />
              <Skel className="h-6 w-24" />
            </Card>
          ))
        ) : (
          <>
            <Card className="p-4 bg-[var(--f-bg)] border-[var(--f-line)] flex flex-col justify-between">
              <span className="text-xs text-[var(--f-text-3)] font-semibold uppercase tracking-wider">Drafts</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold f-mono text-[var(--f-text-3)]">{statsData?.draftCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--f-bg)] border-[var(--f-line)] flex flex-col justify-between">
              <span className="text-xs text-[var(--f-info)] font-semibold uppercase tracking-wider">Sent</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold f-mono text-[var(--f-info)]">{statsData?.sentCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--f-bg)] border-[var(--f-line)] flex flex-col justify-between">
              <span className="text-xs text-[var(--f-ok)] font-semibold uppercase tracking-wider">Paid</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold f-mono text-[var(--f-ok)]">{statsData?.paidCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--f-bg)] border-[var(--f-line)] flex flex-col justify-between">
              <span className="text-xs text-[var(--f-bad)] font-semibold uppercase tracking-wider">Voided</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold f-mono text-[var(--f-bad)]">{statsData?.voidedCount || 0}</span>
              </div>
            </Card>
            <Card className="p-4 bg-[var(--f-bg)] border-[var(--f-line)] flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-xs text-[var(--f-tint-color)] font-semibold uppercase tracking-wider">Total Revenue</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold f-mono text-[var(--f-tint-color)]">{fmtUSDC(statsData?.totalRevenueUsdc || 0)}</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Tax Presets Collapsible Section */}
      {taxSectionOpen && (
        <Card className="p-4 bg-[var(--f-bg)] border-[var(--f-line)]">
          <TaxPresetsSection />
        </Card>
      )}

      {/* Bulk Operations Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-[var(--f-info-bg)] border border-[var(--f-info)] rounded-xl ">
          <span className="text-sm font-semibold text-[var(--f-info)]">
            {selectedIds.length} invoice{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            {selectedDraftsCount > 0 && (
              <Button size="sm" onClick={handleBulkSend}>
                <Send className="w-3.5 h-3.5 mr-1" /> Send Selected Drafts ({selectedDraftsCount})
              </Button>
            )}
            {selectedSentsCount > 0 && (
              <Button size="sm" variant="danger" onClick={handleBulkVoid}>
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
          <div className="flex flex-wrap gap-1 border-b border-[var(--f-line)] w-full md:w-auto">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedIds([]); }}
                className={cn(
                  "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-[var(--f-tint-color)] text-[var(--f-tint-color)]"
                    : "border-transparent text-[var(--f-text-3)]:text-[var(--f-text)]"
                )}
              >
                {t === 'ALL' ? 'All' : INVOICE_STATUS_META[t]?.label || t}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--f-text-3)]" />
            <Input
              placeholder="Search by reference, name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[var(--f-bg)] border-[var(--f-line)]"
            />
          </div>
        </div>

        {/* List View */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-16" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[var(--f-bad)] flex flex-col items-center gap-2">
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
          <Card className="p-0 overflow-hidden border-[var(--f-line)] bg-[var(--f-bg)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--f-line)] bg-[var(--f-surface)] text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="rounded bg-[var(--f-bg)] border-[var(--f-line)] focus:ring-0"
                      />
                    </th>
                    <th className="py-3 px-4">Ref / Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Bill Total</th>
                    <th className="py-3 px-4">Timestamps</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--f-line)]">
                  {filtered.map(inv => {
                    const isVoided = inv.status === 'VOID' || inv.status === 'VOIDED';
                    const meta = INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.DRAFT;
                    const isSelected = selectedIds.includes(inv.id);

                    return (
                      <tr
                        key={inv.id}
                        className={cn(
                          "hover:bg-[var(--f-surface)] transition-colors text-sm",
                          isVoided && "opacity-65 line-through decoration-[var(--f-bad)] decoration-1"
                        )}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectOne(inv.id, e.target.checked)}
                            className="rounded bg-[var(--f-bg)] border-[var(--f-line)] focus:ring-0"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[var(--f-text)] f-mono">{inv.invoiceRef}</div>
                          <div className="text-xs text-[var(--f-text-3)] mt-0.5">
                            {inv.customer?.username || 'Unknown Customer'} ({inv.customer?.azamanId})
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Tag color={meta.color} bg={meta.bg}>{meta.label}</Tag>
                        </td>
                        <td className="py-3 px-4 text-right font-bold f-mono">
                          {fmtUSDC(inv.billTotalUsdc)}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--f-text-3)]">
                          <div>Created: {formatDateTime(inv.createdAt)}</div>
                          {inv.status === 'PAID' && inv.paidAt && (
                            <div className="text-[var(--f-ok)] font-semibold">Paid: {formatDateTime(inv.paidAt)}</div>
                          )}
                          {inv.status === 'SENT' && inv.sentAt && (
                            <div className="text-[var(--f-info)]">Sent: {formatDateTime(inv.sentAt)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setDetailId(inv.id)}>
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>
                            <Button variant="secondary" size="sm" onClick={async () => {
                              const ok = await downloadServerPdf(inv.id, inv.invoiceRef);
                              if (!ok) generateInvoicePDF(inv, bizProfile);
                            }} title="Download PDF">
                              <Receipt className="w-3.5 h-3.5" />
                            </Button>
                            {inv.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() => sendMut.mutate(inv.id)}
                              >
                                <Send className="w-3.5 h-3.5" /> Send
                              </Button>
                            )}
                            {(inv.status === 'SENT' || inv.status === 'DRAFT') && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const email = prompt('Email address (leave blank to use customer\'s email):');
                                  if (email === null) return;
                                  emailMut.mutate({ id: inv.id, email: email || undefined });
                                }}
                                title="Email invoice"
                              >
                                <Mail className="w-3.5 h-3.5" />
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
      {tab === 'RECURRING' && <RecurringPanel />}
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
            <p className="text-sm text-[var(--f-text-3)]">
              Are you sure you want to void this invoice? Enter a cancellation reason below. This action cannot be undone.
            </p>
            <Textarea
              placeholder="Reason for cancellation..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              className="bg-[var(--f-bg)] border-[var(--f-line)]"
            />
            <div className="flex gap-3 justify-end pt-2 border-t border-[var(--f-line)]">
              <Button variant="secondary" onClick={() => { setShowVoidReason(null); setVoidReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!voidReason.trim()}
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
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-ok)]">
        {customer.profilePictureUrl ? (
          <img src={customer.profilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--f-info)] border border-[var(--f-info)] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[var(--f-info)]">{initials(customer.username)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--f-text)] truncate">{customer.username}</p>
          <p className="text-xs text-[var(--f-text-3)] f-mono truncate">{customer.azamanId}</p>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-lg:bg-[var(--f-line)] text-[var(--f-text-3)]:text-[var(--f-text)] transition-colors">
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
          className="bg-[var(--f-bg)] border-[var(--f-line)]"
        />
      </div>
      <Button onClick={submit} className="flex-shrink-0">
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
    <Modal open onClose={onClose} title="New Invoice" className="max-w-2xl text-[var(--f-text)]">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Step 1 — customer */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">Customer Lookup</p>
          <CustomerLookup customer={customer} onSelect={setCustomer} onClear={() => setCustomer(null)} />
        </div>

        {/* Step 2 — line items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">Line Items</p>
          <div className="space-y-2">
            {lineItems.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    type="text" maxLength={200} placeholder="Description"
                    value={it.description} onChange={e => setLine(i, 'description', e.target.value)}
                    className="w-full bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg px-3 py-2 text-sm text-[var(--f-text)] placeholder:text-[var(--f-text-3)] outline-none focus:border-[var(--f-tint-color)]"
                  />
                </div>
                <input
                  type="number" min="1" step="1" placeholder="Qty"
                  value={it.quantity} onChange={e => setLine(i, 'quantity', e.target.value)}
                  className="w-16 bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg px-2 py-2 text-sm text-[var(--f-text)] text-center outline-none focus:border-[var(--f-tint-color)]"
                />
                <input
                  type="number" min="0" step="0.01" placeholder="Price"
                  value={it.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)}
                  className="w-24 bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg px-2 py-2 text-sm text-[var(--f-text)] text-right outline-none focus:border-[var(--f-tint-color)]"
                />
                <div className="w-24 text-right text-sm font-semibold text-[var(--f-text)] f-mono py-2">{fmtUSDC(lineTotals[i])}</div>
                <button
                  onClick={() => removeLine(i)} disabled={lineItems.length === 1}
                  className="p-2 rounded-lg text-[var(--f-text-3)]:text-[var(--f-bad)] disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={addLine} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--f-tint-color)]:opacity-80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            <span className="text-xs text-[var(--f-text-3)]">Subtotal: <span className="font-bold text-[var(--f-text)] f-mono">{fmtUSDC(subtotal)}</span></span>
          </div>
        </div>

        {/* Tax lines */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wide">Taxes &amp; Charges</p>
            {presets.length > 0 && (
              <select
                onChange={e => { addTaxPreset(e.target.value); e.target.value = ''; }}
                className="bg-[var(--f-surface)] border border-[var(--f-line)] rounded-lg px-2 py-1 text-xs text-[var(--f-text-3)] outline-none cursor-pointer"
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
                className="flex-1 bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg px-3 py-2 text-sm text-[var(--f-text)] placeholder:text-[var(--f-text-3)] outline-none focus:border-[var(--f-tint-color)]"
              />
              <select
                value={t.type} onChange={e => setTax(i, 'type', e.target.value)}
                className="bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg px-2 py-2 text-sm text-[var(--f-text)] outline-none focus:border-[var(--f-tint-color)] cursor-pointer"
              >
                <option value="PERCENTAGE">%</option>
                <option value="FLAT">Flat</option>
              </select>
              <input
                type="number" min="0" step="0.01" placeholder="Value"
                value={t.value} onChange={e => setTax(i, 'value', e.target.value)}
                className="w-24 bg-[var(--f-bg)] border border-[var(--f-line)] rounded-lg px-2 py-2 text-sm text-[var(--f-text)] text-right outline-none focus:border-[var(--f-tint-color)]"
              />
              <div className="w-24 text-right text-sm font-semibold text-[var(--f-text)] f-mono py-2">{fmtUSDC(taxComputed[i])}</div>
              <button onClick={() => removeTax(i)} className="p-2 rounded-lg text-[var(--f-text-3)]:text-[var(--f-bad)] transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button onClick={addTax} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--f-tint-color)]:opacity-80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Manual Tax
            </button>
            {taxTotal > 0 && <span className="text-xs text-[var(--f-text-3)]">Tax total: <span className="font-bold text-[var(--f-text)] f-mono">{fmtUSDC(taxTotal)}</span></span>}
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
          className="bg-[var(--f-bg)] border-[var(--f-line)]"
        />

        {/* Live Preview / Totals Summary */}
        <div className="p-4 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--f-text-3)]">Subtotal</span>
            <span className="text-[var(--f-text)] f-mono">{fmtUSDC(subtotal)}</span>
          </div>
          {taxLines.map((t, i) => (t.name || t.value) ? (
            <div key={i} className="flex justify-between text-sm ">
              <span className="text-[var(--f-text-3)]">{t.name || 'Tax'}{t.type === 'PERCENTAGE' && t.value ? ` (${t.value}%)` : ''}</span>
              <span className="text-[var(--f-text)] f-mono">{fmtUSDC(taxComputed[i])}</span>
            </div>
          ) : null)}
          <div className="flex justify-between pt-2 border-t border-[var(--f-line)]">
            <span className="text-sm font-bold text-[var(--f-text)]">Total Preview</span>
            <span className="text-sm font-bold text-[var(--f-info)] f-mono">{fmtUSDC(billTotal)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--f-line)]">
        <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleCreate} className="flex-1 bg-[var(--f-surface)] text-[var(--f-text)] border border-[var(--f-line)]:bg-[var(--f-line)]">
          Save as Draft
        </Button>
        <Button onClick={handleSend} className="flex-1 bg-[var(--f-info)] text-[var(--f-text)]:opacity-90">
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
    <Modal open onClose={onClose} title={inv ? inv.invoiceRef : 'Invoice Details'} className="max-w-2xl text-[var(--f-text)]">
      {isLoading || !inv ? (
        <div className="space-y-3"><Skel className="h-24" /><Skel className="h-32" /></div>
      ) : (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Tag color={meta.color} bg={meta.bg} className="text-sm px-3 py-1">{meta.label}</Tag>
            <div className="text-right text-xs text-[var(--f-text-3)]">
              {inv.paidAt && <p>Paid {formatDateTime(inv.paidAt)}</p>}
              {inv.sentAt && !inv.paidAt && <p>Sent {formatDateTime(inv.sentAt)}</p>}
              {inv.voidedAt && <p className="text-[var(--f-bad)] font-semibold">Voided {formatDateTime(inv.voidedAt)}</p>}
              {!inv.sentAt && !inv.paidAt && !inv.voidedAt && <p>Created {formatDateTime(inv.createdAt)}</p>}
            </div>
          </div>

          {/* Cancellation Reason if Voided */}
          {inv.voidReason && (
            <div className="p-3 rounded-xl bg-[var(--f-bad-bg)] border border-[var(--f-bad)]">
              <p className="text-xs font-semibold text-[var(--f-bad)] mb-1 uppercase tracking-wide">Cancellation Reason</p>
              <p className="text-sm text-[var(--f-text)]">{inv.voidReason}</p>
            </div>
          )}

          {/* Customer + location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
              <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Customer</p>
              <div className="flex items-center gap-2.5">
                {inv.customer?.profilePictureUrl ? (
                  <img src={inv.customer.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--f-info)] border border-[var(--f-info)] flex items-center justify-center">
                    <span className="text-xs font-bold text-[var(--f-info)]">{initials(inv.customer?.username)}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--f-text)] truncate">{inv.customer?.username || 'Customer'}</p>
                  <p className="text-xs text-[var(--f-text-3)] f-mono">{inv.customer?.azamanId}</p>
                </div>
              </div>
            </div>
            {(inv.location || inv.table) && (
              <div className="p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
                <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</p>
                {inv.location && <p className="text-sm text-[var(--f-text)]">{inv.location.label}</p>}
                {inv.location?.address && <p className="text-xs text-[var(--f-text-3)] mt-0.5">{inv.location.address}</p>}
                {inv.table && <p className="text-xs text-[var(--f-text-3)] mt-1">Table: {inv.table.label}</p>}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-[var(--f-line)] overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[var(--f-surface)] text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            <div className="divide-y divide-[var(--f-line)] bg-[var(--f-bg)]">
              {(inv.lineItems || []).map(li => (
                <div key={li.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm">
                  <span className="col-span-6 text-[var(--f-text)] truncate">{li.description}</span>
                  <span className="col-span-2 text-center text-[var(--f-text-3)] f-mono">{li.quantity}</span>
                  <span className="col-span-2 text-right text-[var(--f-text-3)] f-mono">{fmtUSDC(li.unitPrice)}</span>
                  <span className="col-span-2 text-right text-[var(--f-text)] f-mono">{fmtUSDC(li.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 bg-[var(--f-surface)] p-4 rounded-xl border border-[var(--f-line)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--f-text-3)]">Subtotal</span>
              <span className="text-[var(--f-text)] f-mono">{fmtUSDC(inv.subtotalUsdc)}</span>
            </div>
            {(inv.taxLines || []).map(t => (
              <div key={t.id} className="flex justify-between text-sm">
                <span className="text-[var(--f-text-3)]">{t.name}{t.type === 'PERCENTAGE' ? ` (${fmt(t.value, 0)}%)` : ''}</span>
                <span className="text-[var(--f-text)] f-mono">{fmtUSDC(t.computedAmount)}</span>
              </div>
            ))}
            {inv.status === 'PAID' && Number(inv.tipUsdc) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--f-text-3)]">Tip</span>
                <span className="text-[var(--f-text)] f-mono">{fmtUSDC(inv.tipUsdc)}</span>
              </div>
            )}
            {inv.status === 'PAID' && Number(inv.feeUsdc) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--f-text-3)]">Platform fee</span>
                <span className="text-[var(--f-text-3)] f-mono">{fmtUSDC(inv.feeUsdc)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--f-line)]">
              <span className="text-sm font-bold text-[var(--f-text)]">{inv.status === 'PAID' ? 'Total Paid' : 'Bill Total'}</span>
              <span className="text-sm font-bold text-[var(--f-tint-color)] f-mono">{fmtUSDC(inv.status === 'PAID' && inv.customerPaidUsdc != null ? inv.customerPaidUsdc : inv.billTotalUsdc)}</span>
            </div>
          </div>

          {/* Notes */}
          {inv.businessNote && (
            <div className="p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
              <p className="text-xs font-semibold text-[var(--f-text-3)] mb-1">Your Note</p>
              <p className="text-sm text-[var(--f-text-3)]">{inv.businessNote}</p>
            </div>
          )}
          {inv.customerNote && (
            <div className="p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)]">
              <p className="text-xs font-semibold text-[var(--f-text-3)] mb-1">Customer Note</p>
              <p className="text-sm text-[var(--f-text-3)]">{inv.customerNote}</p>
            </div>
          )}

          {/* Review */}
          {inv.review && (
            <div className="p-3 rounded-xl bg-[var(--f-warn)] bg-opacity-10 border border-[var(--f-warn)] border-opacity-30">
              <p className="text-xs font-semibold text-[var(--f-warn)] mb-1.5">Customer Review</p>
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className="w-4 h-4" fill={n <= inv.review.rating ? 'var(--f-warn)' : 'none'} style={{ color: n <= inv.review.rating ? 'var(--f-warn)' : 'var(--f-text-3)' }} />
                ))}
              </div>
              {inv.review.comment && <p className="text-sm text-[var(--f-text-3)]">{inv.review.comment}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--f-line)]">
        <Button variant="secondary" onClick={async () => {
          if (!inv) return;
          const ok = await downloadServerPdf(inv.id, inv.invoiceRef);
          if (!ok) generateInvoicePDF(inv, bizProfile);
        }} className="flex-1" style={{ background: "var(--f-surface-sunken)", color: "var(--f-tint-color)" }}>
          <Receipt className="w-4 h-4 mr-1" /> Download PDF
        </Button>
        <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
        {inv?.status === 'DRAFT' && (
          <Button onClick={() => onSend(inv.id)} className="flex-1 bg-[var(--f-info)]:opacity-95">
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
      <div className="flex items-center justify-between border-b border-[var(--f-line)] pb-2">
        <h3 className="text-sm font-bold text-[var(--f-text)] uppercase tracking-wide">Saved Tax Presets</h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Preset
          </Button>
        )}
      </div>

      {showForm && (
        <div className="p-4 bg-[var(--f-surface)] border border-[var(--f-line)] rounded-xl space-y-3 ">
          <p className="text-xs font-semibold text-[var(--f-tint-color)] uppercase tracking-wide">
            {editingPreset ? 'Edit Tax Preset' : 'New Tax Preset'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="e.g. VAT"
              label="Tax Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-[var(--f-bg)] border-[var(--f-line)]"
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
              className="bg-[var(--f-bg)] border-[var(--f-line)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded bg-[var(--f-bg)] border-[var(--f-line)] text-[var(--f-tint-color)] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="isDefault" className="text-xs text-[var(--f-text-3)] cursor-pointer select-none">
              Set as default on all new invoices
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save Preset</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skel className="h-20" />
      ) : presets.length === 0 ? (
        <p className="text-xs text-[var(--f-text-3)] italic">No saved tax presets yet. Create one to apply it easily to new invoices.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {presets.map(p => (
            <div key={p.id} className="p-3 rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[var(--f-text)]">{p.name}</span>
                  {p.isDefault && (
                    <span className="text-[10px] bg-[var(--f-info-bg)] text-[var(--f-info)] px-1.5 py-0.5 rounded-full font-semibold">Default</span>
                  )}
                </div>
                <div className="text-xs text-[var(--f-text-3)] f-mono mt-0.5">
                  {p.type === 'PERCENTAGE' ? `${p.value}%` : fmtUSDC(p.value)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => startEdit(p)} className="px-2 py-1">
                  Edit
                </Button>
                <button
                  onClick={() => { if (confirm(`Delete preset "${p.name}"?`)) deleteMut.mutate(p.id); }}
                  className="p-1.5 rounded-lg text-[var(--f-text-3)]:text-[var(--f-bad)]:bg-[var(--f-bad-bg)] transition-all"
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


// ════════════════════════════════════════════════════════════════════════════
// Recurring Invoice Panel (Phase 3)
function RecurringPanel() {
  const qc = useQueryClient();
  
  const { data: recurringData, isLoading } = useQuery({
    queryKey: ['recurring-invoices'],
    queryFn: () => bookingOpsApi.listRecurring(),
  });

  const enableMut = useMutation({
    mutationFn: ({ invoiceId, interval }) => bookingOpsApi.enableRecurring(invoiceId, interval),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring-invoices'] }); qc.invalidateQueries({ queryKey: ['biz-invoices'] }); toast.success('Recurring invoice enabled'); },
    onError: (e) => toast.error(e.message || 'Failed to enable recurring'),
  });

  const disableMut = useMutation({
    mutationFn: (invoiceId) => bookingOpsApi.disableRecurring(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring-invoices'] }); qc.invalidateQueries({ queryKey: ['biz-invoices'] }); toast.success('Recurring disabled'); },
    onError: (e) => toast.error(e.message || 'Failed to disable recurring'),
  });

  const processMut = useMutation({
    mutationFn: () => bookingOpsApi.processRecurring(),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['biz-invoices'] }); toast.success(data.generated ? `Generated ${data.generated} new invoice(s)` : 'No recurring invoices due'); },
    onError: (e) => toast.error(e.message || 'Failed to process recurring'),
  });

  const recurring = recurringData?.invoices || [];

  const INTERVAL_LABELS = {
    DAILY: 'Every day',
    WEEKLY: 'Every week',
    MONTHLY: 'Every month',
    QUARTERLY: 'Every quarter',
    YEARLY: 'Every year',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-[var(--f-tint-color)]" />
          <h2 className="text-sm font-semibold text-[var(--f-text)]">Recurring Invoice Templates</h2>
          <span className="text-xs text-[var(--f-text-3)]">({recurring.length})</span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => processMut.mutate()} disabled={processMut.isPending}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${processMut.isPending ? 'animate-spin' : ''}`} />
          Process Due
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-20" />)}</div>
      ) : recurring.length === 0 ? (
        <Empty
          icon={Repeat}
          title="No recurring invoices"
          description="Enable recurring on any paid/sent invoice to auto-generate copies on a schedule."
        />
      ) : (
        <div className="space-y-2">
          {recurring.map(inv => (
            <Card key={inv.id} className="p-4 border-[var(--f-line)] bg-[var(--f-bg)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[var(--f-tint-color)]/15 flex items-center justify-center flex-shrink-0">
                    <Repeat className="w-5 h-5 text-[var(--f-tint-color)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--f-text)] truncate">{inv.invoiceRef}</p>
                    <p className="text-xs text-[var(--f-text-3)] truncate">
                      {inv.customer?.full_name || inv.customer?.email || `User #${inv.customerId}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Tag variant="info">{INTERVAL_LABELS[inv.recurringInterval] || inv.recurringInterval}</Tag>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--f-text)]">{fmtUSDC(inv.billTotalUsdc)}</p>
                    {inv.recurringNextDate && (
                      <p className="text-xs text-[var(--f-text-3)] flex items-center gap-1 justify-end">
                        <CalendarClock className="w-3 h-3" />
                        {new Date(inv.recurringNextDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => disableMut.mutate(inv.id)}
                    disabled={disableMut.isPending}
                  >
                    Disable
                  </Button>
                </div>
              </div>
              {inv.lineItems?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--f-line)]">
                  <div className="text-xs text-[var(--f-text-3)] space-y-1">
                    {inv.lineItems.slice(0, 3).map(li => (
                      <div key={li.id} className="flex justify-between">
                        <span>{li.description} ×{li.quantity}</span>
                        <span>{fmtUSDC(li.lineTotal)}</span>
                      </div>
                    ))}
                    {inv.lineItems.length > 3 && <span className="text-[var(--f-text-3)]">+ {inv.lineItems.length - 3} more items</span>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-xl bg-[var(--f-surface)] border border-[var(--f-line)] p-4">
        <div className="flex items-start gap-3">
          <CalendarClock className="w-4 h-4 text-[var(--f-text-3)] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[var(--f-text-3)] space-y-1">
            <p><strong className="text-[var(--f-text)]">How it works:</strong> Enable recurring on any SENT or PAID invoice. On the next scheduled date, a clone is created in DRAFT status with the same line items and tax lines.</p>
            <p>Click <strong className="text-[var(--f-text)]">Process Due</strong> to manually generate any overdue recurring invoices. This also runs automatically via cron.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
