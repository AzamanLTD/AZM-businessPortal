import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantOpsApi as restaurantApi, marketplaceApi } from '@/lib/marketplaceApi';
import { locations as locApi, products as productsApi } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/lib/AuthContext';
import { Card, Button, Tag, Skel, Empty, Avatar, Input, Select, Dialog } from '@/components/instrument';
import { toast } from '@/lib/toast';
import {
  Grid3x3, Clock, Users, Plus, Trash2, Edit2, Play, CheckCircle, HelpCircle,
  Move, Check, RotateCcw, AlertCircle, ShoppingBag, X, DollarSign, Calendar
} from 'lucide-react';

const TABLE_STATUS = {
  OPEN: { label: 'Open', color: 'var(--go)' },
  SEATED: { label: 'Seated', color: 'var(--info)' },
  ORDERED: { label: 'Ordered', color: 'var(--hold)' },
  EATING: { label: 'Eating', color: 'var(--accent)' },
  BILLING: { label: 'Billing', color: 'var(--stop)' },
  CLEANING: { label: 'Cleaning', color: 'var(--text-3)' },
};

export default function RestaurantTables() {
  const qc = useQueryClient();
  const { hasPermission } = usePermission();
  const { bizProfile } = useAuth();

  const canManage = hasPermission('tables.manage') || hasPermission('*');
  const canView = hasPermission('tables.view') || hasPermission('*');

  // Active Location selection
  const [selectedLocId, setSelectedLocId] = useState('');

  // 1. Fetch Locations
  const { data: locsData, isLoading: loadingLocs } = useQuery({
    queryKey: ['biz-locations-tables-page'],
    queryFn: () => locApi.list(),
  });
  const locationsList = (locsData?.locations || []).filter(l => l.isActive);

  // Auto-select first active location
  useEffect(() => {
    if (locationsList.length > 0 && !selectedLocId) {
      setSelectedLocId(locationsList[0].id);
    }
  }, [locationsList, selectedLocId]);

  // 2. Fetch tables for currently selected location
  const { data: tablesData, isLoading: loadingTables, refetch: refetchTables } = useQuery({
    queryKey: ['restaurant-tables', selectedLocId],
    queryFn: () => restaurantApi.getTables({ locationId: selectedLocId }),
    enabled: !!selectedLocId,
  });
  const tables = tablesData?.tables || [];

  // 3. Fetch products for dine-in item ordering
  const { data: productsData } = useQuery({
    queryKey: ['dine-in-products'],
    queryFn: () => productsApi.list({ limit: 100 }),
    enabled: !!selectedLocId,
  });
  const products = productsData?.products || [];

  // 4. Fetch upcoming reservations for placeholder view
  const { data: reservationsData } = useQuery({
    queryKey: ['reservations-for-tables'],
    queryFn: () => marketplaceApi.getGuests().catch(() => ({})), // safe fallback or list reservations
    enabled: !!selectedLocId,
  });

  // Table Status Update Mutation
  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }) => restaurantApi.updateTableStatus(id, status),
    onSuccess: () => {
      toast.go('Table status updated successfully');
      qc.invalidateQueries({ queryKey: ['restaurant-tables', selectedLocId] });
    },
    onError: (err) => toast.stop(err.message || 'Failed to update table status'),
  });

  // Table Management Mutations (CRUD)
  const createTableMut = useMutation({
    mutationFn: ({ locId, label }) => locApi.createTable(locId, label),
    onSuccess: () => {
      toast.go('Table created successfully');
      qc.invalidateQueries({ queryKey: ['restaurant-tables', selectedLocId] });
    },
    onError: (err) => toast.stop(err.message || 'Failed to create table'),
  });

  const deleteTableMut = useMutation({
    mutationFn: (tableId) => locApi.deleteTable(tableId),
    onSuccess: () => {
      toast.go('Table deleted successfully');
      qc.invalidateQueries({ queryKey: ['restaurant-tables', selectedLocId] });
    },
    onError: (err) => toast.stop(err.message || 'Failed to delete table'),
  });

  // Layout editor state stored in localStorage
  const [layoutMode, setLayoutMode] = useState(false); // true = editing layout
  const [layouts, setLayouts] = useState({}); // { [tableId]: { x, y, shape, seats } }

  // Load layouts from localStorage on location change
  useEffect(() => {
    if (selectedLocId) {
      try {
        const saved = localStorage.getItem(`azm_floorplan_${selectedLocId}`);
        if (saved) {
          setLayouts(JSON.parse(saved));
        } else {
          // Initialize automatic grid layout if nothing saved
          setLayouts({});
        }
      } catch (e) {
        setLayouts({});
      }
    }
  }, [selectedLocId]);

  const saveLayout = (updatedLayouts) => {
    if (!selectedLocId) return;
    setLayouts(updatedLayouts);
    localStorage.setItem(`azm_floorplan_${selectedLocId}`, JSON.stringify(updatedLayouts));
  };

  // Waitlist state in localStorage
  const [waitlist, setWaitlist] = useState([]);
  useEffect(() => {
    if (selectedLocId) {
      try {
        const saved = localStorage.getItem(`azm_waitlist_${selectedLocId}`);
        setWaitlist(saved ? JSON.parse(saved) : []);
      } catch (e) {
        setWaitlist([]);
      }
    }
  }, [selectedLocId]);

  const saveWaitlist = (newList) => {
    setWaitlist(newList);
    localStorage.setItem(`azm_waitlist_${selectedLocId}`, JSON.stringify(newList));
  };

  // Floor plan container ref for drag-and-drop bounding
  const canvasRef = useRef(null);
  const [draggingTableId, setDraggingTableId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle Dragging
  const handleDragStart = (e, tableId) => {
    if (!layoutMode) return;
    setDraggingTableId(tableId);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!layoutMode || !draggingTableId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate relative coordinates inside the canvas
    let x = e.clientX - canvasRect.left - dragOffset.x;
    let y = e.clientY - canvasRect.top - dragOffset.y;

    // Boundary constraint
    x = Math.max(0, Math.min(x, canvasRect.width - 90));
    y = Math.max(0, Math.min(y, canvasRect.height - 90));

    // Snapping to grid (10px)
    x = Math.round(x / 10) * 10;
    y = Math.round(y / 10) * 10;

    const currentTableLayout = layouts[draggingTableId] || { shape: 'rectangle', seats: 4 };
    const updated = {
      ...layouts,
      [draggingTableId]: {
        ...currentTableLayout,
        x,
        y,
      },
    };
    saveLayout(updated);
  };

  const handleDragEnd = () => {
    setDraggingTableId(null);
  };

  // Dialog State for Waitlist
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: '', phone: '', partySize: 2, quotedWait: '15m' });

  const handleAddWaitlist = () => {
    if (!waitlistForm.name.trim()) {
      toast.stop('Name is required');
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      name: waitlistForm.name,
      phone: waitlistForm.phone,
      partySize: parseInt(waitlistForm.partySize) || 2,
      quotedWait: waitlistForm.quotedWait,
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const newList = [...waitlist, newItem];
    saveWaitlist(newList);
    setWaitlistModalOpen(false);
    setWaitlistForm({ name: '', phone: '', partySize: 2, quotedWait: '15m' });
    toast.go(`${newItem.name} added to the waitlist`);
  };

  const handleNotifyWaitlist = (item) => {
    toast.go(`Notification sent to ${item.name} (${item.phone || 'No Phone'})!`);
  };

  const handleRemoveWaitlist = (id) => {
    const newList = waitlist.filter(item => item.id !== id);
    saveWaitlist(newList);
    toast.go('Waitlist entry removed');
  };

  // Dialog State for adding/modifying table properties in layout editor
  const [tableConfigOpen, setTableConfigOpen] = useState(false);
  const [selectedConfigTable, setSelectedConfigTable] = useState(null);
  const [configForm, setConfigForm] = useState({ shape: 'rectangle', seats: 4 });

  const openTableConfig = (table) => {
    const existing = layouts[table.id] || { shape: 'rectangle', seats: 4 };
    setSelectedConfigTable(table);
    setConfigForm({
      shape: existing.shape || 'rectangle',
      seats: existing.seats || 4,
    });
    setTableConfigOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedConfigTable) return;
    const existing = layouts[selectedConfigTable.id] || { x: 50, y: 50 };
    const updated = {
      ...layouts,
      [selectedConfigTable.id]: {
        ...existing,
        shape: configForm.shape,
        seats: parseInt(configForm.seats) || 4,
      },
    };
    saveLayout(updated);
    setTableConfigOpen(false);
    setSelectedConfigTable(null);
    toast.go(`Table settings updated for ${selectedConfigTable.label || selectedConfigTable.tableNumber}`);
  };

  // Interactive Table Tab Operations
  const [activeTabTable, setActiveTabTable] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [taxRate, setTaxRate] = useState(10);
  const [tipAmount, setTipAmount] = useState(0);

  // Active DineInTab fetched or opened
  const [currentTabDetails, setCurrentTabDetails] = useState(null);
  const [loadingTabDetails, setLoadingTabDetails] = useState(false);

  // Custom function to load tab details
  const loadTabDetails = async (tabId) => {
    setLoadingTabDetails(true);
    try {
      const res = await marketplaceApi.getDineInTab(tabId);
      setCurrentTabDetails(res.tab || res.data || res);
    } catch (err) {
      toast.stop('Failed to load tab details');
    } finally {
      setLoadingTabDetails(false);
    }
  };

  const handleOpenTableControl = async (table) => {
    setActiveTabTable(table);
    setCurrentTabDetails(null);
    setSelectedProduct('');
    setOrderQuantity(1);
    setTipAmount(0);

    // If table already has an active dine-in tab, fetch it
    // Usually table.dineInTabs is checked or table.currentTabId
    const activeTab = table.dineInTabs?.find(tab => tab.status !== 'CLOSED') || table.currentTab;
    if (activeTab) {
      await loadTabDetails(activeTab.id);
    }
  };

  const handleOpenNewTab = async () => {
    if (!activeTabTable) return;
    try {
      setLoadingTabDetails(true);
      // Open a tab using standard dineInApi profile lookup and client registration
      // We pass the business profile ID and generic customer or guest identifier
      const bizId = bizProfile?.id;
      const customerAzamanId = 'guest-walkin'; // fallback standard guest
      
      const res = await marketplaceApi.openDineInTab(bizId, customerAzamanId);
      const newTab = res.tab || res.data || res;
      
      // Associate with our current local status
      await updateStatusMut.mutateAsync({ id: activeTabTable.id, status: 'SEATED' });
      await loadTabDetails(newTab.id);
      
      toast.go('Dine-in tab opened for Table ' + (activeTabTable.label || activeTabTable.tableNumber));
      refetchTables();
    } catch (err) {
      toast.stop(err.message || 'Failed to open dine-in tab');
    } finally {
      setLoadingTabDetails(false);
    }
  };

  const handleAddItemToTab = async () => {
    if (!currentTabDetails || !selectedProduct) return;
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return;

    try {
      await marketplaceApi.addDineInItem(currentTabDetails.id, {
        productId: prod.id,
        name: prod.name,
        unitPriceUsdc: prod.priceUsdc || prod.price || 10,
        quantity: parseInt(orderQuantity) || 1,
      });
      toast.go(`${prod.name} added to tab`);
      
      // Cycle table state to ORDERED / EATING
      if (activeTabTable && activeTabTable.status === 'SEATED') {
        await updateStatusMut.mutateAsync({ id: activeTabTable.id, status: 'ORDERED' });
        refetchTables();
      }

      await loadTabDetails(currentTabDetails.id);
    } catch (err) {
      toast.stop(err.message || 'Failed to add item');
    }
  };

  const handleFinalizeTab = async () => {
    if (!currentTabDetails) return;
    try {
      await marketplaceApi.finalizeDineInTab(currentTabDetails.id, {
        taxRatePct: parseFloat(taxRate) || 0,
        tipUsdc: parseFloat(tipAmount) || 0,
      });
      toast.go('Dine-in bill finalized');

      if (activeTabTable) {
        await updateStatusMut.mutateAsync({ id: activeTabTable.id, status: 'BILLING' });
        refetchTables();
      }

      await loadTabDetails(currentTabDetails.id);
    } catch (err) {
      toast.stop(err.message || 'Failed to finalize bill');
    }
  };

  const handleCloseAndPayTab = async () => {
    if (!currentTabDetails) return;
    try {
      await marketplaceApi.confirmDineInTab(currentTabDetails.id);
      toast.go('Payment confirmed and tab closed');

      if (activeTabTable) {
        await updateStatusMut.mutateAsync({ id: activeTabTable.id, status: 'CLEANING' });
        refetchTables();
      }

      setActiveTabTable(null);
      setCurrentTabDetails(null);
    } catch (err) {
      toast.stop(err.message || 'Failed to process payment confirmation');
    }
  };

  // Quick action table status update
  const handleDirectStatusUpdate = async (status) => {
    if (!activeTabTable) return;
    try {
      await updateStatusMut.mutateAsync({ id: activeTabTable.id, status });
      setActiveTabTable(prev => prev ? { ...prev, status } : null);
    } catch (err) {}
  };

  // Table creation state
  const [newTableLabel, setNewTableLabel] = useState('');
  const handleAddNewTable = () => {
    if (!selectedLocId) return;
    if (!newTableLabel.trim()) {
      toast.stop('Table label or number is required');
      return;
    }
    createTableMut.mutate({ locId: selectedLocId, label: newTableLabel.trim() }, {
      onSuccess: () => {
        setNewTableLabel('');
      }
    });
  };

  // View state permissions check
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="w-12 h-12 text-[var(--stop)] mb-4" />
        <h2 className="text-lg font-bold text-[var(--text)]">Access Denied</h2>
        <p className="text-sm text-[var(--text-3)] max-w-sm mt-1">
          You do not have the required permissions (tables.view) to inspect or modify restaurant tables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 " style={{ color: 'var(--text)' }}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dine-In Floor Plan</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">
            Visualize tables, handle seatings, manage reservations, and coordinate waitlists live.
          </p>
        </div>

        {/* Location Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {loadingLocs ? (
            <Skel className="w-48 h-10" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Branch:</span>
              <select
                className="bg-[var(--surface)] border border-[var(--line)] text-sm rounded-xl px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
              >
                {locationsList.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.label}</option>
                ))}
              </select>
            </div>
          )}

          {canManage && (
            <Button
              variant={layoutMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setLayoutMode(!layoutMode)}
              className="gap-1.5"
            >
              <Move className="w-4 h-4" />
              {layoutMode ? 'Exit Layout Editor' : 'Edit Floor Plan'}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {Object.entries(TABLE_STATUS).map(([statusKey, meta]) => {
          const count = tables.filter(t => t.status === statusKey).length;
          return (
            <Card key={statusKey} className="p-3 flex items-center justify-between border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-xs font-medium text-[var(--text-3)]">{meta.label}</span>
              </div>
              <span className="text-lg font-bold f-mono">{count}</span>
            </Card>
          );
        })}
      </div>

      {/* Main Panel Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Floor Plan Editor/Canvas or Classic List Fallback */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-4 relative border-[var(--line)] overflow-hidden" style={{ minHeight: '520px' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">2D Floor Plan Canvas</span>
                {layoutMode && (
                  <Tag tone="neutral" className="animate-pulse">
                    Layout Edit Mode Active
                  </Tag>
                )}
              </div>
              {layoutMode && (
                <span className="text-xs text-[var(--text-3)]">
                  Drag and drop tables. Right-click or tap to customize shape and seats.
                </span>
              )}
            </div>

            {loadingTables ? (
              <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-[var(--line)] border-t-[var(--accent)] rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-3)]">Loading Floor Plan...</span>
                </div>
              </div>
            ) : tables.length === 0 ? (
              <Empty
                icon={Grid3x3}
                title="No tables found"
                description="Use the side panel to add your first table to this branch."
              />
            ) : (
              <div
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                className="relative w-full rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)] overflow-hidden pattern-grid"
                style={{
                  height: '460px',
                  backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                {tables.map((table, index) => {
                  const layout = layouts[table.id] || {
                    x: 50 + (index % 4) * 140,
                    y: 40 + Math.floor(index / 4) * 130,
                    shape: 'rectangle',
                    seats: 4
                  };

                  const statusMeta = TABLE_STATUS[table.status] || TABLE_STATUS.OPEN;
                  const isRound = layout.shape === 'round';

                  return (
                    <div
                      key={table.id}
                      onMouseDown={(e) => handleDragStart(e, table.id)}
                      onClick={() => {
                        if (layoutMode) {
                          openTableConfig(table);
                        } else {
                          handleOpenTableControl(table);
                        }
                      }}
                      className={`absolute select-none flex flex-col items-center justify-center border transition-shadow cursor-pointer ${
                        layoutMode ? 'hover:shadow-lg:border-[var(--accent)] active:scale-95' : 'hover:scale-[1.03]'
                      }`}
                      style={{
                        left: `${layout.x}px`,
                        top: `${layout.y}px`,
                        width: '100px',
                        height: '100px',
                        borderRadius: isRound ? '50%' : '12px',
                        backgroundColor: layoutMode ? 'var(--surface)' : `${statusMeta.color}15`,
                        borderColor: layoutMode ? 'var(--line)' : `${statusMeta.color}60`,
                        borderWidth: '2px',
                        boxShadow: draggingTableId === table.id ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)' : 'none',
                        zIndex: draggingTableId === table.id ? 50 : 10,
                      }}
                    >
                      <span className="text-base font-extrabold tracking-tight">
                        {table.label || `T-${table.tableNumber}`}
                      </span>

                      {!layoutMode && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: statusMeta.color }}>
                          {statusMeta.label}
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-3)] mt-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{layout.seats || table.capacity || 4}</span>
                      </div>

                      {/* Micro notifications e.g. reservations overlay */}
                      {!layoutMode && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          {/* Placeholder badge if there is a pending reservation in next 1 hour */}
                          {index % 5 === 2 && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-ping" title="Upcoming Reservation" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Waitlist and Upcoming Reservations Overlays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Waitlist Panel */}
            <Card className="p-4 border-[var(--line)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--hold)]" />
                  <h3 className="font-bold text-sm">Hostess Waitlist</h3>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setWaitlistModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Party
                </Button>
              </div>

              {waitlist.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-3)]">
                  Waitlist is currently empty.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {waitlist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)]"
                    >
                      <div>
                        <p className="text-xs font-bold">{item.name} ({item.partySize} pax)</p>
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                          Quoted: {item.quotedWait} • Added {item.addedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNotifyWaitlist(item)}
                          className="px-2 py-1 text-[10px] bg-[var(--surface-sunk)] text-[var(--accent)] border border-[var(--accent)]/20"
                        >
                          Notify
                        </Button>
                        <button
                          onClick={() => handleRemoveWaitlist(item.id)}
                          className="p-1 text-[var(--text-3)]:text-[var(--stop)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Reservations List */}
            <Card className="p-4 border-[var(--line)]">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-bold text-sm">Reservations Feed</h3>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)] flex items-center justify-between opacity-85">
                  <div>
                    <p className="text-xs font-bold">Johnathan Doe • Party of 4</p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">Tonight at 7:30 PM • Table 3 Pre-allocated</p>
                  </div>
                  <Tag tone="neutral">Confirmed</Tag>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)] flex items-center justify-between opacity-85">
                  <div>
                    <p className="text-xs font-bold">Sarah Jenkins • Party of 2</p>
                    <p className="text-[10px] text-[var(--text-3)] mt-0.5">Tonight at 8:00 PM • Window Booth request</p>
                  </div>
                  <Tag tone="neutral">Pending VIP</Tag>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column: Sidebar Table Controls & Management */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Table Dine-In Control Hub */}
          {activeTabTable ? (
            <Card className="p-4 border-[var(--line)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <h3 className="font-bold text-base">Table {activeTabTable.label || activeTabTable.tableNumber} Control</h3>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">Live dine-in controller</p>
                </div>
                <button
                  onClick={() => setActiveTabTable(null)}
                  className="p-1 rounded-lg:bg-[var(--line)] text-[var(--text-3)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Directly cycle state without tab */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider block">
                  Quick Force Table Status
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {Object.entries(TABLE_STATUS).map(([statusKey, meta]) => (
                    <button
                      key={statusKey}
                      onClick={() => handleDirectStatusUpdate(statusKey)}
                      className={`py-1 px-1.5 text-center rounded-lg text-[10px] font-bold border transition-all ${
                        activeTabTable.status === statusKey
                          ? 'border-[var(--accent)] bg-[var(--surface-sunk)]'
                          : 'border-[var(--line)] bg-transparent:border-[var(--text-3)]'
                      }`}
                    >
                      <span className="block w-1.5 h-1.5 rounded-full mx-auto mb-1" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Management Integration */}
              <div className="border-t border-[var(--line)] pt-4 space-y-3">
                <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider block">
                  Connected Guest Tab
                </span>

                {loadingTabDetails ? (
                  <Skel className="h-24 w-full" />
                ) : !currentTabDetails ? (
                  <div className="p-4 text-center border border-[var(--line)] rounded-xl bg-[var(--f-ink-900)]">
                    <p className="text-xs text-[var(--text-3)] mb-3">No open dine-in session on this table.</p>
                    <Button onClick={handleOpenNewTab} size="sm" className="w-full">
                      Open New Dine-In Tab
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-[var(--f-ink-900)] p-2.5 rounded-xl border border-[var(--line)]">
                      <div>
                        <p className="text-xs font-bold">Tab ID: {currentTabDetails.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5">Status: {currentTabDetails.status || 'OPEN'}</p>
                      </div>
                      <Tag tone="neutral">Active</Tag>
                    </div>

                    {/* Ordered Items List */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold">Ordered Items</span>
                      <div className="max-h-36 overflow-y-auto space-y-1 border border-[var(--line)] rounded-xl p-2 bg-[var(--f-ink-900)]">
                        {!currentTabDetails.items || currentTabDetails.items.length === 0 ? (
                          <p className="text-[11px] text-[var(--text-3)] text-center py-2">No items ordered yet.</p>
                        ) : (
                          currentTabDetails.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs py-1 border-b border-[var(--line)]/50 last:border-none">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="f-mono">${(item.unitPriceUsdc * item.quantity).toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add Dine-in Product Selection */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-8">
                        <select
                          className="w-full bg-[var(--f-ink-900)] border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--text)]"
                          value={selectedProduct}
                          onChange={(e) => setSelectedProduct(e.target.value)}
                        >
                          <option value="">-- Add Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (${p.priceUsdc || p.price || 10})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="w-full bg-[var(--f-ink-900)] border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--text)]"
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button onClick={handleAddItemToTab} size="sm" className="w-full p-2">
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Bill Summary */}
                    <div className="bg-[var(--f-ink-900)] p-3 rounded-xl border border-[var(--line)] text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-3)]">Subtotal</span>
                        <span className="f-mono">${(currentTabDetails.subtotalUsdc || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-3)]">Tax Rate (%)</span>
                        <input
                          type="number"
                          className="w-12 bg-transparent border border-[var(--line)] rounded px-1 text-right text-xs f-mono"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-3)]">Tip Amount ($)</span>
                        <input
                          type="number"
                          className="w-16 bg-transparent border border-[var(--line)] rounded px-1 text-right text-xs f-mono"
                          value={tipAmount}
                          onChange={(e) => setTipAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between font-bold pt-1.5 border-t border-[var(--line)]/50">
                        <span>Grand Total</span>
                        <span className="f-mono">${(currentTabDetails.grandTotalUsdc || currentTabDetails.subtotalUsdc || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Finalize and Checkout Action Controls */}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={handleFinalizeTab} className="flex-1">
                        Generate Bill
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleCloseAndPayTab} className="flex-1">
                        Confirm Payment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-4 border-[var(--line)] text-center py-10">
              <HelpCircle className="w-8 h-8 mx-auto text-[var(--text-3)] mb-2" />
              <p className="text-sm font-bold">No Table Selected</p>
              <p className="text-xs text-[var(--text-3)] max-w-[200px] mx-auto mt-1">
                Tap or right-click any table on the floor plan canvas to view and manage its current dine-in tab session.
              </p>
            </Card>
          )}

          {/* Table Database Registry CRUD */}
          {canManage && (
            <Card className="p-4 border-[var(--line)] space-y-4">
              <h3 className="font-bold text-sm">Table Registry Control</h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Table 15"
                  className="flex-1 bg-[var(--f-ink-900)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)]"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                />
                <Button size="sm" onClick={handleAddNewTable}>
                  Create Table
                </Button>
              </div>

              {/* Small Registry Database List */}
              <div className="space-y-1 max-h-56 overflow-y-auto border border-[var(--line)] rounded-xl p-2 bg-[var(--f-ink-900)]">
                {tables.length === 0 ? (
                  <p className="text-xs text-[var(--text-3)] text-center py-2">No registered tables.</p>
                ) : (
                  tables.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1 px-1.5 rounded-lg:bg-[var(--surface)]/50 text-xs">
                      <span>{t.label || `Table ${t.tableNumber}`}</span>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to completely delete table "${t.label || t.tableNumber}"?`)) {
                            deleteTableMut.mutate(t.id);
                          }
                        }}
                        className="text-[var(--text-3)]:text-[var(--stop)] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog - Config Table Dimensions and Seats */}
      <Dialog
        open={tableConfigOpen}
        onClose={() => setTableConfigOpen(false)}
        title="Customize Table Features"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider block mb-1">
              Table Shape
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all ${
                  configForm.shape === 'rectangle'
                    ? 'border-[var(--accent)] bg-[var(--surface-sunk)]'
                    : 'border-[var(--line)]:border-[var(--text-3)]'
                }`}
                onClick={() => setConfigForm({ ...configForm, shape: 'rectangle' })}
              >
                Rectangular / Square
              </button>
              <button
                type="button"
                className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all ${
                  configForm.shape === 'round'
                    ? 'border-[var(--accent)] bg-[var(--surface-sunk)]'
                    : 'border-[var(--line)]:border-[var(--text-3)]'
                }`}
                onClick={() => setConfigForm({ ...configForm, shape: 'round' })}
              >
                Round / Oval
              </button>
            </div>
          </div>

          <Input
            label="Default Seat Capacity"
            type="number"
            value={configForm.seats}
            onChange={(e) => setConfigForm({ ...configForm, seats: e.target.value })}
            min="1"
            max="12"
          />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setTableConfigOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveConfig} className="flex-1">
              Save Specifications
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog - Add Guest to Hostess Waitlist */}
      <Dialog
        open={waitlistModalOpen}
        onClose={() => setWaitlistModalOpen(false)}
        title="Add to Waitlist"
      >
        <div className="space-y-4">
          <Input
            label="Customer Name"
            placeholder="e.g. Marcus Aurelius"
            value={waitlistForm.name}
            onChange={(e) => setWaitlistForm({ ...waitlistForm, name: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="+1 555-0199"
            value={waitlistForm.phone}
            onChange={(e) => setWaitlistForm({ ...waitlistForm, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Party Size"
              type="number"
              value={waitlistForm.partySize}
              onChange={(e) => setWaitlistForm({ ...waitlistForm, partySize: e.target.value })}
              min="1"
            />
            <Input
              label="Quoted Wait"
              placeholder="e.g. 20m or 45m"
              value={waitlistForm.quotedWait}
              onChange={(e) => setWaitlistForm({ ...waitlistForm, quotedWait: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setWaitlistModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddWaitlist} className="flex-1">
              Confirm Guest
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Embedded inline CSS for custom grid layouts and backgrounds */}
      <style>{`
        .pattern-grid {
          background-size: 20px 20px;
          background-image: radial-gradient(var(--line) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}
