import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../lib/marketplaceApi';
import { products as productsApi, locations as locationsApi, request } from '../lib/api';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../lib/AuthContext';
import { Card, Tag, Button, Input, Select, Empty, Skel, Dialog } from '@/components/instrument';
import { AlertCircle, Clock, MapPin, Plus, Receipt, Send, Utensils, Users, UserCheck, Search } from 'lucide-react';
import { toast } from '@/lib/toast';

const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

export default function DineInV2() {
  const queryClient = useQueryClient();
  const { bizProfile } = useAuth();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('dinein.manage');
  const canView = hasPermission('dinein.view') || canManage;
  const businessId = bizProfile?.id;

  const [selectedTabId, setSelectedTabId] = useState(null);
  const [selectedTabLocationId, setSelectedTabLocationId] = useState('');
  const [isNewTabOpen, setIsNewTabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [newTabCustomer, setNewTabCustomer] = useState(null);
  const [newTabLocationId, setNewTabLocationId] = useState('');
  const [newTabTableId, setNewTabTableId] = useState('');
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);
  const [tipUsdc, setTipUsdc] = useState('0');
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [activeItemConfig, setActiveItemConfig] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState('even');
  const [itemAssignments, setItemAssignments] = useState({});

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['dineInLocations'],
    queryFn: async () => {
      const response = await locationsApi.list();
      return response?.locations || response?.data || response || [];
    },
    enabled: canManage,
  });
  const locations = Array.isArray(locationsData) ? locationsData : [];

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['dineInTables', newTabLocationId],
    queryFn: () => locationsApi.listTables(newTabLocationId),
    enabled: canManage && !!newTabLocationId,
  });
  const tables = Array.isArray(tablesData?.tables) ? tablesData.tables : Array.isArray(tablesData?.data) ? tablesData.data : Array.isArray(tablesData) ? tablesData : [];

  const { data: openTabs, isLoading: tabsLoading } = useQuery({
    queryKey: ['openTabs'],
    queryFn: async () => {
      const response = await marketplaceApi.getOpenTabs();
      return response?.data || response || [];
    },
    enabled: canView,
  });

  const selectedTabSummary = useMemo(
    () => (openTabs || []).find((tab) => tab.id === selectedTabId),
    [openTabs, selectedTabId],
  );

  const { data: activeTabDetails, isLoading: detailLoading } = useQuery({
    queryKey: ['dineInTab', selectedTabId],
    queryFn: async () => {
      const response = await marketplaceApi.getDineInTab(selectedTabId);
      return response?.data || response;
    },
    enabled: canView && !!selectedTabId,
  });

  const menuLocationId = selectedTabId
    ? (selectedTabLocationId || activeTabDetails?.locationId || selectedTabSummary?.locationId || '')
    : newTabLocationId;

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['dineInProducts', menuLocationId],
    queryFn: async () => {
      const response = await productsApi.list({ limit: 50, isActive: 'true', ...(menuLocationId ? { locationId: menuLocationId } : {}) });
      return response?.products || response?.data || [];
    },
    enabled: canView,
  });
  const products = Array.isArray(productsData) ? productsData : [];

  useEffect(() => {
    if (activeTabDetails?.locationId && activeTabDetails.locationId !== selectedTabLocationId) {
      setSelectedTabLocationId(activeTabDetails.locationId);
    }
  }, [activeTabDetails?.locationId, selectedTabLocationId]);

  const openTabMutation = useMutation({
    mutationFn: ({ customerAzamanId, locationId, tableId }) =>
      marketplaceApi.openDineInTab(businessId, customerAzamanId, { locationId: locationId || undefined, tableId: tableId || undefined }),
    onSuccess: (response) => {
      toast.go('Dine-In tab opened');
      const createdTab = response?.data || response;
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setIsNewTabOpen(false);
      setNewTabCustomer(null);
      setSearchQuery('');
      setGuestResults([]);
      setNewTabLocationId('');
      setNewTabTableId('');
      if (createdTab?.id) {
        setSelectedTabId(createdTab.id);
        setSelectedTabLocationId(createdTab.locationId || '');
      }
    },
    onError: (error) => toast.stop(error.message || 'Failed to open tab'),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ tabId, payload }) => marketplaceApi.addDineInItem(tabId, payload),
    onSuccess: () => {
      toast.go('Item added to tab');
      queryClient.invalidateQueries({ queryKey: ['dineInTab', selectedTabId] });
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setActiveItemConfig(null);
      setItemQuantity(1);
      setItemNotes('');
    },
    onError: (error) => toast.stop(error.message || 'Failed to add item'),
  });

  const kitchenMutation = useMutation({
    mutationFn: ({ tabId, items }) => request('/api/business-os/restaurant/kds', {
      method: 'POST',
      body: JSON.stringify({ tabId, items }),
    }),
    onSuccess: () => {
      toast.go('Order sent to kitchen');
      queryClient.invalidateQueries({ queryKey: ['dineInTab', selectedTabId] });
    },
    onError: (error) => toast.stop(`KDS dispatch failed: ${error.message}`),
  });

  const finalizeMutation = useMutation({
    mutationFn: ({ tabId, tip }) => marketplaceApi.finalizeDineInTab(tabId, { tipUsdc: tip }),
    onSuccess: () => {
      toast.go('Tab finalized and bill sent to customer');
      queryClient.invalidateQueries({ queryKey: ['dineInTab', selectedTabId] });
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setIsBillingOpen(false);
      setTipUsdc('0');
    },
    onError: (error) => toast.stop(error.message || 'Failed to finalize tab'),
  });

  const searchGuests = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearchingGuests(true);
    try {
      const response = await marketplaceApi.searchGuest(query);
      setGuestResults(response?.data || response || []);
    } catch (error) {
      toast.stop(`Guest search failed: ${error.message}`);
    } finally {
      setIsSearchingGuests(false);
    }
  };

  const handleOpen = () => {
    if (!newTabCustomer) return toast.stop('Select a guest before opening a tab');
    if (newTabTableId && !newTabLocationId) return toast.stop('Choose the location before selecting a table');
    openTabMutation.mutate({
      customerAzamanId: newTabCustomer.azamanId || newTabCustomer.id,
      locationId: newTabLocationId,
      tableId: newTabTableId,
    });
  };

  const addItem = () => {
    if (!selectedTabId || !activeItemConfig) return;
    const quantity = Math.max(1, Number(itemQuantity) || 1);
    addItemMutation.mutate({
      tabId: selectedTabId,
      payload: {
        productId: activeItemConfig.id,
        name: `${activeItemConfig.name}${itemNotes.trim() ? ` (${itemNotes.trim()})` : ''}`,
        unitPriceUsdc: Number(activeItemConfig.priceUsdc),
        quantity,
      },
    });
  };

  const splitPreview = useMemo(() => {
    if (!activeTabDetails) return [];
    const items = activeTabDetails.items || [];
    const subtotal = Number(activeTabDetails.subtotalUsdc) || 0;
    const tax = Number(activeTabDetails.taxTotalUsdc) || 0;
    const tip = Number(activeTabDetails.tipUsdc) || 0;
    if (splitType === 'even') {
      const total = Number(activeTabDetails.grandTotalUsdc ?? subtotal + tax + tip) || 0;
      return Array.from({ length: splitCount }, (_, index) => ({ guest: index + 1, total: total / splitCount, items: [] }));
    }
    const portions = Array.from({ length: splitCount }, (_, index) => ({ guest: index + 1, total: 0, items: [] }));
    items.forEach((item) => {
      const guestIndex = Number(itemAssignments[item.id] ?? 0);
      if (!portions[guestIndex]) return;
      const line = Number(item.lineTotalUsdc ?? Number(item.unitPriceUsdc) * Number(item.quantity)) || 0;
      portions[guestIndex].total += line;
      portions[guestIndex].items.push(`${item.quantity}x ${item.name}`);
    });
    const multiplier = subtotal > 0 ? (subtotal + tax + tip) / subtotal : 1;
    portions.forEach((portion) => { portion.total *= multiplier; });
    return portions;
  }, [activeTabDetails, itemAssignments, splitCount, splitType]);

  if (!canView) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6 text-center">
        <div>
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--stop)]" />
          <h2 className="text-lg font-bold">Permission Denied</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">You do not have permission to view dine-in operations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Utensils className="h-6 w-6" /> Dine-In Operations</h1>
          <p className="text-sm text-[var(--text-3)]">Select a real branch and table, operate the live tab, and let the server own pricing and tax authority.</p>
        </div>
        {canManage && <Button variant="primary" size="sm" onClick={() => setIsNewTabOpen(true)}><Plus className="mr-1 h-4 w-4" /> Open Table Tab</Button>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-3)]">Open Tabs ({openTabs?.length || 0})</h3>
            {tabsLoading && <span className="text-xs text-[var(--accent)]">refreshing…</span>}
          </div>
          {tabsLoading && !openTabs ? <Skel className="h-24 w-full" /> : (openTabs || []).length === 0 ? (
            <Empty icon={Receipt} title="No open tabs" description="Open a branch-aware tab to start serving." />
          ) : (
            (openTabs || []).map((tab) => (
              <Card key={tab.id} onClick={() => { setSelectedTabId(tab.id); setSelectedTabLocationId(tab.locationId || ''); }} className={`cursor-pointer border p-4 ${selectedTabId === tab.id ? 'border-[var(--accent)]' : 'border-[var(--line)]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-bold">{tab.tableId ? `Table ${tab.tableId}` : 'Bar'} <Tag tone="neutral">{tab.status}</Tag></div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-3)]"><UserCheck className="h-3 w-3" /> {tab.customerName || tab.customerId || 'Guest'}</p>
                    {tab.locationId && <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-3)]"><MapPin className="h-3 w-3" /> Branch bound</p>}
                  </div>
                  <span className="font-mono text-sm font-bold">GHS {money(tab.grandTotalUsdc || tab.subtotalUsdc)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[10px] text-[var(--text-3)]"><span>{tab.items?.length || 0} items</span><span><Clock className="mr-1 inline h-3 w-3" />{tab.openedAt ? new Date(tab.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span></div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedTabId ? <Card className="border-dashed p-12 text-center"><Utensils className="mx-auto mb-4 h-10 w-10 opacity-40" /><h3 className="font-bold">Select an open tab</h3><p className="mt-1 text-sm text-[var(--text-3)]">The selected tab is the source for its branch, menu, and bill lifecycle.</p></Card> : detailLoading ? <Card className="p-10 text-center">Loading tab…</Card> : activeTabDetails ? (
            <div className="space-y-4">
              <Card className="flex flex-col justify-between gap-3 border p-4 sm:flex-row sm:items-center">
                <div><h3 className="font-bold">{activeTabDetails.tableId ? `Table ${activeTabDetails.tableId}` : 'Bar'} · {activeTabDetails.status}</h3><p className="text-xs text-[var(--text-3)]">Customer: {activeTabDetails.customerId}</p></div>
                <div className="flex flex-wrap gap-2">
                  {canManage && <Button variant="secondary" size="sm" onClick={() => kitchenMutation.mutate({ tabId: selectedTabId, items: activeTabDetails.items || [] })}><Send className="mr-1 h-3.5 w-3.5" /> Kitchen</Button>}
                  <Button variant="secondary" size="sm" onClick={() => setIsSplitOpen(true)}><Users className="mr-1 h-3.5 w-3.5" /> Split Preview</Button>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold">Branch Menu</h4>{productsLoading && <span className="text-xs text-[var(--text-3)]">loading…</span>}</div>
                  {(products || []).length === 0 ? <p className="py-8 text-center text-xs text-[var(--text-3)]">No products available for this branch.</p> : <div className="max-h-[400px] divide-y divide-[var(--line)] overflow-y-auto">{products.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-semibold">{product.name}</p><p className="text-xs text-[var(--text-3)]">GHS {money(product.priceUsdc)}</p></div><Button variant="secondary" size="sm" onClick={() => { setActiveItemConfig(product); setItemQuantity(1); setItemNotes(''); }}><Plus className="h-4 w-4" /></Button></div>)}</div>}
                </Card>

                <Card className="border p-4">
                  <h4 className="mb-3 font-semibold">Running Bill</h4>
                  {(activeTabDetails.items || []).length === 0 ? <p className="py-8 text-center text-xs text-[var(--text-3)]">No items yet.</p> : <div className="max-h-[280px] divide-y divide-[var(--line)] overflow-y-auto">{activeTabDetails.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-xs"><div><p className="font-semibold">{item.name}</p><p className="text-[10px] text-[var(--text-3)]">{item.quantity}x @ GHS {money(item.unitPriceUsdc)}</p></div><strong>GHS {money(item.lineTotalUsdc)}</strong></div>)}</div>}
                  <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3 text-sm"><div className="flex justify-between"><span className="text-[var(--text-3)]">Subtotal</span><strong>GHS {money(activeTabDetails.subtotalUsdc)}</strong></div>{activeTabDetails.status === 'BILLING' && <><div className="flex justify-between"><span className="text-[var(--text-3)]">Tax</span><strong>GHS {money(activeTabDetails.taxTotalUsdc)}</strong></div><div className="flex justify-between"><span className="text-[var(--text-3)]">Tip</span><strong>GHS {money(activeTabDetails.tipUsdc)}</strong></div></>}<div className="flex justify-between border-t border-[var(--line)] pt-2 font-bold"><span>Total</span><span>GHS {money(activeTabDetails.grandTotalUsdc || activeTabDetails.subtotalUsdc)}</span></div></div>
                  {canManage && activeTabDetails.status !== 'BILLING' && <Button className="mt-4 w-full" variant="primary" onClick={() => { setTipUsdc('0'); setIsBillingOpen(true); }}><Receipt className="mr-1 h-4 w-4" /> Request Bill</Button>}
                  {activeTabDetails.status === 'BILLING' && <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-center text-xs text-[var(--text-3)]">Awaiting the customer’s secure payment confirmation.</div>}
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={isNewTabOpen} onClose={() => setIsNewTabOpen(false)} title="Open Dine-In Tab">
        <div className="space-y-4">
          <div className="flex gap-2"><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchGuests()} placeholder="Search guest by AZM ID, handle, name or phone" /><Button variant="secondary" onClick={searchGuests} disabled={isSearchingGuests}><Search className="h-4 w-4" /></Button></div>
          {guestResults.length > 0 && <div className="max-h-40 divide-y divide-[var(--line)] overflow-y-auto rounded-lg border border-[var(--line)]">{guestResults.map((guest) => <button type="button" key={guest.id || guest.azamanId} onClick={() => setNewTabCustomer(guest)} className={`block w-full px-3 py-2 text-left text-xs ${newTabCustomer?.id === guest.id ? 'bg-[var(--surface-2)]' : ''}`}><strong>{guest.name || guest.fullname}</strong><span className="ml-2 text-[var(--text-3)]">{guest.azamanId || guest.handle}</span></button>)}</div>}
          {newTabCustomer && <div className="rounded-lg border border-[var(--line)] p-3 text-xs"><div className="font-semibold">Guest: {newTabCustomer.name || newTabCustomer.fullname}</div><div className="text-[var(--text-3)]">{newTabCustomer.azamanId || newTabCustomer.id}</div></div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Select label="Branch / Location" value={newTabLocationId} onChange={(event) => { setNewTabLocationId(event.target.value); setNewTabTableId(''); }} disabled={locationsLoading} options={[{ value: '', label: locationsLoading ? 'Loading locations…' : 'Bar / no branch' }, ...locations.map((location) => ({ value: location.id, label: location.name || location.label || location.address || location.id }))]} /><Select label="Table" value={newTabTableId} onChange={(event) => setNewTabTableId(event.target.value)} disabled={!newTabLocationId || tablesLoading} options={[{ value: '', label: !newTabLocationId ? 'Select a branch first' : tablesLoading ? 'Loading tables…' : 'Bar / no table' }, ...tables.map((table) => ({ value: table.id, label: table.label || table.name || table.id }))]} /></div>
          <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-3"><Button variant="secondary" onClick={() => setIsNewTabOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleOpen} disabled={!newTabCustomer || openTabMutation.isPending}>{openTabMutation.isPending ? 'Opening…' : 'Open Active Tab'}</Button></div>
        </div>
      </Dialog>

      <Dialog open={!!activeItemConfig} onClose={() => setActiveItemConfig(null)} title="Configure Item">
        {activeItemConfig && <div className="space-y-4"><div><h4 className="font-bold">{activeItemConfig.name}</h4><p className="text-xs text-[var(--text-3)]">GHS {money(activeItemConfig.priceUsdc)} per unit</p></div><Input type="number" min="1" label="Quantity" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} /><Input label="Kitchen notes / modifiers" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} placeholder="e.g. No onions" /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setActiveItemConfig(null)}>Cancel</Button><Button variant="primary" onClick={addItem} disabled={addItemMutation.isPending}>{addItemMutation.isPending ? 'Adding…' : 'Add to Bill'}</Button></div></div>}
      </Dialog>

      <Dialog open={isBillingOpen} onClose={() => setIsBillingOpen(false)} title="Finalize Bill">
        <div className="space-y-4"><div className="rounded-lg border border-[var(--line)] p-3 text-xs"><div className="flex justify-between"><span>Subtotal</span><strong>GHS {money(activeTabDetails?.subtotalUsdc)}</strong></div><p className="mt-2 text-[var(--text-3)]">Tax is calculated from the business default on the server. This screen only collects an optional service tip.</p></div><Input type="number" min="0" step="any" label="Service Tip (GHS)" value={tipUsdc} onChange={(event) => setTipUsdc(event.target.value)} /><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsBillingOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => finalizeMutation.mutate({ tabId: selectedTabId, tip: Math.max(0, Number(tipUsdc) || 0) })} disabled={finalizeMutation.isPending}>{finalizeMutation.isPending ? 'Finalizing…' : 'Finalize Tab'}</Button></div></div>
      </Dialog>

      <Dialog open={isSplitOpen} onClose={() => setIsSplitOpen(false)} title="Split Preview">
        <div className="space-y-4"><div className="flex flex-wrap gap-2"><Button size="sm" variant={splitType === 'even' ? 'primary' : 'secondary'} onClick={() => setSplitType('even')}>Split evenly</Button><Button size="sm" variant={splitType === 'item' ? 'primary' : 'secondary'} onClick={() => setSplitType('item')}>By item</Button><Input className="w-20" type="number" min="2" max="12" value={splitCount} onChange={(event) => setSplitCount(Math.max(2, Number(event.target.value) || 2))} /></div>{splitType === 'item' && <div className="space-y-2">{(activeTabDetails?.items || []).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] p-2 text-xs"><span>{item.quantity}x {item.name}</span><Select value={itemAssignments[item.id] ?? 0} onChange={(event) => setItemAssignments({ ...itemAssignments, [item.id]: Number(event.target.value) })} options={Array.from({ length: splitCount }, (_, index) => ({ value: index, label: `Guest ${index + 1}` }))} /></div>)}</div>}<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{splitPreview.map((portion) => <div key={portion.guest} className="rounded-lg border border-[var(--line)] p-3"><div className="flex justify-between text-xs font-bold"><span>Guest {portion.guest}</span><span>GHS {money(portion.total)}</span></div>{portion.items.map((line) => <p key={line} className="mt-1 text-[10px] text-[var(--text-3)]">{line}</p>)}</div>)}</div></div>
      </Dialog>
    </div>
  );
}
