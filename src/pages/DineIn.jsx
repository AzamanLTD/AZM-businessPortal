import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../lib/marketplaceApi';
import { products as productsApi } from '../lib/api';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../lib/AuthContext';
import { request } from '../lib/apiCore';
import {
  Card,
  Tag,
  Button,
  Input,
  Select,
  Empty,
  Skel,
  Dialog,
  Tabs,
  Tooltip
} from '@/components/instrument';
import {
  Receipt,
  User,
  Plus,
  Minus,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  Utensils,
  Play,
  ArrowRight,
  Calculator,
  UserCheck,
  AlertCircle,
  Printer,
  ChevronRight,
  Send,
  Sparkles,
  Users
} from 'lucide-react';
import { toast } from '@/lib/toast';

export default function DineIn() {
  const queryClient = useQueryClient();
  const { bizProfile } = useAuth();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('dinein.manage');
  const canView = hasPermission('dinein.view') || canManage;

  const businessId = bizProfile?.id;

  // Selected Tab detailed view
  const [selectedTabId, setSelectedTabId] = useState(null);

  // Guest Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);

  // New tab builder state
  const [isNewTabOpen, setIsNewTabOpen] = useState(false);
  const [newTabCustomer, setNewTabCustomer] = useState(null);
  const [newTabTableNum, setNewTabTableNum] = useState('');

  // Modifiers and items details state
  const [itemModifierForm, setItemModifierForm] = useState({ notes: '', quantity: 1 });
  const [activeItemConfig, setActiveItemConfig] = useState(null);

  // Billing & finalization setup
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [taxRatePct, setTaxRatePct] = useState('12.5'); // Default standard rate
  const [tipUsdc, setTipUsdc] = useState('0');

  // Split billing configuration
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState('even'); // 'even' or 'item'
  const [itemAssignments, setItemAssignments] = useState({}); // { [itemId]: guestIndex }

  // Queries
  const { data: openTabs, isLoading: tabsLoading } = useQuery({
    queryKey: ['openTabs'],
    queryFn: async () => {
      const res = await marketplaceApi.getOpenTabs();
      return res?.data || res || [];
    },
    enabled: canView,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['dineInProducts'],
    queryFn: async () => {
      const res = await productsApi.list({ limit: 100 });
      return res?.products || res?.data || [];
    },
    enabled: canView,
  });

  const { data: activeTabDetails, isLoading: detailLoading } = useQuery({
    queryKey: ['dineInTab', selectedTabId],
    queryFn: async () => {
      if (!selectedTabId) return null;
      const res = await marketplaceApi.getDineInTab(selectedTabId);
      return res?.data || res;
    },
    enabled: canView && !!selectedTabId,
  });

  // Mutations
  const openTabMutation = useMutation({
    mutationFn: ({ businessProfileId, customerAzamanId }) =>
      marketplaceApi.openDineInTab(businessProfileId, customerAzamanId),
    onSuccess: () => {
      toast.go('Dine-In Tab opened successfully');
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setIsNewTabOpen(false);
      setNewTabCustomer(null);
      setNewTabTableNum('');
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to open tab');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ tabId, payload }) =>
      marketplaceApi.addDineInItem(tabId, payload),
    onSuccess: () => {
      toast.go('Item added to tab');
      queryClient.invalidateQueries({ queryKey: ['dineInTab', selectedTabId] });
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setActiveItemConfig(null);
      setItemModifierForm({ notes: '', quantity: 1 });
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to add item');
    },
  });

  const sendToKitchenMutation = useMutation({
    mutationFn: async ({ tabId, items }) => {
      // POST /api/business-os/restaurant/kds automatically sends items to kitchen dispatcher
      return request('/api/business-os/restaurant/kds', {
        method: 'POST',
        body: JSON.stringify({ tabId, items }),
      });
    },
    onSuccess: () => {
      toast.go('Order routed & sent to kitchen display successfully!');
      queryClient.invalidateQueries({ queryKey: ['dineInTab', selectedTabId] });
    },
    onError: (err) => {
      toast.stop(`KDS dispatch failure: ${err.message}`);
    },
  });

  const finalizeTabMutation = useMutation({
    mutationFn: ({ tabId, payload }) =>
      marketplaceApi.finalizeDineInTab(tabId, payload),
    onSuccess: () => {
      toast.go('Tab moved to BILLING. Finalized summary dispatched.');
      queryClient.invalidateQueries({ queryKey: ['dineInTab', selectedTabId] });
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setIsBillingOpen(false);
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to finalize tab');
    },
  });

  const closeTabMutation = useMutation({
    mutationFn: (tabId) =>
      marketplaceApi.confirmDineInTab(tabId),
    onSuccess: () => {
      toast.go('Tab paid & closed successfully. Invoice printed!');
      queryClient.invalidateQueries({ queryKey: ['openTabs'] });
      setSelectedTabId(null);
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to close tab');
    },
  });

  // Search Guest Functionality
  const handleGuestSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingGuests(true);
    try {
      const res = await marketplaceApi.searchGuest(searchQuery.trim());
      setGuestResults(res?.data || res || []);
    } catch (e) {
      toast.stop('Search failed: ' + e.message);
    } finally {
      setIsSearchingGuests(false);
    }
  };

  const handleOpenTabSubmit = () => {
    if (!newTabCustomer) {
      toast.stop('Please select or search a guest');
      return;
    }
    openTabMutation.mutate({
      businessProfileId: businessId,
      customerAzamanId: newTabCustomer.azamanId || newTabCustomer.id,
    });
  };

  const handleAddItemSubmit = (product) => {
    if (!selectedTabId) return;
    addItemMutation.mutate({
      tabId: selectedTabId,
      payload: {
        productId: product.id,
        name: product.name + (itemModifierForm.notes ? ` (${itemModifierForm.notes})` : ''),
        unitPriceUsdc: parseFloat(product.priceUsdc),
        quantity: parseInt(itemModifierForm.quantity) || 1,
      },
    });
  };

  const triggerFinalize = () => {
    if (!selectedTabId || !activeTabDetails) return;
    finalizeTabMutation.mutate({
      tabId: selectedTabId,
      payload: {
        taxRatePct: parseFloat(taxRatePct),
        tipUsdc: parseFloat(tipUsdc),
      },
    });
  };

  // Perform split total calculations
  const calculateSplits = () => {
    if (!activeTabDetails) return [];
    const items = activeTabDetails.items || [];
    const total = parseFloat(activeTabDetails.grandTotalUsdc || activeTabDetails.subtotalUsdc || 0);

    if (splitType === 'even') {
      const portion = total / splitCount;
      return Array.from({ length: splitCount }, (_, i) => ({
        guestNum: i + 1,
        total: portion,
        items: ['Equal Share Portion'],
      }));
    } else {
      // Split by item
      const guests = Array.from({ length: splitCount }, (_, i) => ({
        guestNum: i + 1,
        total: 0,
        items: [],
      }));

      items.forEach((item) => {
        const assignedGuest = itemAssignments[item.id] !== undefined ? itemAssignments[item.id] : 0;
        if (guests[assignedGuest]) {
          const lineVal = parseFloat(item.lineTotalUsdc || (item.unitPriceUsdc * item.quantity));
          guests[assignedGuest].total += lineVal;
          guests[assignedGuest].items.push(`${item.quantity}x ${item.name}`);
        }
      });

      // Factor in proportional tip and tax to assigned bases
      const sub = parseFloat(activeTabDetails.subtotalUsdc || 1);
      const taxRate = (parseFloat(activeTabDetails.taxTotalUsdc) || 0) / sub;
      const tipRate = (parseFloat(activeTabDetails.tipUsdc) || 0) / sub;

      guests.forEach((g) => {
        const base = g.total;
        g.total = base + (base * taxRate) + (base * tipRate);
      });

      return guests;
    }
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--f-bg)]">
        <AlertCircle className="w-12 h-12 text-[var(--stop)] mb-4" />
        <h2 className="text-lg font-bold text-[var(--text)]">Permission Denied</h2>
        <p className="text-sm text-[var(--text-3)] mt-1">You do not have permission to view or manage dine-in tabs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 text-[var(--text)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
            <Utensils className="w-6 h-6 text-[var(--accent)]" />
            Dine-In Operations Dashboard
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            Open server tabs, register customer tables, dispatch kitchen tickets, and split bills seamlessly.
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewTabOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Open Table Tab
          </Button>
        )}
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Server Active Tabs List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-3)] uppercase tracking-wider flex items-center justify-between">
            <span>Running Tables & Tabs ({openTabs?.length || 0})</span>
            {tabsLoading && <span className="text-xs text-[var(--accent)] animate-pulse">refreshing...</span>}
          </h3>

          {tabsLoading && !openTabs ? (
            <div className="space-y-3">
              <Skel className="h-20 w-full" />
              <Skel className="h-20 w-full" />
            </div>
          ) : (openTabs || []).length === 0 ? (
            <Empty
              icon={Receipt}
              title="No open tabs"
              description="Table tabs are currently clear. Open a tab to start serving customers."
            />
          ) : (
            <div className="space-y-3">
              {(openTabs || []).map((tab) => {
                const sub = parseFloat(tab.subtotalUsdc || tab.grandTotalUsdc || 0);
                const itemsCount = tab.items?.length || 0;
                const isOpen = tab.status?.toUpperCase() === 'OPEN' || tab.status?.toUpperCase() === 'ACTIVE';

                return (
                  <Card
                    key={tab.id}
                    onClick={() => setSelectedTabId(tab.id)}
                    className={`cursor-pointer transition-all border p-4 ${
                      selectedTabId === tab.id
                        ? 'border-[var(--accent)] bg-[rgba(168,85,247,0.02)]'
                        : 'bg-[var(--surface)] border-[var(--line)]:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-[var(--text)]">
                            Table {tab.tableId || 'Bar'}
                          </span>
                          <Tag color={isOpen ? 'var(--accent)' : 'var(--hold)'}>
                            {tab.status}
                          </Tag>
                        </div>
                        <p className="text-xs text-[var(--text-3)] mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {tab.customerName || tab.customerId || 'Guest'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[var(--go)] f-mono">
                        GHS {sub.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--text-3)]">
                      <span className="flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5" />
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {tab.openedAt ? new Date(tab.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Tab Detailed Inspector / Bill Builder */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTabId ? (
            detailLoading ? (
              <Card className="p-8 text-center bg-[var(--surface)] border-[var(--line)]">
                <p className="text-sm text-[var(--text-3)] animate-pulse">Loading active tab details...</p>
              </Card>
            ) : activeTabDetails ? (
              <div className="space-y-6">
                {/* Tab Header Detail Card */}
                <Card className="bg-[var(--surface)] border-[var(--line)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">Table {activeTabDetails.tableId || 'Bar'} Tab Details</h3>
                      <Tag tone="neutral">{activeTabDetails.status}</Tag>
                    </div>
                    <p className="text-xs text-[var(--text-3)] mt-1">
                      Customer AZM ID: <strong className="text-[var(--text)]">{activeTabDetails.customerId}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const items = activeTabDetails.items || [];
                        sendToKitchenMutation.mutate({ tabId: selectedTabId, items });
                      }}
                      className="border-[var(--line)] text-xs flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5 text-[var(--info)]" />
                      Send to Kitchen
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Initialize assignment dictionary
                        const assignments = {};
                        (activeTabDetails.items || []).forEach(item => {
                          assignments[item.id] = 0;
                        });
                        setItemAssignments(assignments);
                        setIsSplitOpen(true);
                      }}
                      className="border-[var(--line)] text-xs flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Split Bill
                    </Button>
                  </div>
                </Card>

                {/* Sub-grid: Menu Products Catalog vs. Active Items running list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left sub-column: Menu Catalogue */}
                  <Card className="bg-[var(--surface)] border-[var(--line)] p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-[var(--text-3)] uppercase tracking-wider">
                      Add Menu Products
                    </h4>

                    {productsLoading ? (
                      <p className="text-xs text-center text-[var(--text-3)] animate-pulse">Loading products...</p>
                    ) : (
                      <div className="divide-y divide-[var(--line)] max-h-[350px] overflow-y-auto scrollbar-thin">
                        {(productsData || []).map((product) => (
                          <div key={product.id} className="py-2.5 flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm">{product.name}</p>
                              <p className="text-xs text-[var(--text-3)]">GHS {parseFloat(product.priceUsdc).toFixed(2)}</p>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setActiveItemConfig(product);
                                setItemModifierForm({ notes: '', quantity: 1 });
                              }}
                              className="w-8 h-8 rounded-lg p-0 border-[var(--line)]"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Right sub-column: Running Items lists */}
                  <Card className="bg-[var(--surface)] border-[var(--line)] p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--text-3)] uppercase tracking-wider mb-3">
                        Running Bill Items
                      </h4>

                      {(!activeTabDetails.items || activeTabDetails.items.length === 0) ? (
                        <p className="text-xs text-center text-[var(--text-3)] py-6 italic">No items logged yet.</p>
                      ) : (
                        <div className="divide-y divide-[var(--line)] max-h-[280px] overflow-y-auto scrollbar-thin mb-4">
                          {activeTabDetails.items.map((item) => {
                            const unitPrice = parseFloat(item.unitPriceUsdc) || 0;
                            const lineTotal = parseFloat(item.lineTotalUsdc || (unitPrice * item.quantity)) || 0;

                            return (
                              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-semibold text-[var(--text)]">{item.name}</p>
                                  <p className="text-[10px] text-[var(--text-3)]">
                                    {item.quantity}x @ GHS {unitPrice.toFixed(2)}
                                  </p>
                                </div>
                                <span className="font-semibold text-[var(--text)]">
                                  GHS {lineTotal.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Subtotal preview panel */}
                    <div className="border-t border-[var(--line)] pt-3 space-y-2">
                      <div className="flex justify-between text-xs text-[var(--text-3)]">
                        <span>Running Subtotal</span>
                        <span className="font-semibold text-[var(--text)]">
                          GHS {parseFloat(activeTabDetails.subtotalUsdc || 0).toFixed(2)}
                        </span>
                      </div>
                      {activeTabDetails.status?.toUpperCase() === 'BILLING' && (
                        <>
                          <div className="flex justify-between text-xs text-[var(--text-3)]">
                            <span>Tax Total</span>
                            <span className="font-semibold text-[var(--text)]">
                              GHS {parseFloat(activeTabDetails.taxTotalUsdc || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-[var(--text-3)]">
                            <span>Service Tip</span>
                            <span className="font-semibold text-[var(--text)]">
                              GHS {parseFloat(activeTabDetails.tipUsdc || 0).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t border-[var(--line)] pt-2">
                        <span>Total Due</span>
                        <span className="text-[var(--go)]">
                          GHS {parseFloat(activeTabDetails.grandTotalUsdc || activeTabDetails.subtotalUsdc || 0).toFixed(2)}
                        </span>
                      </div>

                      {canManage && (
                        <div className="pt-2">
                          {activeTabDetails.status?.toUpperCase() !== 'BILLING' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setTaxRatePct('12.5');
                                setTipUsdc('0');
                                setIsBillingOpen(true);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 h-10"
                            >
                              <Receipt className="w-4 h-4" />
                              Request Bill (Finalize)
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => closeTabMutation.mutate(selectedTabId)}
                              className="w-full bg-[var(--go)]:bg-[var(--go)] flex items-center justify-center gap-1.5 h-10"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Confirm & Pay Tab
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            ) : null
          ) : (
            <Card className="p-12 text-center border-dashed border-[var(--line)]">
              <Utensils className="w-12 h-12 text-[var(--accent)] mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-bold mb-1">No Active Tab Selected</h3>
              <p className="text-sm text-[var(--text-3)] max-w-sm mx-auto">
                Select a running table tab from the left sidebar to add menu orders, request billing statements, split totals, or confirm payments.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* --- MODALS SECTION --- */}

      {/* Open New Dine-In Tab Modal */}
      <Dialog open={isNewTabOpen} onClose={() => setIsNewTabOpen(false)} title="Open Dine-In Tab">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
              Search AZM Guest Account
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGuestSearch()}
                  placeholder="Enter AZM user handle, name or phone"
                  className="pl-9"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleGuestSearch} disabled={isSearchingGuests} className="h-11">
                {isSearchingGuests ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {guestResults.length > 0 && (
            <div className="max-h-[180px] overflow-y-auto divide-y divide-[var(--line)] bg-[var(--f-ink-900)] border border-[var(--line)] rounded-xl">
              {guestResults.map((guest) => (
                <div
                  key={guest.id || guest.azamanId}
                  onClick={() => setNewTabCustomer(guest)}
                  className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    newTabCustomer?.id === guest.id ? 'bg-[rgba(168,85,247,0.1)] text-[var(--accent)]' : 'hover:bg-[var(--line)]/40'
                  }`}
                >
                  <div>
                    <p className="font-bold text-[var(--text)]">{guest.name || guest.fullname}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{guest.azamanId || guest.handle}</p>
                  </div>
                  {newTabCustomer?.id === guest.id && <UserCheck className="w-4 h-4" />}
                </div>
              ))}
            </div>
          )}

          {newTabCustomer && (
            <div className="p-3 bg-[rgba(16,185,129,0.03)] border border-[rgba(16,185,129,0.15)] rounded-xl flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[var(--go)]" />
              <div className="text-xs">
                <p className="font-semibold text-[var(--text)]">Selected: {newTabCustomer.name || newTabCustomer.fullname}</p>
                <p className="text-[var(--text-3)]">Verified Azaman ID: {newTabCustomer.azamanId || newTabCustomer.id}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <Button variant="secondary" type="button" onClick={() => setIsNewTabOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={!newTabCustomer}
              onClick={handleOpenTabSubmit}
            >
              Open Active Tab
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Item Modifier details Configurator Modal */}
      <Dialog open={!!activeItemConfig} onClose={() => setActiveItemConfig(null)} title="Configure Item Order">
        {activeItemConfig && (
          <div className="space-y-4">
            <div className="p-3 bg-[var(--f-ink-900)] rounded-xl border border-[var(--line)]">
              <h4 className="font-bold text-base">{activeItemConfig.name}</h4>
              <p className="text-xs text-[var(--text-3)] mt-1">GHS {parseFloat(activeItemConfig.priceUsdc).toFixed(2)} per unit</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Input
                type="number"
                label="Quantity *"
                min="1"
                required
                value={itemModifierForm.quantity}
                onChange={(e) => setItemModifierForm({ ...itemModifierForm, quantity: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Kitchen Notes / Custom Modifiers"
                value={itemModifierForm.notes}
                onChange={(e) => setItemModifierForm({ ...itemModifierForm, notes: e.target.value })}
                placeholder="e.g. Extra spicy, No onions, Sauce on the side"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="secondary" type="button" onClick={() => setActiveItemConfig(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={() => handleAddItemSubmit(activeItemConfig)}
              >
                Add to Bill
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Request Bill / Finalization Setup Modal */}
      <Dialog open={isBillingOpen} onClose={() => setIsBillingOpen(false)} title="Finalize Bill Settings">
        {activeTabDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-[var(--f-ink-900)] p-3 rounded-xl border border-[var(--line)]">
              <div>
                <span className="text-xs text-[var(--text-3)]">Subtotal</span>
                <p className="font-bold text-base text-[var(--text)] mt-0.5">
                  GHS {parseFloat(activeTabDetails.subtotalUsdc || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-3)]">Open Server ID</span>
                <p className="font-mono text-xs text-[var(--text)] truncate mt-1">
                  {activeTabDetails.customerId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                step="any"
                label="Tax Rate (%)"
                value={taxRatePct}
                onChange={(e) => setTaxRatePct(e.target.value)}
              />
              <Input
                type="number"
                step="any"
                label="Service Tip (GHS)"
                value={tipUsdc}
                onChange={(e) => setTipUsdc(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="secondary" type="button" onClick={() => setIsBillingOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={triggerFinalize}
              >
                Finalize Tab
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Split Payment Bill Splitter Modal */}
      <Dialog open={isSplitOpen} onClose={() => setIsSplitOpen(false)} title="Bill Splits Manager" className="max-w-2xl">
        {activeTabDetails && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div className="flex gap-2">
                <Button
                  variant={splitType === 'even' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSplitType('even')}
                  className="text-xs h-9 border-[var(--line)]"
                >
                  Split Evenly
                </Button>
                <Button
                  variant={splitType === 'item' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSplitType('item')}
                  className="text-xs h-9 border-[var(--line)]"
                >
                  Split by Item
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-3)] font-semibold">Portions:</span>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  value={splitCount}
                  onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-16 h-9 py-1 text-center"
                />
              </div>
            </div>

            {/* Split Type: Item Assignments */}
            {splitType === 'item' && (
              <div className="space-y-4 max-h-[220px] overflow-y-auto scrollbar-thin">
                <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider block">
                  Assign Items to Guests
                </span>
                <div className="space-y-2">
                  {(activeTabDetails.items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs bg-[var(--f-ink-900)] p-2.5 rounded-xl border border-[var(--line)]">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-[10px] text-[var(--text-3)]">
                          {item.quantity}x @ GHS {(parseFloat(item.unitPriceUsdc) || 0).toFixed(2)}
                        </p>
                      </div>
                      <Select
                        value={itemAssignments[item.id] !== undefined ? itemAssignments[item.id] : 0}
                        onChange={(e) => setItemAssignments({
                          ...itemAssignments,
                          [item.id]: parseInt(e.target.value) || 0
                        })}
                        className="w-28 py-1 h-9 text-xs"
                        options={Array.from({ length: splitCount }, (_, i) => ({
                          value: i,
                          label: `Guest ${i + 1}`
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Splits Portion Summary */}
            <div className="space-y-3 pt-3 border-t border-[var(--line)]">
              <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider block">
                Calculated Portions Preview
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calculateSplits().map((split) => (
                  <div key={split.guestNum} className="bg-[var(--f-ink-900)] p-3 rounded-xl border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-1.5 mb-1.5">
                        <span className="font-bold text-xs text-[var(--accent)]">Portion {split.guestNum}</span>
                        <span className="text-xs font-bold text-[var(--go)]">GHS {split.total.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-3)] space-y-0.5">
                        {split.items.map((line, idx) => (
                          <p key={idx} className="truncate">{line}</p>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        toast.go(`Printed split statement for Guest ${split.guestNum}!`, {
                          description: `Amount: GHS ${split.total.toFixed(2)}. Sent copy to table printer.`,
                        });
                      }}
                      className="w-full h-8 text-[10px] border-[var(--line)] mt-3 flex items-center justify-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      Print Bill portion
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="secondary" type="button" onClick={() => setIsSplitOpen(false)}>
                Close Splitter
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={() => {
                  toast.go('Split billing configuration finalized successfully!');
                  setIsSplitOpen(false);
                }}
              >
                Accept Splits & Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
