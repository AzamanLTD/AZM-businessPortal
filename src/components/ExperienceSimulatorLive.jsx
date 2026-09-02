import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, BusFront, Check, ChevronRight, CircleDot, Layers3, MapPin, Package, RotateCcw, ShoppingBag, Sparkles, Utensils, X } from 'lucide-react';

const META = {
  DINING_JOURNEY: { eyebrow: 'Dining journey', title: 'A menu that behaves like a place', browseLabel: 'Browse menu', detailLabel: 'Dish dossier', commitLabel: 'Add to tray', icon: Utensils },
  SHOP_FLOOR: { eyebrow: 'Shop floor', title: 'A storefront that lets products come forward', browseLabel: 'Browse collection', detailLabel: 'Product dossier', commitLabel: 'Lift into bag', icon: ShoppingBag },
  BUILDING_WALK: { eyebrow: 'Building walk', title: 'A property you can explore before you book', browseLabel: 'Explore property', detailLabel: 'Room dossier', commitLabel: 'Reserve room', icon: BedDouble },
  TRAVEL_JOURNEY: { eyebrow: 'Travel journey', title: 'The trip stays visible while you choose', browseLabel: 'Follow journey', detailLabel: 'Seat dossier', commitLabel: 'Choose seat', icon: BusFront },
  SERVICE_JOURNEY: { eyebrow: 'Service journey', title: 'A calm path from offer to commitment', browseLabel: 'Discover services', detailLabel: 'Service dossier', commitLabel: 'Continue', icon: Sparkles },
};

const CATEGORY_PRESETS = { FOOD_BEVERAGE: 'DINING_JOURNEY', RESTAURANT: 'DINING_JOURNEY', RETAIL: 'SHOP_FLOOR', HOSPITALITY: 'BUILDING_WALK', HOTEL: 'BUILDING_WALK', LOGISTICS: 'TRAVEL_JOURNEY', TRANSIT: 'TRAVEL_JOURNEY' };
const SPEEDS = { RELAXED: 520, BALANCED: 360, QUICK: 240 };

function money(value, suffix = '') {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}${suffix}` : 'Price unavailable';
}

function imageFor(item) {
  const urls = item?.imageUrls ?? item?.images ?? [];
  return Array.isArray(urls) ? urls.find((url) => typeof url === 'string' && url.trim()) : null;
}

function firstMeaningful(items) {
  return items?.find(Boolean) || null;
}

function Browse({ preset, speed, products, rooms, trips, onFocus }) {
  if (preset === 'DINING_JOURNEY' || preset === 'SHOP_FLOOR') {
    const dining = preset === 'DINING_JOURNEY';
    const items = [...(products || [])].filter((item) => item?.isActive !== false && item?.isAvailable !== false).sort((a, b) => Number(b?.totalOrders || 0) - Number(a?.totalOrders || 0)).slice(0, 5);
    return (
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)', background: dining ? 'linear-gradient(135deg,#fbf2df,#efe1c5)' : 'var(--surface)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: dining ? '#e2cfab' : 'var(--line)' }}>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: dining ? '#8c744f' : 'var(--text-3)' }}>{dining ? 'Menu' : 'Collection'}</p><p className="mt-1 text-base font-black" style={{ color: dining ? '#2d2416' : 'var(--text)' }}>{items.length ? (dining ? 'Popular right now' : 'Bestsellers') : 'Waiting for published content'}</p></div>
          {dining ? <Utensils size={18} style={{ color: '#a77b32' }} /> : <Layers3 size={18} style={{ color: 'var(--accent)' }} />}
        </div>
        {items.length ? (
          <div className="p-3 space-y-2">
            {items.map((item, index) => {
              const image = imageFor(item);
              return <button key={item.id || item.slug || item.name} type="button" onClick={() => onFocus(item)} className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5" style={{ borderColor: dining ? '#eadabd' : 'var(--line)', background: dining ? 'rgba(255,255,255,.68)' : 'var(--bg)', transitionDuration: `${speed}ms` }}>
                {image ? <img src={image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl" style={{ background: dining ? '#efe1c5' : 'var(--surface)', color: dining ? '#9a7b49' : 'var(--text-3)' }}>{dining ? <Utensils size={18} /> : <Package size={18} />}</div>}
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" style={{ color: dining ? '#2d2416' : 'var(--text)' }}>{item.name || 'Unnamed item'}</p><p className="mt-1 text-[10px]" style={{ color: dining ? '#8b7a5a' : 'var(--text-3)' }}>{money(item.priceUsdc)}{Number(item.totalOrders || 0) ? ` · ${item.totalOrders} orders` : ''}</p></div>
                <ChevronRight size={15} style={{ color: dining ? '#a17b42' : 'var(--text-3)' }} />
              </button>;
            })}
          </div>
        ) : <div className="p-5 text-xs" style={{ color: 'var(--text-3)' }}>Publish at least one active catalog item to see the real experience here.</div>}
      </div>
    );
  }

  if (preset === 'BUILDING_WALK') {
    const grouped = (rooms || []).reduce((map, room) => { const floor = String(room?.floor ?? '—'); if (!map.has(floor)) map.set(floor, []); map.get(floor).push(room); return map; }, new Map());
    const floors = [...grouped.entries()].sort(([a], [b]) => Number(a) - Number(b));
    return <div className="grid gap-3 md:grid-cols-[88px_1fr]">
      <div className="space-y-2">{floors.slice(0, 5).map(([floor, list]) => <div key={floor} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}><p className="text-xs font-bold" style={{ color: 'var(--text)' }}>Floor {floor}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>{list.length} room{list.length === 1 ? '' : 's'}</p></div>)}</div>
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'linear-gradient(145deg,color-mix(in srgb,var(--accent) 8%,var(--surface)),var(--surface))' }}><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Property preview</p><h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>{floors.length ? `${floors.length} floors available` : 'No rooms published yet'}</h3></div><BedDouble size={18} style={{ color: 'var(--accent)' }} /></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{firstMeaningful(floors)?.[1]?.slice(0, 6).map((room) => <button key={room.id || room.roomNumber} type="button" onClick={() => onFocus(room)} className="rounded-xl border p-3 text-left" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><p className="text-xs font-bold" style={{ color: 'var(--text)' }}>Room {room.roomNumber || '—'}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>{room.roomType || room.type || 'Room'}</p><p className="mt-2 text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>{money(room.pricePerNight ?? room.nightlyRate ?? room.price, '/night')}</p></button>)}</div></div>
    </div>;
  }

  if (preset === 'TRAVEL_JOURNEY') {
    const trip = firstMeaningful(trips || []);
    if (!trip) return <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}><BusFront size={20} style={{ color: 'var(--accent)' }} /><p className="mt-3 text-sm font-bold" style={{ color: 'var(--text)' }}>No upcoming journey published</p><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>Publish a trip in Transit to preview the journey.</p></div>;
    const route = [trip.origin, trip.destination].filter(Boolean).join(' → ');
    return <button type="button" onClick={() => onFocus(trip)} className="w-full rounded-2xl border p-4 text-left" style={{ borderColor: 'var(--line)', background: 'linear-gradient(145deg,color-mix(in srgb,var(--accent) 8%,var(--surface)),var(--surface))' }}><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{route || trip.routeName || 'Journey'}</p><h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>{trip.vehicleType || 'Vehicle'} · {trip.departureAt ? new Date(trip.departureAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Departure time'}</h3></div><MapPin size={18} style={{ color: 'var(--accent)' }} /></div><div className="mt-3 grid grid-cols-3 gap-2"><span className="rounded-xl border px-3 py-2 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}>{money(trip.fareUsdc)}</span><span className="rounded-xl border px-3 py-2 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}>{trip.availableSeats ?? '—'} seats</span><span className="rounded-xl border px-3 py-2 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}>{trip.status || 'Scheduled'}</span></div></button>;
  }

  const items = (products || []).filter((item) => item?.isActive !== false && item?.isAvailable !== false).slice(0, 5);
  return <div className="grid gap-2 sm:grid-cols-2">{items.length ? items.map((item) => <button key={item.id || item.name} type="button" onClick={() => onFocus(item)} className="rounded-2xl border p-4 text-left" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}><p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{item.name || 'Service offering'}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{money(item.priceUsdc)}</p></button>) : <div className="rounded-2xl border p-5 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>Publish an offering to preview your service journey.</div>}</div>;
}

function Detail({ meta, blueprint, item, onClose, onCommit }) {
  const price = money(item?.priceUsdc ?? item?.fareUsdc ?? item?.pricePerNight ?? item?.nightlyRate ?? item?.price);
  const image = imageFor(item);
  return <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}>
    {image && <img src={image} alt="" className="h-36 w-full object-cover" />}
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>{blueprint?.detail?.presentation?.replaceAll('_', ' ') || meta.detailLabel}</p><h3 className="mt-1 text-lg font-black" style={{ color: 'var(--text)' }}>{item?.name || item?.roomNumber ? `Room ${item?.roomNumber || ''}` : item?.routeName || 'Selected offering'}</h3></div><button type="button" aria-label="Close preview" onClick={onClose} className="rounded-full p-2" style={{ color: 'var(--text-3)' }}><X size={16} /></button></div><p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-2)' }}>The customer stays inside the journey while this focused detail view exposes only the controls enabled by the Blueprint.</p><div className="mt-4 grid grid-cols-3 gap-2">{[['Gallery', blueprint?.detail?.showGallery !== false], ['Specs', blueprint?.detail?.showSpecifications !== false], ['Options', blueprint?.detail?.showOptions !== false]].map(([label, visible]) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: visible ? 'color-mix(in srgb,var(--accent) 45%,var(--line))' : 'var(--line)', background: 'var(--bg)' }}><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p><p className="mt-1 text-[10px] font-semibold" style={{ color: visible ? 'var(--text)' : 'var(--text-3)' }}>{visible ? 'Shown' : 'Hidden'}</p></div>)}</div><div className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Current decision</p><p className="mt-1 text-sm font-bold" style={{ color: 'var(--text)' }}>{price}</p></div><button type="button" onClick={onCommit} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ background: 'var(--accent)' }}><Check size={14} /> {meta.commitLabel}</button></div></div>
  </div>;
}

function Commit({ meta, blueprint, item, committed, onReplay }) {
  const style = blueprint?.commit?.style || 'MATERIAL';
  const label = item?.name || item?.roomNumber || item?.routeName || 'Selected offering';
  return <div className="rounded-2xl border p-6 text-center" style={{ borderColor: committed ? 'var(--accent)' : 'var(--line)', background: committed ? 'color-mix(in srgb,var(--accent) 9%,var(--surface))' : 'var(--surface)' }}><div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'color-mix(in srgb,var(--accent) 14%,var(--surface))', color: 'var(--accent)' }}>{committed ? <Check size={30} /> : <Package size={28} />}</div><h3 className="mt-4 text-base font-bold" style={{ color: 'var(--text)' }}>{committed ? 'Commit complete' : meta.commitLabel}</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5" style={{ color: 'var(--text-3)' }}>{committed ? `${label} is now represented as the customer’s chosen item. The production system remains authoritative for payment and fulfillment.` : `${style.replaceAll('_', ' ')} · ${label}`}</p>{committed && <button type="button" onClick={onReplay} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}><RotateCcw size={13} /> Replay</button>}</div>;
}

export default function ExperienceSimulatorLive({ blueprint, category, products = [], rooms = [], trips = [] }) {
  const preset = blueprint?.preset || CATEGORY_PRESETS[category?.toUpperCase()] || 'SERVICE_JOURNEY';
  const meta = META[preset] || META.SERVICE_JOURNEY;
  const speed = SPEEDS[blueprint?.motion?.tempo || 'BALANCED'];
  const [stage, setStage] = useState(0);
  const [focusedItem, setFocusedItem] = useState(null);
  const [committed, setCommitted] = useState(false);
  useEffect(() => { setStage(0); setFocusedItem(null); setCommitted(false); }, [preset, blueprint?.navigation?.mode, blueprint?.detail?.presentation, blueprint?.commit?.style]);
  const firstItem = useMemo(() => firstMeaningful(products) || firstMeaningful(rooms) || firstMeaningful(trips), [products, rooms, trips]);
  const activeItem = focusedItem || firstItem;
  const stageLabels = useMemo(() => [meta.browseLabel, activeItem?.name || activeItem?.roomNumber || activeItem?.routeName || 'Focus item', meta.detailLabel, meta.commitLabel], [meta, activeItem]);
  const focus = (item) => { setFocusedItem(item); setCommitted(false); setStage(2); };
  const next = () => { if (stage === 0) setStage(activeItem ? 1 : 0); else if (stage === 1) setStage(2); else if (stage === 2) { setCommitted(true); setStage(3); } else { setCommitted(false); setStage(2); } };
  return <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Live content simulator</p><h2 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>{meta.title}</h2><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{meta.eyebrow} · {(blueprint?.navigation?.mode || 'CONTEXTUAL').replaceAll('_', ' ').toLowerCase()} · {(blueprint?.motion?.tempo || 'BALANCED').toLowerCase()} motion</p></div><div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: 'var(--bg)', color: 'var(--accent)' }}><meta.icon size={19} /></div></div>
    <div className="p-5"><div className="flex gap-1.5" role="tablist" aria-label="Experience stages">{stageLabels.map((label, index) => <button key={`${label}-${index}`} type="button" role="tab" aria-selected={index === stage} aria-label={`Preview ${label}`} onClick={() => { setStage(index); if (index < 2) setCommitted(false); }} className="h-1.5 flex-1 rounded-full" style={{ background: index <= stage ? 'var(--accent)' : 'var(--line)' }} />)}</div><div className="mt-4 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Customer view</span><span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{stage + 1} / 4</span></div></div><div className="mt-4" style={{ transition: `opacity ${Math.max(180, speed / 2)}ms ease, transform ${speed}ms cubic-bezier(.2,.8,.2,1)` }} key={`${stage}-${activeItem?.id || activeItem?.name || activeItem?.roomNumber || ''}`}>{stage === 0 && <Browse preset={preset} speed={speed} products={products} rooms={rooms} trips={trips} onFocus={focus} />}{stage === 1 && <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)', background: 'radial-gradient(circle at 50% 0%,color-mix(in srgb,var(--accent) 10%,var(--surface)),var(--surface))' }}><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Focused item</p><h3 className="mt-3 text-lg font-black" style={{ color: 'var(--text)' }}>{activeItem?.name || (activeItem?.roomNumber ? `Room ${activeItem.roomNumber}` : activeItem?.routeName) || 'Choose an item from the customer view'}</h3><button type="button" onClick={() => setStage(2)} disabled={!activeItem} className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>Open {meta.detailLabel.toLowerCase()} <ChevronRight size={14} /></button></div>}{stage === 2 && <Detail meta={meta} blueprint={blueprint} item={activeItem} onClose={() => setStage(1)} onCommit={next} />}{stage === 3 && <Commit meta={meta} blueprint={blueprint} item={activeItem} committed={committed} onReplay={() => { setCommitted(false); setStage(2); }} />}</div><div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => { setStage(0); setCommitted(false); setFocusedItem(null); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}><RotateCcw size={13} /> Reset</button><button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: 'var(--accent)' }}>{stage === 3 ? 'Replay journey' : stage === 0 ? 'Open item' : stage === 1 ? 'Inspect details' : 'Complete action'} <ArrowRight size={13} /></button></div><p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--text-3)' }}>This preview uses your current catalog, room or trip data. It does not simulate live payment, inventory locks, authorization or fulfillment.</p></div>
  </div>;
}
