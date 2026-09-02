import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, BusFront, Check, ChevronRight, CircleDot, Layers3, Minus, Plus, ShoppingBag, Utensils, X } from 'lucide-react';

const PRESETS = {
  DINING_JOURNEY: { label: 'Dining journey', browse: 'Menu', detail: 'Dish', commit: 'Add to tray', empty: 'Add a dish to see the tray update.' },
  SHOP_FLOOR: { label: 'Shop floor', browse: 'Collection', detail: 'Product', commit: 'Lift into bag', empty: 'Choose a product to preview the bag.' },
  BUILDING_WALK: { label: 'Building walk', browse: 'Property', detail: 'Room', commit: 'Reserve room', empty: 'Choose a room to preview the booking hand-off.' },
  TRAVEL_JOURNEY: { label: 'Travel journey', browse: 'Journey', detail: 'Seat', commit: 'Choose seat', empty: 'Choose a trip to preview the boarding hand-off.' },
  SERVICE_JOURNEY: { label: 'Service journey', browse: 'Services', detail: 'Service', commit: 'Continue', empty: 'Choose an offering to preview the next step.' },
};

function normalizeImages(item) {
  const value = item?.imageUrls ?? item?.images ?? [];
  return Array.isArray(value) ? value.filter((url) => typeof url === 'string' && url.trim()).slice(0, 4) : [];
}

function money(value, suffix = '') {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}${suffix}` : 'Price unavailable';
}

function categoryPreset(category, explicitPreset) {
  if (explicitPreset && PRESETS[explicitPreset]) return explicitPreset;
  const normalized = String(category || '').trim().toUpperCase();
  if (normalized === 'FOOD_BEVERAGE' || normalized === 'RESTAURANT') return 'DINING_JOURNEY';
  if (normalized === 'RETAIL') return 'SHOP_FLOOR';
  if (normalized === 'HOSPITALITY' || normalized === 'HOTEL') return 'BUILDING_WALK';
  if (normalized === 'LOGISTICS' || normalized === 'TRANSIT') return 'TRAVEL_JOURNEY';
  return 'SERVICE_JOURNEY';
}

function durationFor(tempo) {
  if (tempo === 'QUICK') return 180;
  if (tempo === 'RELAXED') return 420;
  return 300;
}

function findVariantOptions(product) {
  const variants = product?.variants ?? [];
  if (Array.isArray(variants)) return variants.map((item, index) => ({ group: 'Size', id: item?.id || `variant-${index}`, name: item?.name || item?.label || 'Option', priceDelta: Number(item?.priceDelta ?? item?.price_delta ?? item?.additionalPrice ?? 0) || 0 }));
  if (!variants || typeof variants !== 'object') return [];
  return Object.entries(variants).flatMap(([group, values]) => {
    if (Array.isArray(values)) return values.map((item, index) => ({ group, id: item?.id || `${group}-${index}`, name: item?.name || item?.label || String(item), priceDelta: Number(item?.priceDelta ?? item?.price_delta ?? item?.additionalPrice ?? 0) || 0 }));
    return [];
  });
}

function modifierOptions(product) {
  const groups = product?.modifierGroups ?? product?.optionGroups ?? [];
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group, groupIndex) => (Array.isArray(group?.options) ? group.options : []).map((item, index) => ({ group: group?.name || `Choice ${groupIndex + 1}`, id: item?.id || `${groupIndex}-${index}`, name: item?.name || item?.label || 'Option', priceDelta: Number(item?.priceDelta ?? item?.price_delta ?? 0) || 0, required: group?.required === true, maxSelection: Number(group?.maxSelection || 1) || 1 })));
}

function productPrice(product, selected) {
  const base = Number(product?.priceUsdc ?? product?.price ?? 0);
  const variant = selected.variant ? [...selected.variant.values()].find((item) => item.id === selected.variant.get(selected.variantGroup)) : null;
  const optionDelta = [...selected.options.values()].reduce((sum, item) => sum + item.priceDelta, 0);
  return (Number.isFinite(base) ? base : 0) + (variant?.priceDelta || 0) + optionDelta;
}

function Image({ src, alt, className = 'h-full w-full object-cover' }) {
  if (src) return <img src={src} alt={alt} className={className} />;
  return <div className="grid h-full w-full place-items-center text-[10px]" style={{ background: 'var(--line)', color: 'var(--text-3)' }}>No image</div>;
}

export default function ExperienceLivePreview({ blueprint, category, products = [], rooms = [], trips = [] }) {
  const presetKey = categoryPreset(category, blueprint?.preset);
  const meta = PRESETS[presetKey];
  const duration = durationFor(blueprint?.motion?.tempo);
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [committed, setCommitted] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState(new Map());

  const normalizedCategory = String(category || '').trim().toUpperCase();
  const content = useMemo(() => {
    if (presetKey === 'BUILDING_WALK') return rooms.filter((room) => String(room?.status || '').toUpperCase() !== 'OUT_OF_ORDER');
    if (presetKey === 'TRAVEL_JOURNEY') return trips.filter((trip) => String(trip?.status || '').toUpperCase() === 'SCHEDULED' || !trip?.status);
    if (presetKey === 'DINING_JOURNEY' || presetKey === 'SHOP_FLOOR') return products.filter((item) => item?.isActive !== false && item?.isAvailable !== false);
    return products.filter((item) => item?.isActive !== false && item?.isAvailable !== false);
  }, [presetKey, rooms, trips, products]);

  const pages = useMemo(() => {
    const size = presetKey === 'BUILDING_WALK' ? 4 : 3;
    const start = page * size;
    return content.slice(start, start + size);
  }, [content, page, presetKey]);

  const maxPage = Math.max(0, Math.ceil(content.length / (presetKey === 'BUILDING_WALK' ? 4 : 3)) - 1);
  const item = selected || pages[0] || content[0] || null;
  const variantOptions = item ? findVariantOptions(item) : [];
  const options = item ? modifierOptions(item) : [];
  const variantGroups = [...new Set(variantOptions.map((option) => option.group))];
  const total = item && (presetKey === 'DINING_JOURNEY' || presetKey === 'SHOP_FLOOR')
    ? productPrice(item, { variant: selectedVariant ? new Map([[variantGroups[0], selectedVariant]]) : new Map(), variantGroup: variantGroups[0], options: selectedOptions }) * quantity
    : Number(item?.priceUsdc ?? item?.price ?? item?.fareUsdc ?? 0);

  const openItem = (next) => {
    setSelected(next);
    setStage(1);
    setCommitted(false);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedOptions(new Map());
  };

  const commit = () => {
    if (!item) return;
    setCommitted(true);
    setStage(2);
  };

  const toggleOption = (option) => {
    setSelectedOptions((current) => {
      const next = new Map(current);
      const key = `${option.group}:${option.id}`;
      if (next.has(key)) next.delete(key);
      else next.set(key, option);
      return next;
    });
  };

  const navigationMode = blueprint?.navigation?.mode || 'CONTEXTUAL';
  const showProgress = blueprint?.navigation?.showProgress !== false;
  const showGallery = blueprint?.detail?.showGallery !== false;
  const showSpecifications = blueprint?.detail?.showSpecifications !== false;
  const showOptions = blueprint?.detail?.showOptions !== false;
  const showQuantity = blueprint?.detail?.showQuantity !== false;
  const persistent = blueprint?.commit?.persistentTray === true;
  const commitStyle = blueprint?.commit?.style || 'MATERIAL';
  const isDining = presetKey === 'DINING_JOURNEY';
  const isRetail = presetKey === 'SHOP_FLOOR';
  const Icon = presetKey === 'DINING_JOURNEY' ? Utensils : presetKey === 'SHOP_FLOOR' ? ShoppingBag : presetKey === 'BUILDING_WALK' ? BedDouble : presetKey === 'TRAVEL_JOURNEY' ? BusFront : Layers3;

  const browseTitle = navigationMode === 'FLOOR_TRAVERSE' ? 'Choose a floor' : navigationMode === 'AISLE_TRAVERSE' ? 'Choose a collection' : navigationMode === 'JOURNEY_TIMELINE' ? 'Follow the journey' : meta.browse;
  const stageLabels = [browseTitle, meta.detail, commitStyle === 'PAPER_RIP' ? 'Tear into tray' : meta.commit];

  return (
    <section className="overflow-hidden rounded-3xl border" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Interactive preview</p>
          <h2 className="mt-1 text-sm font-bold" style={{ color: 'var(--text)' }}>{meta.label}</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>Uses your current {normalizedCategory || 'storefront'} content and the same Blueprint decisions customers will receive.</p>
        </div>
        {showProgress && <div className="flex min-w-[220px] flex-1 gap-1.5 md:max-w-[280px]">{stageLabels.map((label, index) => <button key={label} type="button" onClick={() => index <= stage && setStage(index)} className="rounded-full" aria-label={`Preview ${label}`} style={{ height: 5, flex: 1, background: index <= stage ? 'var(--accent)' : 'var(--line)' }} />)}</div>}
      </div>

      <div className="p-5">
        {stage === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{browseTitle}</p><p className="mt-1 text-[11px]" style={{ color: 'var(--text-3)' }}>{content.length ? `${content.length} live records available` : 'No live records yet'}</p></div>
              {maxPage > 0 && <div className="flex items-center gap-1"><button type="button" aria-label="Previous preview page" disabled={!page} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-full border p-2 disabled:opacity-40" style={{ borderColor: 'var(--line)' }}><ArrowLeft size={14} /></button><button type="button" aria-label="Next preview page" disabled={page >= maxPage} onClick={() => setPage((value) => Math.min(maxPage, value + 1))} className="rounded-full border p-2 disabled:opacity-40" style={{ borderColor: 'var(--line)' }}><ArrowRight size={14} /></button></div>}
            </div>

            {!content.length ? (
              <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--line)' }}><Icon size={22} className="mx-auto" style={{ color: 'var(--accent)' }} /><p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text)' }}>Nothing to preview yet</p><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{meta.empty}</p></div>
            ) : presetKey === 'TRAVEL_JOURNEY' ? (
              <div className="space-y-2">{pages.map((trip) => <button key={trip.id || trip.tripId || trip.departureAt} type="button" onClick={() => openItem(trip)} className="w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{trip.origin || 'Origin'} → {trip.destination || 'Destination'}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>{trip.routeName || 'Scheduled service'} · {trip.vehicleType || 'Vehicle'}</p></div><p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{money(trip.fareUsdc)}</p></div><div className="mt-3 grid grid-cols-3 gap-2"><Info label="Departure" value={trip.departureAt ? new Date(trip.departureAt).toLocaleString() : '—'} /><Info label="Seats" value={String(trip.availableSeats ?? '—')} /><Info label="Status" value={trip.status || 'Scheduled'} /></div></button>)}</div>
            ) : presetKey === 'BUILDING_WALK' ? (
              <div className="grid gap-2 sm:grid-cols-2">{pages.map((room) => <button key={room.id || room.roomNumber} type="button" onClick={() => openItem(room)} className="rounded-2xl border p-3 text-left" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div className="aspect-[16/8] overflow-hidden rounded-xl"><Image src={normalizeImages(room)[0]} alt="" /></div><div className="mt-3 flex items-center justify-between gap-2"><div><p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Room {room.roomNumber || '—'}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>Floor {room.floor ?? '—'} · {room.roomType || 'Room'}</p></div><ChevronRight size={15} style={{ color: 'var(--text-3)' }} /></div></button>)}</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">{pages.map((product) => <button key={product.id || product.slug || product.name} type="button" onClick={() => openItem(product)} className="group rounded-2xl border p-2.5 text-left" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div className="aspect-[4/3] overflow-hidden rounded-xl"><Image src={normalizeImages(product)[0]} alt={product.name || 'Product'} /></div><p className="mt-2 truncate text-xs font-bold" style={{ color: 'var(--text)' }}>{product.name || 'Unnamed item'}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>{money(product.priceUsdc)}</p></button>)}</div>
            )}
          </div>
        )}

        {stage === 1 && item && (
          <div className="space-y-4" style={{ transition: `opacity ${duration}ms ease, transform ${duration}ms ease` }}>
            <div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => setStage(0)} className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>← Back to {meta.browse.toLowerCase()}</button><p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{blueprint?.detail?.presentation || meta.detail}</p><h3 className="mt-1 text-xl font-black" style={{ color: 'var(--text)' }}>{item.name || `${meta.detail} ${item.roomNumber || item.id || ''}`}</h3></div><button type="button" aria-label="Close detail" onClick={() => setStage(0)} className="rounded-full border p-2" style={{ borderColor: 'var(--line)' }}><X size={15} /></button></div>

            {showGallery && <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr]"><div className="aspect-[16/9] overflow-hidden rounded-2xl"><Image src={normalizeImages(item)[0]} alt="" /></div><div className="grid grid-cols-2 gap-2">{normalizeImages(item).slice(1, 5).map((src) => <div key={src} className="overflow-hidden rounded-xl"><Image src={src} alt="" /></div>)}</div></div>}

            <div className="grid gap-3 sm:grid-cols-3">
              {showSpecifications && presetKey === 'BUILDING_WALK' && <Info label="Floor" value={String(item.floor ?? '—')} />}
              {showSpecifications && presetKey === 'BUILDING_WALK' && <Info label="Type" value={String(item.roomType || 'Room')} />}
              {showSpecifications && presetKey === 'TRAVEL_JOURNEY' && <Info label="Route" value={`${item.origin || 'Origin'} → ${item.destination || 'Destination'}`} />}
              {showSpecifications && presetKey === 'TRAVEL_JOURNEY' && <Info label="Vehicle" value={String(item.vehicleType || 'Vehicle')} />}
              {showSpecifications && isDining && <Info label="Preparation" value={item.preparationMins ? `${item.preparationMins} min` : '—'} />}
              {showSpecifications && isDining && <Info label="Calories" value={item.calorieCount ? `${item.calorieCount} kcal` : '—'} />}
              {showSpecifications && (isDining || isRetail) && <Info label="Availability" value={item.isAvailable === false ? 'Unavailable' : 'Available'} />}
            </div>

            {showOptions && (isDining || isRetail) && (variantOptions.length || options.length) > 0 && (
              <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                {variantGroups.map((group) => <div key={group}><p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>{group}</p><div className="mt-2 flex flex-wrap gap-2">{variantOptions.filter((option) => option.group === group).map((option) => { const active = selectedVariant?.id === option.id; return <button key={option.id} type="button" onClick={() => setSelectedVariant(option)} className="rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: active ? 'var(--accent)' : 'var(--line)', background: active ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surface)', color: 'var(--text)' }}>{option.name}{option.priceDelta ? ` · ${option.priceDelta > 0 ? '+' : ''}${option.priceDelta.toFixed(2)}` : ''}</button>; })}</div></div>)}
                {options.length > 0 && <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>Options</p><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => { const key = `${option.group}:${option.id}`; const active = selectedOptions.has(key); return <button key={key} type="button" onClick={() => toggleOption(option)} className="rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: active ? 'var(--accent)' : 'var(--line)', background: active ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surface)', color: 'var(--text)' }}>{option.name}{option.priceDelta ? ` · ${option.priceDelta > 0 ? '+' : ''}${option.priceDelta.toFixed(2)}` : ''}</button>; })}</div></div>}
              </div>
            )}

            {(showQuantity && (isDining || isRetail)) && <div className="flex items-center justify-between rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}><span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Quantity</span><div className="flex items-center gap-2"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-full border p-2" style={{ borderColor: 'var(--line)' }}><Minus size={13} /></button><span className="min-w-6 text-center text-sm font-bold" style={{ color: 'var(--text)' }}>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className="rounded-full border p-2" style={{ borderColor: 'var(--line)' }}><Plus size={13} /></button></div></div>}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}><div><p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Decision</p><p className="mt-1 text-lg font-black" style={{ color: 'var(--text)' }}>{money(total)}</p></div><button type="button" onClick={commit} className="rounded-xl px-4 py-3 text-xs font-bold text-white" style={{ background: 'var(--accent)', transition: `transform ${duration}ms ease` }}><Check size={14} className="mr-2 inline" />{isDining && commitStyle === 'PAPER_RIP' ? 'Tear into tray' : meta.commit}</button></div>
          </div>
        )}

        {stage === 2 && item && (
          <div className="space-y-4 text-center" style={{ transition: `opacity ${duration}ms ease, transform ${duration}ms ease` }}>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)' }}><Check size={28} /></div>
            <div><p className="text-lg font-black" style={{ color: 'var(--text)' }}>{persistent ? (isDining ? 'Added to the tray' : 'Added to the bag') : meta.commit}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{commitStyle === 'PAPER_RIP' ? 'The paper-rip metaphor ends at the transaction boundary; the preview does not invent a second cart.' : 'This is the confirmation state customers receive after the configured commit action.'}</p></div>
            <div className="mx-auto max-w-md rounded-2xl border p-4 text-left" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div className="flex items-center gap-3"><div className="h-12 w-12 overflow-hidden rounded-xl"><Image src={normalizeImages(item)[0]} alt="" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>{item.name || `${meta.detail}`}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>{money(total)}{isDining || isRetail ? ` · ${quantity} item${quantity === 1 ? '' : 's'}` : ''}</p></div></div></div>
            <button type="button" onClick={() => { setStage(0); setCommitted(false); }} className="rounded-xl border px-4 py-2.5 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>Replay preview</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }) {
  return <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p><p className="mt-1 truncate text-[11px] font-semibold" style={{ color: 'var(--text)' }}>{value}</p></div>;
}
