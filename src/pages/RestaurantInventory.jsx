import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../lib/marketplaceApi';
import { products as productsApi } from '../lib/api';
import { usePermission } from '../hooks/usePermission';
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
  Progress,
  Tooltip
} from '@/components/instrument';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  Edit2,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
  AlertCircle,
  Truck,
  FileText,
  Eye,
  Check,
  X
} from 'lucide-react';
import { toast } from '@/lib/toast';

// Custom Stocks level bar
function StockBar({ current, minimum }) {
  const safeMin = parseFloat(minimum) || 0;
  const safeCur = parseFloat(current) || 0;
  const pct = safeMin > 0 ? Math.min(100, (safeCur / (safeMin * 3)) * 100) : safeCur > 0 ? 100 : 0;
  const color = safeCur <= 0
    ? 'var(--stop)'
    : safeCur <= safeMin
      ? 'var(--hold)'
      : 'var(--go)';
  return (
    <Progress
      value={pct}
      className="h-2 rounded-full bg-[var(--line)] overflow-hidden"
      style={{ '--progress-color': color }}
    />
  );
}

const CATEGORIES = ['All', 'Proteins', 'Vegetables', 'Dry Goods', 'Beverages', 'Dairy', 'Spices', 'Other'];

export default function RestaurantInventory() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('inventory.manage');
  const canView = hasPermission('inventory.view') || canManage;

  const [activeTab, setActiveTab] = useState('stock');
  const [filterCat, setFilterCat] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [linkForm, setLinkForm] = useState({ inventoryItemId: '', quantityRequired: '' });

  // Form states for Create/Edit
  const [form, setForm] = useState({
    name: '',
    unit: 'kg',
    currentStock: '',
    minimumStock: '',
    costPerUnit: '',
    category: 'Proteins',
    supplier: '',
  });

  // Fetch Inventory items
  const { data: inventoryData, isLoading: invLoading, error: invError } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await inventoryApi.list();
      return res?.data?.items || res?.items || [];
    },
    enabled: canView,
  });

  // Fetch recipes (product linked ingredients)
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await inventoryApi.recipes();
      return res?.data?.products || res?.products || [];
    },
    enabled: canView,
  });

  // Fetch full products list (to link to recipes)
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await productsApi.list({ limit: 100 });
      return res?.products || res?.data || [];
    },
    enabled: canView && activeTab === 'recipes',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => inventoryApi.create(data),
    onSuccess: () => {
      toast.go('Inventory item created successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to create item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryApi.update(id, data),
    onSuccess: () => {
      toast.go('Inventory item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setEditingItem(null);
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to update item');
    },
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, qty }) => inventoryApi.restock(id, parseFloat(qty)),
    onSuccess: (data, variables) => {
      const updatedItem = inventoryData?.find(i => i.id === variables.id);
      const name = updatedItem?.name || 'Item';
      const unit = updatedItem?.unit || '';
      toast.go(`Restocked ${variables.qty} ${unit} of ${name}`, {
        description: `Current Stock updated. Log summary: Restock of ${variables.qty} completed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setRestockItem(null);
      setRestockQty('');
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to restock item');
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ productId, data }) => inventoryApi.linkIngredient(productId, data),
    onSuccess: () => {
      toast.go('Ingredient linked to recipe');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setLinkForm({ inventoryItemId: '', quantityRequired: '' });
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to link ingredient');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ productId, itemId }) => inventoryApi.unlinkIngredient(productId, itemId),
    onSuccess: () => {
      toast.go('Ingredient unlinked from recipe');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (err) => {
      toast.stop(err.message || 'Failed to unlink ingredient');
    },
  });

  // Auto-deduction direct simulator (as requested: "surface a toast/log so staff can see, and flag any item that would go negative with 86 item quick action")
  const deductMutation = useMutation({
    mutationFn: (orderId) => inventoryApi.deductForOrder(orderId),
    onSuccess: (res) => {
      toast.go(`Inventory deducted for order successfully!`, {
        description: 'Auto-deduction completed. Checked all recipe requirements against real-time stock levels.',
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => {
      toast.stop(`Auto-deduction warning: ${err.message}`);
    },
  });

  // "86 this item" quick action - set item stock to 0 or flag it as out of stock/inactive
  const quick86Mutation = useMutation({
    mutationFn: (item) => inventoryApi.update(item.id, { currentStock: 0 }),
    onSuccess: (data, variables) => {
      toast.warning(`"${variables.name}" has been marked out of stock (86'd)`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => {
      toast.stop(`Failed to 86 item: ${err.message}`);
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      unit: 'kg',
      currentStock: '',
      minimumStock: '',
      costPerUnit: '',
      category: 'Proteins',
      supplier: '',
    });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.unit || form.currentStock === '' || form.costPerUnit === '') {
      toast.stop('Please fill in all required fields');
      return;
    }
    createMutation.mutate({
      ...form,
      currentStock: parseFloat(form.currentStock),
      minimumStock: parseFloat(form.minimumStock) || 0,
      costPerUnit: parseFloat(form.costPerUnit),
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingItem.name || !editingItem.unit || editingItem.currentStock === '' || editingItem.costPerUnit === '') {
      toast.stop('Please fill in all required fields');
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        name: editingItem.name,
        unit: editingItem.unit,
        currentStock: parseFloat(editingItem.currentStock),
        minimumStock: parseFloat(editingItem.minimumStock) || 0,
        costPerUnit: parseFloat(editingItem.costPerUnit),
        category: editingItem.category,
        supplier: editingItem.supplier,
      },
    });
  };

  const handleRestockSubmit = (e) => {
    e.preventDefault();
    if (!restockQty || parseFloat(restockQty) <= 0) {
      toast.stop('Please enter a valid quantity');
      return;
    }
    restockMutation.mutate({ id: restockItem.id, qty: restockQty });
  };

  const handleLinkSubmit = (productId) => {
    if (!linkForm.inventoryItemId || !linkForm.quantityRequired || parseFloat(linkForm.quantityRequired) <= 0) {
      toast.stop('Please select an ingredient and enter a valid quantity');
      return;
    }
    linkMutation.mutate({
      productId,
      data: {
        inventoryItemId: linkForm.inventoryItemId,
        quantityRequired: parseFloat(linkForm.quantityRequired),
      },
    });
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[var(--f-bg)]">
        <AlertCircle className="w-12 h-12 text-[var(--stop)] mb-4" />
        <h2 className="text-lg font-bold text-[var(--text)]">Permission Denied</h2>
        <p className="text-sm text-[var(--text-3)] mt-1">You do not have permission to view or manage the restaurant inventory.</p>
      </div>
    );
  }

  // Calculate items and metrics
  const itemsList = inventoryData || [];
  const lowStockItems = itemsList.filter(item => {
    const cur = parseFloat(item.currentStock) || 0;
    const min = parseFloat(item.minimumStock) || 0;
    return cur <= min;
  });

  const outOfStockItems = itemsList.filter(item => (parseFloat(item.currentStock) || 0) <= 0);

  const filteredItems = filterCat === 'All'
    ? itemsList
    : itemsList.filter(item => item.category?.toLowerCase() === filterCat.toLowerCase());

  // Grouped by Category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalValueGhs = itemsList.reduce((sum, item) => {
    const stock = parseFloat(item.currentStock) || 0;
    const cost = parseFloat(item.costPerUnit) || 0;
    return sum + (stock * cost);
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 text-[var(--text)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
            <Package className="w-6 h-6 text-[var(--accent)]" />
            Restaurant Inventory & Recipe Manager
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            Manage ingredient stock levels, cost sheets, and link ingredients directly to product menus.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            {import.meta.env.DEV && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const dummyOrder = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
                deductMutation.mutate(dummyOrder);
              }}
              className="flex items-center gap-1.5 border-[var(--line)]:border-[var(--accent)] text-xs text-[var(--text-3)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Test Deduct Order
            </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Inventory Item
            </Button>
          </div>
        )}
      </div>

      {/* Low Stock Highlight Alert Panel */}
      {lowStockItems.length > 0 && (
        <Card className="border-[var(--stop)] bg-[rgba(239,68,68,0.03)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[var(--stop)] font-semibold">
            <AlertTriangle className="w-5 h-5" />
            <span>CRITICAL ALERT: {lowStockItems.length} Low Stock Ingredients detected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lowStockItems.map(item => {
              const isOut = parseFloat(item.currentStock) <= 0;
              return (
                <div
                  key={item.id}
                  className="bg-[var(--f-ink-900)] border border-[var(--line)] p-3 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{item.name}</span>
                      <Tag color={isOut ? 'var(--stop)' : 'var(--hold)'}>
                        {isOut ? '86 Needed' : 'Low'}
                      </Tag>
                    </div>
                    <p className="text-xs text-[var(--text-3)]">
                      Current: <strong className="text-[var(--text)]">{item.currentStock} {item.unit}</strong> (Min: {item.minimumStock})
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <button
                        onClick={() => {
                          setRestockItem(item);
                          setRestockQty('');
                        }}
                        className="flex-1 bg-[var(--accent)]:bg-[#00c870] text-[var(--f-ink-900)] text-xs font-semibold py-1 rounded-lg transition-colors"
                      >
                        Restock
                      </button>
                      <button
                        onClick={() => quick86Mutation.mutate(item)}
                        className="px-2 py-1 bg-[rgba(239,68,68,0.1)]:bg-[var(--stop)] text-[var(--stop)]:text-[var(--text)] rounded-lg text-xs font-semibold transition-colors border border-[rgba(239,68,68,0.2)]"
                        title="Mark item out of stock (86 menu)"
                      >
                        86 Item
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main KPI Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 bg-[var(--surface)] p-4 border border-[var(--line)]">
          <div className="p-3 bg-[var(--line)] rounded-xl text-[var(--accent)]">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">Total Ingredients</p>
            <p className="text-xl font-bold f-mono mt-0.5">{itemsList.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[var(--surface)] p-4 border border-[var(--line)]">
          <div className="p-3 bg-[rgba(245,158,11,0.1)] rounded-xl text-[var(--hold)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">Low Stock Items</p>
            <p className="text-xl font-bold f-mono mt-0.5 text-[var(--hold)]">{lowStockItems.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[var(--surface)] p-4 border border-[var(--line)]">
          <div className="p-3 bg-[rgba(239,68,68,0.1)] rounded-xl text-[var(--stop)]">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">Out of Stock</p>
            <p className="text-xl font-bold f-mono mt-0.5 text-[var(--stop)]">{outOfStockItems.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[var(--surface)] p-4 border border-[var(--line)]">
          <div className="p-3 bg-[rgba(16,185,129,0.1)] rounded-xl text-[var(--go)]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">Total Assets Value</p>
            <p className="text-xl font-bold f-mono mt-0.5 text-[var(--go)]">GHS {totalValueGhs.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-px">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'stock'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-3)]:text-[var(--text)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Stock Levels & Ledger
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'recipes'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-3)]:text-[var(--text)]'
            }`}
          >
            <Scale className="w-4 h-4" />
            Recipe Cost Matrices
          </button>
        </div>
      </div>

      {/* Tab content: Stock Levels */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Categories select list */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  filterCat === cat
                    ? 'bg-[var(--accent)] text-[var(--f-ink-900)] border-[var(--accent)] font-bold'
                    : 'bg-[var(--surface)] text-[var(--text-3)] border-[var(--line)]:text-[var(--text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {invLoading ? (
            <div className="space-y-3">
              <Skel className="h-16 w-full" />
              <Skel className="h-16 w-full" />
              <Skel className="h-16 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Empty
              icon={Package}
              title="No ingredients found"
              description="No stock items matched the category filter or none have been created yet."
            />
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedItems).map(category => (
                <div key={category} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] border-l-2 border-[var(--accent)] pl-2">
                    {category} ({groupedItems[category].length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {groupedItems[category].map(item => {
                      const cur = parseFloat(item.currentStock) || 0;
                      const min = parseFloat(item.minimumStock) || 0;
                      const isLow = cur <= min;
                      const isOut = cur <= 0;

                      return (
                        <Card
                          key={item.id}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--surface)] p-4:border-[var(--accent)]/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-base text-[var(--text)] truncate">{item.name}</h4>
                              <Tag color={isOut ? 'var(--stop)' : isLow ? 'var(--hold)' : 'var(--go)'}>
                                {isOut ? 'OUT' : isLow ? 'LOW' : 'IN STOCK'}
                              </Tag>
                              {item.supplier && (
                                <span className="text-[10px] bg-[var(--line)] text-[var(--text-3)] px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  {item.supplier}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs text-[var(--text-3)]">
                              <div>
                                Cost per unit: <strong className="text-[var(--text)]">GHS {parseFloat(item.costPerUnit || 0).toFixed(2)} / {item.unit}</strong>
                              </div>
                              <div>
                                Supplier: <span className="text-[var(--text)] font-semibold">{item.supplier || 'N/A'}</span>
                              </div>
                              <div>
                                Total Value: <strong className="text-[var(--text)]">GHS {(cur * parseFloat(item.costPerUnit || 0)).toFixed(2)}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar info */}
                          <div className="w-full md:w-48">
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>{cur} {item.unit}</span>
                              <span className="text-[var(--text-3)]">min: {min} {item.unit}</span>
                            </div>
                            <StockBar current={cur} minimum={min} />
                          </div>

                          {/* Actions */}
                          {canManage && (
                            <div className="flex items-center gap-2 self-end md:self-auto">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setRestockItem(item);
                                  setRestockQty('');
                                }}
                                className="flex items-center gap-1 border-[var(--line)] text-xs h-9"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restock
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingItem(item)}
                                className="flex items-center gap-1 border-[var(--line)] text-xs h-9"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab content: Recipe Costs */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Middle side: Product List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-[var(--text)]">Restaurant Products Catalog</h3>
            {recipesLoading ? (
              <div className="space-y-3">
                <Skel className="h-16 w-full" />
                <Skel className="h-16 w-full" />
              </div>
            ) : (recipesData || []).length === 0 ? (
              <Empty
                icon={Scale}
                title="No recipes found"
                description="Make sure menu products exist in the store catalog to configure recipes."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {(recipesData || []).map(product => {
                  const ingredients = product.recipeIngredients || product.ingredients || [];
                  const sellingPrice = parseFloat(product.priceUsdc) || 0;
                  const totalCost = parseFloat(product.totalCostGhs) || 0;
                  const marginPct = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

                  return (
                    <Card
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`cursor-pointer transition-all border p-4 ${
                        selectedProduct?.id === product.id
                          ? 'border-[var(--accent)] bg-[rgba(168,85,247,0.02)]'
                          : 'bg-[var(--surface)] border-[var(--line)]:border-[var(--accent)]/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base text-[var(--text)]">{product.name}</h4>
                            <span className="text-[10px] bg-[var(--line)] text-[var(--text-3)] px-1.5 py-0.5 rounded font-mono">
                              ID: {product.id}
                            </span>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs">
                            <span className="text-[var(--text-3)]">
                              Sells: <strong className="text-[var(--text)]">GHS {sellingPrice.toFixed(2)}</strong>
                            </span>
                            <span className="text-[var(--text-3)]">
                              Cost: <strong className="text-[var(--text)]">GHS {totalCost.toFixed(2)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Cost analysis badge */}
                        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                          <span className="text-xs text-[var(--text-3)] uppercase tracking-wider font-semibold">Margin</span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                            marginPct <= 20
                              ? 'bg-[rgba(239,68,68,0.1)] text-[var(--stop)]'
                              : marginPct <= 45
                                ? 'bg-[rgba(245,158,11,0.1)] text-[var(--hold)]'
                                : 'bg-[rgba(16,185,129,0.1)] text-[var(--go)]'
                          }`}>
                            {marginPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Ingredients inside product summary */}
                      <div className="mt-4 pt-3 border-t border-[var(--line)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[var(--text-3)] flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            Ingredients Linked ({ingredients.length})
                          </span>
                        </div>
                        {ingredients.length === 0 ? (
                          <p className="text-xs text-[var(--text-3)] italic">No recipe elements configured yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {ingredients.map(ing => (
                              <Tag key={ing.inventoryItemId || ing.id} color="var(--accent)">
                                {ing.inventoryItemName || ing.name}: {ing.quantityRequired || ing.quantity}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right side: Detailed recipe inspector & linkages editor */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-1">
              <Scale className="w-5 h-5 text-[var(--accent)]" />
              Recipe Cost Sheet Details
            </h3>

            {selectedProduct ? (
              <Card className="bg-[var(--surface)] border-[var(--accent)] p-5 space-y-4 sticky top-4">
                <div className="flex items-start justify-between border-b border-[var(--line)] pb-3">
                  <div>
                    <h4 className="font-bold text-lg text-[var(--text)]">{selectedProduct.name}</h4>
                    <span className="text-xs text-[var(--text-3)] font-mono">Product ID: {selectedProduct.id}</span>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-1.5:bg-[var(--line)] rounded-lg text-[var(--text-3)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtotals & calculations */}
                <div className="grid grid-cols-2 gap-3 bg-[var(--f-ink-900)] p-3 rounded-xl border border-[var(--line)] text-center">
                  <div>
                    <span className="text-xs text-[var(--text-3)]">Selling Price</span>
                    <p className="text-base font-bold text-[var(--text)] mt-0.5">
                      GHS {parseFloat(selectedProduct.priceUsdc || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--text-3)]">Ingredient Cost</span>
                    <p className="text-base font-bold text-[var(--accent)] mt-0.5">
                      GHS {parseFloat(selectedProduct.totalCostGhs || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Ingredients List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                    Linked Ingredients & Quantity
                  </span>

                  {(selectedProduct.recipeIngredients || selectedProduct.ingredients || []).length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-[var(--line)] rounded-xl">
                      <p className="text-xs text-[var(--text-3)]">No ingredients linked yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--line)] bg-[var(--f-ink-900)] rounded-xl border border-[var(--line)] overflow-hidden">
                      {(selectedProduct.recipeIngredients || selectedProduct.ingredients || []).map(ing => {
                        const itemCost = parseFloat(ing.costPerUnit || ing.cost) || 0;
                        const qty = parseFloat(ing.quantityRequired || ing.quantity) || 0;
                        const lineCost = qty * itemCost;

                        return (
                          <div key={ing.inventoryItemId || ing.id} className="p-3 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-[var(--text)]">{ing.inventoryItemName || ing.name}</p>
                              <p className="text-[10px] text-[var(--text-3)]">
                                {qty} {ing.unit} x GHS {itemCost.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-[var(--text)]">GHS {lineCost.toFixed(2)}</span>
                              {canManage && (
                                <button
                                  onClick={() => unlinkMutation.mutate({
                                    productId: selectedProduct.id,
                                    itemId: ing.inventoryItemId || ing.id
                                  })}
                                  className="text-[var(--stop)]:bg-[rgba(239,68,68,0.1)] p-1.5 rounded-lg transition-colors"
                                  title="Unlink ingredient"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Form to link new ingredient */}
                {canManage && (
                  <div className="border-t border-[var(--line)] pt-4 space-y-3">
                    <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                      Link Ingredient
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={linkForm.inventoryItemId}
                        onChange={(e) => setLinkForm({ ...linkForm, inventoryItemId: e.target.value })}
                        options={[
                          { value: '', label: 'Select ingredient' },
                          ...(inventoryData || []).map(item => ({
                            value: item.id,
                            label: `${item.name} (${item.unit})`
                          }))
                        ]}
                      />
                      <Input
                        type="number"
                        step="any"
                        placeholder="Qty required"
                        value={linkForm.quantityRequired}
                        onChange={(e) => setLinkForm({ ...linkForm, quantityRequired: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleLinkSubmit(selectedProduct.id)}
                      className="w-full h-10 mt-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Recipe
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-8 text-center border-dashed border-[var(--line)]">
                <p className="text-sm text-[var(--text-3)]">
                  Select a product from the catalog on the left to edit and inspect its recipe cost sheet, link ingredients and verify profit margins.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS SECTION --- */}

      {/* Create Inventory Item Modal */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Inventory Item">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Ingredient Name *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Tomatoes, Chicken breast, Vegetable oil"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category *"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORIES.filter(c => c !== 'All').map(c => ({ value: c, label: c }))}
            />
            <Select
              label="Stock Unit *"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'liters', label: 'Liters' },
                { value: 'pieces', label: 'Pieces' },
                { value: 'grams', label: 'Grams (g)' },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              type="number"
              step="any"
              label="Current Stock *"
              required
              value={form.currentStock}
              onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
              placeholder="e.g. 50"
            />
            <Input
              type="number"
              step="any"
              label="Min Stock *"
              value={form.minimumStock}
              onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
              placeholder="e.g. 10"
            />
            <Input
              type="number"
              step="any"
              label="Cost/Unit (GHS) *"
              required
              value={form.costPerUnit}
              onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
              placeholder="e.g. 120"
            />
          </div>
          <Input
            label="Supplier"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            placeholder="e.g. Accra Central Wholesale Foods"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Item
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Inventory Item Modal */}
      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Inventory Item">
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="Ingredient Name *"
              required
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category *"
                value={editingItem.category || 'Proteins'}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                options={CATEGORIES.filter(c => c !== 'All').map(c => ({ value: c, label: c }))}
              />
              <Select
                label="Stock Unit *"
                value={editingItem.unit}
                onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                options={[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'liters', label: 'Liters' },
                  { value: 'pieces', label: 'Pieces' },
                  { value: 'grams', label: 'Grams (g)' },
                ]}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                step="any"
                label="Current Stock *"
                required
                value={editingItem.currentStock}
                onChange={(e) => setEditingItem({ ...editingItem, currentStock: e.target.value })}
              />
              <Input
                type="number"
                step="any"
                label="Min Stock *"
                value={editingItem.minimumStock}
                onChange={(e) => setEditingItem({ ...editingItem, minimumStock: e.target.value })}
              />
              <Input
                type="number"
                step="any"
                label="Cost/Unit (GHS) *"
                required
                value={editingItem.costPerUnit}
                onChange={(e) => setEditingItem({ ...editingItem, costPerUnit: e.target.value })}
              />
            </div>
            <Input
              label="Supplier"
              value={editingItem.supplier || ''}
              onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="secondary" type="button" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Restock Modal */}
      <Dialog open={!!restockItem} onClose={() => setRestockItem(null)} title="Quick Restock">
        {restockItem && (
          <form onSubmit={handleRestockSubmit} className="space-y-4">
            <div className="p-3 bg-[var(--f-ink-900)] rounded-xl border border-[var(--line)]">
              <p className="text-xs text-[var(--text-3)] font-semibold uppercase tracking-wider">Item Details</p>
              <p className="text-base font-bold text-[var(--text)] mt-1">{restockItem.name}</p>
              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                <div>
                  Current Stock: <strong className="text-[var(--text)]">{restockItem.currentStock} {restockItem.unit}</strong>
                </div>
                <div>
                  Unit Cost: <strong className="text-[var(--text)]">GHS {parseFloat(restockItem.costPerUnit || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>
            <Input
              type="number"
              step="any"
              label={`Restock Quantity (${restockItem.unit}) *`}
              required
              autoFocus
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              placeholder="e.g. 25"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button variant="secondary" type="button" onClick={() => setRestockItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Complete Restock
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
