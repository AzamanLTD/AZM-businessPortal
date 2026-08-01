import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { products as productsApi, request, locations as locationsApi } from '@/lib/api';
import { restaurantOpsApi, inventoryApi } from '@/lib/marketplaceApi';
import { usePermission } from '@/hooks/usePermission';
import {
  Card,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  Empty,
  Skeleton,
  Modal,
  Switch
} from '@/components/ui';
import { fmtUSDC, fmt } from '@/lib/utils';
import {
  Package,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  X,
  Loader2,
  FolderPlus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Percent,
  Clock,
  Layers,
  Sparkles,
  Link2,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadImageToCloudinary, isCloudinaryConfigured, validateImageFile } from '@/lib/cloudinary';

// Pre-defined food tags for quick chips
const DIETARY_TAGS = [
  { value: 'SPICY', label: 'Spicy 🌶️' },
  { value: 'VEGAN', label: 'Vegan 🌱' },
  { value: 'GLUTEN_FREE', label: 'Gluten-Free 🌾' },
  { value: 'POPULAR', label: 'Popular 🔥' },
  { value: 'NEW', label: 'New ✨' },
];

const CATEGORIES = [
  { value: 'FOOD_BEVERAGE',      label: 'Food & Beverage' },
  { value: 'FREELANCE_SERVICES', label: 'Freelance Services' },
  { value: 'RETAIL',             label: 'Retail' },
  { value: 'TECHNOLOGY',         label: 'Technology' },
  { value: 'REAL_ESTATE',        label: 'Real Estate' },
  { value: 'EDUCATION',          label: 'Education' },
  { value: 'HEALTH_WELLNESS',    label: 'Health & Wellness' },
  { value: 'ENTERTAINMENT',      label: 'Entertainment' },
  { value: 'LOGISTICS',          label: 'Logistics' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'OTHER',              label: 'Other' },
];

// Blank layouts for form operations
const BLANK_PRODUCT = {
  name: '',
  description: '',
  priceUsdc: '',
  category: 'FOOD_BEVERAGE',
  imageUrls: [],
  isActive: true,
  slug: '',
  locationId: '',
  deliveryTerms: '',
  estimatedDelivery: '',
  catalogSectionId: '',
  isAvailable: true,
  preparationMins: '',
  tags: [],
  calorieCount: '',
  variants: [], // UI representation as array of rows
  modifierGroups: [], // UI representation as array of groups
};

const BLANK_SECTION = {
  name: '',
  description: '',
  displayOrder: 0,
  availableFrom: '',
  availableTo: '',
  imageUrl: '',
  isActive: true,
  locationId: '',
};

const MAX_IMAGES = 5;

export default function Products() {
  const qc = useQueryClient();
  
  // Permissions gating
  const { hasPermission } = usePermission();
  const canManageProducts = hasPermission('products.manage');
  const canManageInventory = hasPermission('inventory.manage');

  // Filter States
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Modals & Forms State
  const [productModal, setProductModal] = useState(null); // null | 'create' | product_obj
  const [productForm, setProductForm] = useState(BLANK_PRODUCT);
  
  const [sectionModal, setSectionModal] = useState(null); // null | 'create' | section_obj
  const [sectionForm, setSectionForm] = useState(BLANK_SECTION);
  
  const [bulkModal, setBulkModal] = useState(null); // null | 'price'
  const [bulkPricePercent, setBulkPricePercent] = useState('');
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState('');

  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Core API Queries
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.list(),
  });
  const locationsList = locationsData?.locations || [];

  // Set initial locationId filter if locations load
  useState(() => {
    if (locationsList.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locationsList[0].id);
    }
  });

  const { data: sectionsData, isLoading: isSectionsLoading } = useQuery({
    queryKey: ['catalog-sections', selectedLocationId],
    queryFn: () => request(`/api/business/catalog/sections${selectedLocationId ? `?locationId=${selectedLocationId}` : ''}`),
  });
  const sectionsList = sectionsData || [];

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', selectedLocationId, selectedSectionId],
    queryFn: () => {
      const params = {};
      if (selectedLocationId) params.locationId = selectedLocationId;
      if (selectedSectionId) params.category = selectedSectionId; // We can query by section or local filters
      return productsApi.list(params);
    },
  });
  const productsList = productsData?.products || [];

  const { data: soldOutData } = useQuery({
    queryKey: ['sold-out-items'],
    queryFn: () => restaurantOpsApi.get86edItems(),
  });
  const soldOutIds = new Set(soldOutData?.items || []);

  const { data: inventoryItemsData } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => inventoryApi.list(),
    enabled: canManageInventory,
  });
  const inventoryItems = inventoryItemsData || [];

  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => inventoryApi.recipes(),
    enabled: canManageInventory,
  });
  const recipesMap = recipesData || {};

  // MUTATIONS - SECTIONS
  const createSectionMutation = useMutation({
    mutationFn: (data) => request('/api/business/catalog/sections', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Catalog section created');
      qc.invalidateQueries(['catalog-sections']);
      closeSectionModal();
    },
    onError: (e) => setFormError(e.message),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) => request(`/api/business/catalog/sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Catalog section updated');
      qc.invalidateQueries(['catalog-sections']);
      closeSectionModal();
    },
    onError: (e) => setFormError(e.message),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => request(`/api/business/catalog/sections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Catalog section deleted');
      qc.invalidateQueries(['catalog-sections']);
    },
    onError: (e) => toast.error(e.message),
  });

  // MUTATIONS - PRODUCTS
  const createProductMutation = useMutation({
    mutationFn: (data) => productsApi.create(data),
    onSuccess: (newProduct) => {
      toast.success('Product created');
      handlePostSaveRecipe(newProduct.id);
      qc.invalidateQueries(['products']);
      closeProductModal();
    },
    onError: (e) => setFormError(e.message),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: (_, { id }) => {
      toast.success('Product updated');
      handlePostSaveRecipe(id);
      qc.invalidateQueries(['products']);
      closeProductModal();
    },
    onError: (e) => setFormError(e.message),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries(['products']);
    },
    onError: (e) => toast.error(e.message),
  });

  // MUTATION - SOLD OUT / 86'd
  const toggle86Mutation = useMutation({
    mutationFn: ({ productId, isSoldOut }) => restaurantOpsApi.toggle86({ productId, isSoldOut }),
    onSuccess: () => {
      qc.invalidateQueries(['sold-out-items']);
      toast.success('Availability status toggled');
    },
    onError: (e) => toast.error(e.message),
  });

  // Inline recipe ingredient mutations
  const [inlineIngredients, setInlineIngredients] = useState([]); // Array of { inventoryItemId, quantityRequired }

  const handlePostSaveRecipe = async (productId) => {
    if (!canManageInventory) return;
    try {
      const existingRecipes = recipesMap[productId] || [];
      // Remove all existing ingredients not present in inlineIngredients, or simple reset/unlink & link
      for (const ingredient of existingRecipes) {
        await inventoryApi.unlinkIngredient(productId, ingredient.inventoryItemId);
      }
      for (const ingredient of inlineIngredients) {
        if (ingredient.inventoryItemId && ingredient.quantityRequired) {
          await inventoryApi.linkIngredient(productId, {
            inventoryItemId: ingredient.inventoryItemId,
            quantityRequired: Number(ingredient.quantityRequired),
          });
        }
      }
      qc.invalidateQueries(['recipes']);
    } catch (err) {
      console.error('Failed to sync ingredients:', err);
    }
  };

  // Bulk Operations Actions
  const handleBulkPriceAdjustment = async () => {
    if (!bulkTargetSectionId) {
      toast.error('Please select a target catalog section.');
      return;
    }
    const delta = Number(bulkPricePercent);
    if (isNaN(delta) || delta === 0) {
      toast.error('Please specify a valid percentage delta.');
      return;
    }

    const itemsToAdjust = productsList.filter(p => p.catalogSectionId === bulkTargetSectionId);
    if (itemsToAdjust.length === 0) {
      toast.error('No items found in this catalog section.');
      return;
    }

    const multiplier = 1 + delta / 100;
    let successCount = 0;

    for (const item of itemsToAdjust) {
      try {
        const newPrice = Math.max(0.01, Math.round(item.priceUsdc * multiplier * 100) / 100);
        await productsApi.update(item.id, { priceUsdc: newPrice });
        successCount++;
      } catch (err) {
        console.error(`Failed to adjust price for ${item.name}`, err);
      }
    }

    toast.success(`Successfully adjusted prices for ${successCount} items!`);
    qc.invalidateQueries(['products']);
    setBulkModal(null);
    setBulkPricePercent('');
  };

  const handleDuplicateProduct = async (product) => {
    try {
      const duplicateData = {
        ...product,
        name: `${product.name} (Copy)`,
        slug: product.slug ? `${product.slug}-copy` : undefined,
      };
      delete duplicateData.id;
      delete duplicateData.created_date;
      delete duplicateData.updated_date;

      await productsApi.create(duplicateData);
      toast.success(`Duplicated ${product.name}`);
      qc.invalidateQueries(['products']);
    } catch (err) {
      toast.error(`Duplication failed: ${err.message}`);
    }
  };

  // Reorder display order of section
  const handleReorderSection = async (section, direction) => {
    const adjacentIndex = direction === 'up' 
      ? sectionsList.findIndex(s => s.displayOrder < section.displayOrder)
      : sectionsList.findIndex(s => s.displayOrder > section.displayOrder);

    if (adjacentIndex === -1) return; // Top or bottom limits reached

    const adjacentSection = sectionsList[adjacentIndex];
    const originalOrder = section.displayOrder;

    try {
      await request(`/api/business/catalog/sections/${section.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayOrder: adjacentSection.displayOrder }),
      });
      await request(`/api/business/catalog/sections/${adjacentSection.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayOrder: originalOrder }),
      });
      toast.success('Section order updated');
      qc.invalidateQueries(['catalog-sections']);
    } catch (err) {
      toast.error('Failed to reorder sections');
    }
  };

  // Form Modals Actions
  const openCreateProduct = () => {
    if (!canManageProducts) return toast.error('Unauthorized');
    setProductForm({
      ...BLANK_PRODUCT,
      locationId: selectedLocationId,
    });
    setInlineIngredients([]);
    setFormError('');
    setProductModal('create');
  };

  const openEditProduct = (p) => {
    if (!canManageProducts) return toast.error('Unauthorized');
    
    // Parse potentially nested string fields (e.g. variants and modifierGroups if stored as string JSON)
    let parsedVariants = [];
    try {
      parsedVariants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
    } catch (e) { parsedVariants = []; }

    let parsedModifiers = [];
    try {
      parsedModifiers = typeof p.modifierGroups === 'string' ? JSON.parse(p.modifierGroups) : (p.modifierGroups || []);
    } catch (e) { parsedModifiers = []; }

    let parsedImages = [];
    try {
      parsedImages = typeof p.imageUrls === 'string' ? JSON.parse(p.imageUrls) : (p.imageUrls || []);
    } catch (e) { parsedImages = []; }

    let parsedTags = [];
    try {
      parsedTags = typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []);
    } catch (e) { parsedTags = []; }

    setProductForm({
      name: p.name || '',
      description: p.description || '',
      priceUsdc: String(p.priceUsdc || ''),
      category: p.category || 'FOOD_BEVERAGE',
      imageUrls: parsedImages,
      isActive: p.isActive !== false,
      slug: p.slug || '',
      locationId: p.locationId || selectedLocationId,
      deliveryTerms: p.deliveryTerms || '',
      estimatedDelivery: p.estimatedDelivery || '',
      catalogSectionId: p.catalogSectionId || '',
      isAvailable: p.isAvailable !== false,
      preparationMins: String(p.preparationMins || ''),
      tags: parsedTags,
      calorieCount: String(p.calorieCount || ''),
      variants: parsedVariants,
      modifierGroups: parsedModifiers,
    });

    const activeIngredients = recipesMap[p.id] || [];
    setInlineIngredients(activeIngredients.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantityRequired: String(item.quantityRequired)
    })));

    setFormError('');
    setProductModal(p);
  };

  const closeProductModal = () => {
    setProductModal(null);
    setFormError('');
    setUploading(false);
  };

  const openCreateSection = () => {
    if (!canManageProducts) return toast.error('Unauthorized');
    const maxOrder = sectionsList.reduce((max, s) => Math.max(max, s.displayOrder || 0), 0);
    setSectionForm({
      ...BLANK_SECTION,
      locationId: selectedLocationId,
      displayOrder: maxOrder + 1,
    });
    setFormError('');
    setSectionModal('create');
  };

  const openEditSection = (s) => {
    if (!canManageProducts) return toast.error('Unauthorized');
    setSectionForm({
      name: s.name || '',
      description: s.description || '',
      displayOrder: s.displayOrder || 0,
      availableFrom: s.availableFrom || '',
      availableTo: s.availableTo || '',
      imageUrl: s.imageUrl || '',
      isActive: s.isActive !== false,
      locationId: s.locationId || selectedLocationId,
    });
    setFormError('');
    setSectionModal(s);
  };

  const closeSectionModal = () => {
    setSectionModal(null);
    setFormError('');
  };

  // Image Upload Logic
  const handleImageUpload = async (e, type = 'product') => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Reset input selection
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) return toast.error(invalid);
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      if (type === 'product') {
        setProductForm(f => ({ ...f, imageUrls: [...f.imageUrls, url] }));
      } else {
        setSectionForm(f => ({ ...f, imageUrl: url }));
      }
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeProductImage = (idx) => {
    setProductForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== idx) }));
  };

  // Submitting Forms
  const handleSaveProduct = () => {
    setFormError('');
    if (!productForm.name.trim()) return setFormError('Product name is required.');
    if (!productForm.priceUsdc) return setFormError('Price is required.');
    const price = Number(productForm.priceUsdc);
    if (isNaN(price) || price < 0) return setFormError('Price must be a valid positive number.');

    // Prepare payload
    const payload = {
      ...productForm,
      name: productForm.name.trim(),
      priceUsdc: price,
      preparationMins: productForm.preparationMins ? Number(productForm.preparationMins) : null,
      calorieCount: productForm.calorieCount ? Number(productForm.calorieCount) : null,
      variants: productForm.variants,
      modifierGroups: productForm.modifierGroups,
      tags: productForm.tags,
    };

    if (productModal === 'create') {
      createProductMutation.mutate(payload);
    } else {
      updateProductMutation.mutate({ id: productModal.id, data: payload });
    }
  };

  const handleSaveSection = () => {
    setFormError('');
    if (!sectionForm.name.trim()) return setFormError('Section name is required.');

    if (sectionModal === 'create') {
      createSectionMutation.mutate(sectionForm);
    } else {
      updateSectionMutation.mutate({ id: sectionModal.id, data: sectionForm });
    }
  };

  // Repeatable rows handlers for Variants
  const addVariantRow = () => {
    setProductForm(f => ({
      ...f,
      variants: [...f.variants, { name: '', priceDelta: 0 }]
    }));
  };

  const updateVariantRow = (index, field, value) => {
    setProductForm(f => {
      const updated = [...f.variants];
      updated[index] = { ...updated[index], [field]: field === 'priceDelta' ? Number(value) : value };
      return { ...f, variants: updated };
    });
  };

  const removeVariantRow = (index) => {
    setProductForm(f => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index)
    }));
  };

  // Repeatable rows handlers for Modifier Groups
  const addModifierGroup = () => {
    setProductForm(f => ({
      ...f,
      modifierGroups: [
        ...f.modifierGroups,
        { name: '', maxSelection: 1, options: [{ name: '', priceDelta: 0 }] }
      ]
    }));
  };

  const updateModifierGroupHeader = (groupIndex, field, value) => {
    setProductForm(f => {
      const updated = [...f.modifierGroups];
      updated[groupIndex] = {
        ...updated[groupIndex],
        [field]: field === 'maxSelection' ? Number(value) : value
      };
      return { ...f, modifierGroups: updated };
    });
  };

  const removeModifierGroup = (groupIndex) => {
    setProductForm(f => ({
      ...f,
      modifierGroups: f.modifierGroups.filter((_, i) => i !== groupIndex)
    }));
  };

  const addModifierOption = (groupIndex) => {
    setProductForm(f => {
      const updated = [...f.modifierGroups];
      updated[groupIndex] = {
        ...updated[groupIndex],
        options: [...updated[groupIndex].options, { name: '', priceDelta: 0 }]
      };
      return { ...f, modifierGroups: updated };
    });
  };

  const updateModifierOption = (groupIndex, optionIndex, field, value) => {
    setProductForm(f => {
      const updated = [...f.modifierGroups];
      const updatedOptions = [...updated[groupIndex].options];
      updatedOptions[optionIndex] = {
        ...updatedOptions[optionIndex],
        [field]: field === 'priceDelta' ? Number(value) : value
      };
      updated[groupIndex] = { ...updated[groupIndex], options: updatedOptions };
      return { ...f, modifierGroups: updated };
    });
  };

  const removeModifierOption = (groupIndex, optionIndex) => {
    setProductForm(f => {
      const updated = [...f.modifierGroups];
      updated[groupIndex] = {
        ...updated[groupIndex],
        options: updated[groupIndex].options.filter((_, i) => i !== optionIndex)
      };
      return { ...f, modifierGroups: updated };
    });
  };

  // Dietary chips toggle
  const toggleTagChip = (tagValue) => {
    setProductForm(f => {
      const isSelected = f.tags.includes(tagValue);
      const nextTags = isSelected
        ? f.tags.filter(t => t !== tagValue)
        : [...f.tags, tagValue];
      return { ...f, tags: nextTags };
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6  product-catalog-page">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[var(--f-surface)] border border-[var(--f-line)] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-black text-[var(--f-text)] flex items-center gap-2">
            <Layers className="w-6 h-6 text-[var(--f-tint-color)]" /> Menu & Product Catalog
          </h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Build and optimize menu sections, dietary tags, variants, modifier rules, and inventory-linked recipe formulas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManageProducts && (
            <>
              <Button onClick={openCreateSection} variant="secondary">
                <FolderPlus className="w-4 h-4" /> Add Section
              </Button>
              <Button onClick={() => setBulkModal('price')} variant="secondary">
                <Percent className="w-4 h-4" /> Bulk Updates
              </Button>
              <Button onClick={openCreateProduct} variant="primary">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--f-surface)] border border-[var(--f-line)] p-4 rounded-xl">
        <Select
          label="Outlet Location"
          options={[{ value: '', label: 'All Locations' }, ...locationsList.map(l => ({ value: l.id, label: l.name }))]}
          value={selectedLocationId}
          onChange={(e) => {
            setSelectedLocationId(e.target.value);
            setSelectedSectionId('');
          }}
        />

        <Select
          label="Menu Section Filter"
          options={[{ value: '', label: 'All Sections' }, ...sectionsList.map(s => ({ value: s.id, label: s.name }))]}
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
        />

        <div className="flex flex-col gap-1.5 justify-end">
          <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Quick Metrics</label>
          <div className="flex items-center gap-4 text-sm font-semibold py-2 px-3 bg-[var(--f-ink-900)] rounded-xl border border-[var(--f-line)] text-[var(--f-text-3)]">
            <span>Total: <strong className="text-[var(--f-text)]">{productsList.length}</strong></span>
            <span>Sold Out (86'd): <strong className="text-[var(--f-bad)]">{soldOutIds.size}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Content Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Sections Reordering Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--f-line)] pb-2">
            <h3 className="text-sm font-bold text-[var(--f-text)]">Menu Sections</h3>
            <Tag variant="neutral">{sectionsList.length}</Tag>
          </div>

          {isSectionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skel key={i} className="h-14" />)}
            </div>
          ) : sectionsList.length === 0 ? (
            <div className="p-4 rounded-xl border border-[var(--f-line)] bg-[var(--f-ink-900)] text-center text-xs text-[var(--f-text-3)]">
              No custom sections built.
            </div>
          ) : (
            <div className="space-y-2">
              {sectionsList
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((section, idx) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[var(--f-line)] bg-[var(--f-surface)]:border-[var(--f-tint-color)] transition-all"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-[var(--f-text)] truncate">{section.name}</p>
                      {section.availableFrom && (
                        <p className="text-[10px] text-[var(--f-text-3)] flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[var(--f-tint-color)]" />
                          {section.availableFrom} - {section.availableTo}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canManageProducts && (
                        <>
                          <button
                            onClick={() => handleReorderSection(section, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded bg-[var(--f-ink-900)]:bg-[var(--f-line)] disabled:opacity-30 text-[var(--f-text-3)]"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleReorderSection(section, 'down')}
                            disabled={idx === sectionsList.length - 1}
                            className="p-1 rounded bg-[var(--f-ink-900)]:bg-[var(--f-line)] disabled:opacity-30 text-[var(--f-text-3)]"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => openEditSection(section)}
                            className="p-1 rounded bg-[var(--f-ink-900)]:bg-[var(--f-line)] text-[var(--f-tint-color)]"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete section? Items in this section will become unassigned.')) {
                                deleteSectionMutation.mutate(section.id);
                              }
                            }}
                            className="p-1 rounded bg-[var(--f-ink-900)]:bg-[var(--f-bad)]/20 text-[var(--f-bad)]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Menu / Catalog Card Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="border-b border-[var(--f-line)] pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--f-text)]">Active Items & Catalog Listings</h3>
            <span className="text-xs text-[var(--f-text-3)]">Sort: Active first</span>
          </div>

          {isProductsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 4].map(i => <Skel key={i} className="h-44" />)}
            </div>
          ) : productsList.length === 0 ? (
            <Empty
              icon={Package}
              title="No Products Found"
              description="Create a product item or update your outlet filter settings."
              action={
                canManageProducts && (
                  <Button onClick={openCreateProduct}>
                    <Plus className="w-4 h-4" /> Add Product Now
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productsList.map((product) => {
                const isSoldOut = soldOutIds.has(product.id);
                return (
                  <Card
                    key={product.id}
                    className="flex flex-col justify-between border-[var(--f-line)] bg-[var(--f-surface)] relative overflow-hidden group"
                    style={{ opacity: product.isActive ? 1 : 0.6 }}
                  >
                    <div>
                      {/* Product Status Indicator bar */}
                      <div className="flex items-center justify-between mb-3">
                        <Tag
                          color={product.isActive ? 'var(--f-ok)' : 'var(--f-text-3)'}
                          bg={product.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)'}
                        >
                          {product.isActive ? 'Active Menu Item' : 'Inactive'}
                        </Tag>

                        {/* Sold Out Switch Directly on Item Card */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--f-text-3)]">
                            {isSoldOut ? 'Sold Out' : 'Available'}
                          </span>
                          <Switch
                            checked={!isSoldOut}
                            onChange={(checked) => {
                              toggle86Mutation.mutate({ productId: product.id, isSoldOut: !checked });
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        {product.imageUrls && product.imageUrls[0] ? (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-[var(--f-line)]">
                            <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] flex items-center justify-center flex-shrink-0">
                            <Package className="w-8 h-8 text-[var(--f-line)]" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-[var(--f-text)] truncate">{product.name}</h4>
                          <p className="text-xs text-[var(--f-text-3)] line-clamp-2 mt-0.5">{product.description}</p>
                          <div className="text-sm font-black text-[var(--f-tint-color)] mt-2 f-mono">
                            {fmtUSDC(product.priceUsdc)}
                          </div>
                        </div>
                      </div>

                      {/* Display dietary tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {product.tags.map(t => {
                            const found = DIETARY_TAGS.find(dt => dt.value === t);
                            return (
                              <span key={t} className="text-[10px] bg-[var(--f-ink-900)] border border-[var(--f-line)] px-1.5 py-0.5 rounded text-[var(--f-text-3)]">
                                {found ? found.label : t}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[var(--f-line)] pt-3 mt-4">
                      <div className="text-[10px] text-[var(--f-text-3)]">
                        {product.preparationMins ? `${product.preparationMins} mins prep` : 'Instant'}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {canManageProducts && (
                          <>
                            <button
                              onClick={() => handleDuplicateProduct(product)}
                              title="Duplicate listing"
                              className="p-1.5 rounded-xl bg-[var(--f-ink-900)]:bg-[var(--f-line)] text-[var(--f-text-3)] transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <Button size="sm" variant="secondary" onClick={() => openEditProduct(product)}>
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </Button>
                            <button
                              onClick={() => {
                                if (confirm('Are you absolutely sure you want to permanently delete this product?')) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                              className="p-1.5 rounded-xl bg-[var(--f-ink-900)]:bg-[var(--f-bad)]/10 text-[var(--f-bad)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DIALOG 1: SECTION CREATION / EDITING */}
      <Modal
        open={!!sectionModal}
        onClose={closeSectionModal}
        title={sectionModal === 'create' ? 'Create Catalog Section' : 'Edit Catalog Section'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Section Name"
            placeholder="e.g. Breakfast Specialties, Mains, Refreshing Beverages"
            value={sectionForm.name}
            onChange={(e) => setSectionForm(sf => ({ ...sf, name: e.target.value }))}
          />

          <Textarea
            label="Brief Description (optional)"
            placeholder="Introduce this section to customers..."
            value={sectionForm.description}
            onChange={(e) => setSectionForm(sf => ({ ...sf, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Available From"
              type="time"
              value={sectionForm.availableFrom}
              onChange={(e) => setSectionForm(sf => ({ ...sf, availableFrom: e.target.value }))}
            />
            <Input
              label="Available To"
              type="time"
              value={sectionForm.availableTo}
              onChange={(e) => setSectionForm(sf => ({ ...sf, availableTo: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Cover Image URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="Upload or insert direct URL"
                value={sectionForm.imageUrl}
                onChange={(e) => setSectionForm(sf => ({ ...sf, imageUrl: e.target.value }))}
                className="flex-1"
              />
              <label className="px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)]:border-[var(--f-tint-color)] text-xs text-[var(--f-text-3)] cursor-pointer flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'section')}
                  className="hidden"
                />
                Upload
              </label>
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--f-bad)]/15 border border-[var(--f-bad)]/35 text-[var(--f-bad)]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{formError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="secondary" onClick={closeSectionModal} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSaveSection}
              className="flex-1"
            >
              Save Section
            </Button>
          </div>
        </div>
      </Modal>

      {/* DIALOG 2: COMPREHENSIVE PRODUCT EDITOR */}
      <Modal
        open={!!productModal}
        onClose={closeProductModal}
        title={productModal === 'create' ? 'Add New Menu Item' : 'Edit Menu Product'}
        className="max-w-2xl overflow-y-auto max-h-[85vh]"
      >
        <div className="space-y-6">
          
          {/* Main Info Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Item Title"
              placeholder="e.g. Organic Beef Burger, Fresh Lemonade"
              value={productForm.name}
              onChange={(e) => setProductForm(pf => ({ ...pf, name: e.target.value }))}
            />

            <Input
              label="Base Price (USDC)"
              placeholder="0.00"
              type="number"
              step="0.01"
              value={productForm.priceUsdc}
              onChange={(e) => setProductForm(pf => ({ ...pf, priceUsdc: e.target.value }))}
            />
          </div>

          <Textarea
            label="Product Description"
            placeholder="Detailed description of flavors, portions, preparation, etc."
            value={productForm.description}
            onChange={(e) => setProductForm(pf => ({ ...pf, description: e.target.value }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Catalog Section"
              options={[{ value: '', label: 'None' }, ...sectionsList.map(s => ({ value: s.id, label: s.name }))]}
              value={productForm.catalogSectionId}
              onChange={(e) => setProductForm(pf => ({ ...pf, catalogSectionId: e.target.value }))}
            />

            <Input
              label="Preparation Time (Minutes)"
              placeholder="e.g. 15"
              type="number"
              value={productForm.preparationMins}
              onChange={(e) => setProductForm(pf => ({ ...pf, preparationMins: e.target.value }))}
            />

            <Input
              label="Calorie Count"
              placeholder="e.g. 450"
              type="number"
              value={productForm.calorieCount}
              onChange={(e) => setProductForm(pf => ({ ...pf, calorieCount: e.target.value }))}
            />
          </div>

          {/* Toggleable Chip Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Dietary & Tag Pickers
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map(chip => {
                const isSelected = productForm.tags.includes(chip.value);
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => toggleTagChip(chip.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: isSelected ? 'var(--f-tint-color)' : 'var(--f-ink-900)',
                      border: `1px solid ${isSelected ? 'var(--f-tint-color)' : 'var(--f-line)'}`,
                      color: isSelected ? 'var(--f-ink-900)' : 'var(--f-text)',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeatable Row Editors - Product Variants */}
          <div className="bg-[var(--f-ink-900)] p-4 rounded-xl border border-[var(--f-line)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--f-tint-color)]" /> Product Variants
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addVariantRow}>
                <Plus className="w-3 h-3" /> Add Size/Type
              </Button>
            </div>

            {productForm.variants.length === 0 ? (
              <p className="text-xs text-[var(--f-text-3)] italic">No product size variations added yet.</p>
            ) : (
              <div className="space-y-2">
                {productForm.variants.map((variant, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g. Small, Regular, Extra Large"
                      value={variant.name}
                      onChange={(e) => updateVariantRow(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Price Delta (e.g. +2.00 or -1.50)"
                      type="number"
                      step="0.01"
                      value={variant.priceDelta}
                      onChange={(e) => updateVariantRow(index, 'priceDelta', e.target.value)}
                      className="w-1/3"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariantRow(index)}
                      className="p-2.5 rounded-xl:bg-[var(--f-bad)]/10 text-[var(--f-bad)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repeatable Row Editors - Modifier Options Groups */}
          <div className="bg-[var(--f-ink-900)] p-4 rounded-xl border border-[var(--f-line)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--f-tint-color)]" /> Add-on & Modifier Selection Rules
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addModifierGroup}>
                <Plus className="w-3 h-3" /> Add Modifier Group
              </Button>
            </div>

            {productForm.modifierGroups.length === 0 ? (
              <p className="text-xs text-[var(--f-text-3)] italic">No complex custom option rules built yet.</p>
            ) : (
              <div className="space-y-6">
                {productForm.modifierGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="p-3 rounded-xl border border-[var(--f-line)] bg-[var(--f-surface)] space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Group Label (e.g. Extra Cheese / Addons)"
                        value={group.name}
                        onChange={(e) => updateModifierGroupHeader(groupIndex, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        label="Max Selections"
                        type="number"
                        min="1"
                        placeholder="Max"
                        value={group.maxSelection}
                        onChange={(e) => updateModifierGroupHeader(groupIndex, 'maxSelection', e.target.value)}
                        className="w-24"
                      />
                      <button
                        type="button"
                        onClick={() => removeModifierGroup(groupIndex)}
                        className="p-2.5 rounded-xl:bg-[var(--f-bad)]/10 text-[var(--f-bad)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Options inside this group */}
                    <div className="pl-4 border-l-2 border-[var(--f-line)] space-y-2">
                      {group.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex gap-2 items-center">
                          <Input
                            placeholder="Option title (e.g. Bacon, Extra Patty)"
                            value={opt.name}
                            onChange={(e) => updateModifierOption(groupIndex, optIndex, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Delta Price"
                            type="number"
                            step="0.01"
                            value={opt.priceDelta}
                            onChange={(e) => updateModifierOption(groupIndex, optIndex, 'priceDelta', e.target.value)}
                            className="w-28"
                          />
                          <button
                            type="button"
                            onClick={() => removeModifierOption(groupIndex, optIndex)}
                            className="p-2 text-[var(--f-bad)]:bg-[var(--f-bad)]/10 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addModifierOption(groupIndex)}
                        className="text-xs font-bold text-[var(--f-tint-color)] flex items-center gap-1:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Choice Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ingredient Recipe formulas Linker */}
          {canManageInventory && (
            <div className="bg-[var(--f-ink-900)] p-4 rounded-xl border border-[var(--f-line)] space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[var(--f-tint-color)]" /> Linked Ingredients (Recipes API)
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setInlineIngredients(items => [...items, { inventoryItemId: '', quantityRequired: '' }])}
                >
                  <Plus className="w-3 h-3" /> Link Ingredient
                </Button>
              </div>

              {inlineIngredients.length === 0 ? (
                <p className="text-xs text-[var(--f-text-3)] italic">No connected ingredients. Stock will not auto-deduct.</p>
              ) : (
                <div className="space-y-2">
                  {inlineIngredients.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        options={[{ value: '', label: 'Select stock item...' }, ...inventoryItems.map(inv => ({ value: inv.id, label: `${inv.name} (In stock: ${inv.quantity || 0})` }))]}
                        value={item.inventoryItemId}
                        onChange={(e) => {
                          const next = [...inlineIngredients];
                          next[index].inventoryItemId = e.target.value;
                          setInlineIngredients(next);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Required Quantity"
                        type="number"
                        value={item.quantityRequired}
                        onChange={(e) => {
                          const next = [...inlineIngredients];
                          next[index].quantityRequired = e.target.value;
                          setInlineIngredients(next);
                        }}
                        className="w-1/3"
                      />
                      <button
                        type="button"
                        onClick={() => setInlineIngredients(items => items.filter((_, idx) => idx !== index))}
                        className="p-2.5 rounded-xl:bg-[var(--f-bad)]/10 text-[var(--f-bad)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Image Upload Gallery Section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">Product Gallery Images</p>
            <div className="grid grid-cols-3 gap-2">
              {productForm.imageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--f-ink-900)] border border-[var(--f-line)] group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--f-tint-color)] text-[var(--f-ink-900)]">COVER</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeProductImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-[var(--f-bad)] rounded-full flex items-center justify-center text-[var(--f-text)]:scale-110 transition-transform"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {productForm.imageUrls.length < MAX_IMAGES && (
                <label className={`aspect-square rounded-xl border-2 border-dashed border-[var(--f-line)] flex flex-col items-center justify-center transition-colors ${uploading ? 'opacity-60' : 'cursor-pointer:border-[var(--f-tint-color)]'}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageUpload(e, 'product')}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-[var(--f-tint-color)] animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-[var(--f-text-3)]" />
                      <span className="text-xs text-[var(--f-text-3)] mt-1">Add Image</span>
                    </>
                  )}
                </label>
              )}
            </div>
            <p className="text-[11px] text-[var(--f-text-3)]">
              {isCloudinaryConfigured()
                ? 'Up to 5 images. The first image will be set as the main display cover.'
                : 'Asset upload service offline. Paste links directly or configure your cloud providers.'}
            </p>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--f-bad)]/15 border border-[var(--f-bad)]/35 text-[var(--f-bad)]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{formError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-[var(--f-line)]">
            <Button variant="secondary" onClick={closeProductModal} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              className="flex-1"
            >
              Save Product Details
            </Button>
          </div>
        </div>
      </Modal>

      {/* DIALOG 3: BULK PRICE ADJUSTMENT & OPERATIONS */}
      <Modal
        open={bulkModal === 'price'}
        onClose={() => setBulkModal(null)}
        title="Bulk Price Adjustment Wizard"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--f-text-3)] leading-relaxed">
            Apply a percentage price delta increase or decrease to all products inside a selected section. (e.g. enter <strong className="text-[var(--f-tint-color)]">5</strong> for +5% increase or <strong className="text-[var(--f-bad)]">-10</strong> for a 10% discount).
          </p>

          <Select
            label="Target Catalog Section"
            options={[{ value: '', label: 'Select category section...' }, ...sectionsList.map(s => ({ value: s.id, label: s.name }))]}
            value={bulkTargetSectionId}
            onChange={(e) => setBulkTargetSectionId(e.target.value)}
          />

          <Input
            label="Percentage Change (%)"
            placeholder="e.g. 5"
            type="number"
            value={bulkPricePercent}
            onChange={(e) => setBulkPricePercent(e.target.value)}
          />

          <div className="flex gap-3 pt-3">
            <Button variant="secondary" onClick={() => setBulkModal(null)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleBulkPriceAdjustment} variant="primary" className="flex-1">
              Execute Bulk Pricing
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Styles */}
      <style>{`
        .product-catalog-page {
          --az-black: #09090b;
          --az-card: #18181b;
        }
        .product-catalog-page select option {
          background-color: var(--f-surface) !important;
          color: var(--f-text) !important;
        }
      `}</style>
    </div>
  );
}
