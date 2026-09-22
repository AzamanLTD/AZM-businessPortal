import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, BusFront, Check, ChevronRight, CircleDot, Layers3, MapPin, Package, RotateCcw, ShoppingBag, Sparkles, Utensils, X } from 'lucide-react';

const SCENES = {
  DINING_JOURNEY: {
    eyebrow: 'Dining journey',
    title: 'Browse the menu like a place, not a list',
    browseLabel: 'Turn the menu',
    detailLabel: 'Dish dossier',
    commitLabel: 'Add to tray',
    item: 'Peppered chicken',
    price: '$14',
    icon: Utensils,
    accent: '#d89a3a',
  },
  SHOP_FLOOR: {
    eyebrow: 'Shop floor',
    title: 'Move through collections and pull products forward',
    browseLabel: 'Walk the shelf',
    detailLabel: 'Product dossier',
    commitLabel: 'Lift into bag',
    item: 'Everyday carry set',
    price: '$48',
    icon: ShoppingBag,
    accent: '#72a7ff',
  },
  BUILDING_WALK: {
    eyebrow: 'Building walk',
    title: 'Move through a property before choosing a room',
    browseLabel: 'Traverse floors',
    detailLabel: 'Room dossier',
    commitLabel: 'Reserve room',
    item: 'Executive corner room',
    price: '$124/night',
    icon: BedDouble,
    accent: '#b8a6ff',
  },
  TRAVEL_JOURNEY: {
    eyebrow: 'Travel journey',
    title: 'Understand the trip before choosing your seat',
    browseLabel: 'Follow the journey',
    detailLabel: 'Seat dossier',
    commitLabel: 'Choose seat',
    item: 'Window seat A12',
    price: '$18',
    icon: BusFront,
    accent: '#68d8b5',
  },
  SERVICE_JOURNEY: {
    eyebrow: 'Service journey',
    title: 'A calm path from discovery to a clear next step',
    browseLabel: 'Discover service',
    detailLabel: 'Service dossier',
    commitLabel: 'Continue',
    item: 'Consultation session',
    price: '$65',
    icon: Sparkles,
    accent: '#9bc7ff',
  },
};

const CATEGORY_PRESETS = {
  FOOD_BEVERAGE: 'DINING_JOURNEY',
  RESTAURANT: 'DINING_JOURNEY',
  RETAIL: 'SHOP_FLOOR',
  HOSPITALITY: 'BUILDING_WALK',
  HOTEL: 'BUILDING_WALK',
  LOGISTICS: 'TRAVEL_JOURNEY',
  TRANSIT: 'TRAVEL_JOURNEY',
};

const SPEEDS = { RELAXED: 520, BALANCED: 360, QUICK: 240 };

function transitionClass() {
  return 'transition-[transform,opacity,box-shadow,border-color] duration-300 ease-out';
}

function StageDots({ stage, labels, onSelect }) {
  return (
    <div className="flex gap-1.5" role="tablist" aria-label="Experience stages">
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={index === stage}
          aria-label={`Preview ${label}`}
          onClick={() => onSelect(index)}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: index <= stage ? 'var(--accent)' : 'var(--line)' }}
        />
      ))}
    </div>
  );
}

function RestaurantBrowse({ onFocus, speed }) {
  const [page, setPage] = useState(0);
  const dishes = ['Peppered chicken', 'Jollof + grilled fish', 'Garden salad'];
  return (
    <div className="relative overflow-hidden rounded-2xl border p-3" style={{ borderColor: 'var(--line)', background: 'linear-gradient(135deg, #fbf2df, #efe1c5)' }}>
      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#7a694d' }}>
        <span>Chapter {page + 1}</span><span>{page + 1} / 3</span>
      </div>
      <div className={`rounded-xl border bg-white/70 p-4 shadow-sm ${transitionClass()}`} style={{ transform: `rotate(${page % 2 ? -0.5 : 0.5}deg)`, borderColor: '#e2cfab', transitionDuration: `${speed}ms` }}>
        <div className="flex items-center justify-between">
          <div><p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: '#987f52' }}>House signatures</p><h3 className="mt-1 text-lg font-black" style={{ color: '#2d2416' }}>Tonight’s table</h3></div>
          <Utensils size={20} style={{ color: '#a77b32' }} />
        </div>
        <div className="mt-4 space-y-2">
          {dishes.map((dish, index) => (
            <button key={dish} type="button" onClick={() => onFocus(dish)} className="flex w-full items-center justify-between rounded-xl border bg-white/70 p-3 text-left hover:-translate-y-0.5" style={{ borderColor: '#eadabd' }}>
              <div><p className="text-sm font-semibold" style={{ color: '#2d2416' }}>{dish}</p><p className="mt-0.5 text-[10px]" style={{ color: '#8b7a5a' }}>{index === 0 ? 'charred • pepper glaze' : index === 1 ? 'signature • sharing' : 'fresh • light'}</p></div>
              <ChevronRight size={16} style={{ color: '#a17b42' }} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-between">
        <button type="button" aria-label="Previous menu page" className="rounded-full border p-2" style={{ borderColor: '#d8c4a0', color: '#654f2d' }} onClick={() => setPage((p) => Math.max(0, p - 1))}><ArrowLeft size={15} /></button>
        <button type="button" aria-label="Next menu page" className="rounded-full border p-2" style={{ borderColor: '#d8c4a0', color: '#654f2d' }} onClick={() => setPage((p) => Math.min(2, p + 1))}><ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

function RetailBrowse({ onFocus }) {
  const products = ['Everyday carry set', 'Travel bottle', 'Canvas tote'];
  return (
    <div className="overflow-hidden rounded-2xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Collection</p><h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>Best sellers</h3></div><Layers3 size={18} style={{ color: 'var(--accent)' }} /></div>
      <div className="grid grid-cols-3 gap-2">
        {products.map((product, index) => (
          <button key={product} type="button" onClick={() => onFocus(product)} className="group rounded-xl border p-2 text-left hover:-translate-y-1" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
            <div className="h-24 rounded-lg" style={{ background: index === 1 ? 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 28%, var(--bg)), var(--line))' : 'linear-gradient(145deg, var(--line), color-mix(in srgb, var(--accent) 10%, var(--bg)))' }} />
            <p className="mt-2 line-clamp-2 text-[11px] font-semibold" style={{ color: 'var(--text)' }}>{product}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold" style={{ color: 'var(--text-3)' }}>View <ChevronRight size={10} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HotelBrowse({ onFocus }) {
  const [floor, setFloor] = useState(3);
  const rooms = floor === 3 ? ['301', '302', '303'] : ['401', '402', '403'];
  return (
    <div className="grid grid-cols-[74px_1fr] gap-3">
      <div className="space-y-2">
        {[4, 3, 2, 1].map((value) => (
          <button key={value} type="button" onClick={() => setFloor(value)} className="w-full rounded-xl border px-2 py-3 text-center" style={{ borderColor: value === floor ? 'var(--accent)' : 'var(--line)', color: value === floor ? 'var(--accent)' : 'var(--text-3)', background: value === floor ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)' }}>
            <div className="text-[10px] font-bold">F{value}</div><div className="mt-1 text-[9px]">{value === 3 ? '3 open' : value === 4 ? '2 open' : '—'}</div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--line)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 7%, var(--surface)), var(--surface))' }}>
        <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Floor {floor}</p><h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>Rooms with availability</h3></div><BedDouble size={18} style={{ color: 'var(--accent)' }} /></div>
        <div className="grid grid-cols-3 gap-2">
          {rooms.map((room, index) => (
            <button key={room} type="button" onClick={() => onFocus(`Room ${room}`)} className="rounded-xl border p-3 text-left" style={{ borderColor: index === 1 ? 'var(--accent)' : 'var(--line)', background: index === 1 ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--bg)' }}>
              <div className="h-10 rounded-lg" style={{ background: 'var(--line)' }} /><p className="mt-2 text-[11px] font-bold" style={{ color: 'var(--text)' }}>Room {room}</p><p className="mt-1 text-[9px]" style={{ color: 'var(--text-3)' }}>{index === 1 ? 'Executive' : 'Deluxe'}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransitBrowse({ onFocus }) {
  const seats = ['A11', 'A12', 'A13', 'B11', 'B12', 'B13'];
  const [selected, setSelected] = useState('A12');
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 7%, var(--surface)), var(--surface))' }}>
      <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Accra → Kumasi</p><h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>Coach 04 · 08:40</h3></div><MapPin size={18} style={{ color: 'var(--accent)' }} /></div>
      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
        <div className="mb-3 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}><CircleDot size={12} style={{ color: 'var(--accent)' }} /> Front</div>
        <div className="grid grid-cols-3 gap-2">
          {seats.map((seat) => {
            const active = seat === selected;
            const occupied = seat === 'B12';
            return <button key={seat} type="button" disabled={occupied} aria-label={`Seat ${seat}${occupied ? ' occupied' : ''}`} onClick={() => { setSelected(seat); onFocus(`Seat ${seat}`); }} className="rounded-xl border px-2 py-3 text-xs font-bold" style={{ borderColor: active ? 'var(--accent)' : 'var(--line)', background: active ? 'color-mix(in srgb, var(--accent) 12%, var(--surface))' : occupied ? 'var(--line)' : 'var(--surface)', color: occupied ? 'var(--text-3)' : 'var(--text)' }}>{seat}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

function GenericBrowse({ onFocus }) {
  return <div className="grid grid-cols-3 gap-2">{['Discover', 'Inspect', 'Continue'].map((label, index) => <button key={label} type="button" onClick={() => onFocus(label)} className="rounded-2xl border p-3 text-left" style={{ borderColor: index === 1 ? 'var(--accent)' : 'var(--line)', background: 'var(--surface)' }}><div className="h-20 rounded-xl" style={{ background: index === 1 ? 'color-mix(in srgb, var(--accent) 11%, var(--bg))' : 'var(--bg)' }} /><p className="mt-2 text-xs font-bold" style={{ color: 'var(--text)' }}>{label}</p></button>)}</div>;
}

function DetailView({ meta, blueprint, item, onClose, onCommit }) {
  const presentation = blueprint?.detail?.presentation || 'MORPH';
  const grounded = presentation !== 'MORPH';
  const Icon = meta.icon;
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${transitionClass()}`} style={{ borderColor: 'var(--accent)', background: 'radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent) 16%, var(--surface)), var(--surface))' }}>
      <div className={`flex items-start gap-4 ${grounded ? 'pt-4' : ''}`}>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)' }}><Icon size={28} /></div>
        <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{presentation.replaceAll('_', ' ')}</p><h3 className="mt-1 text-base font-black" style={{ color: 'var(--text)' }}>{item || meta.item}</h3></div><button type="button" aria-label="Close detail" onClick={onClose} className="rounded-full p-2" style={{ color: 'var(--text-3)' }}><X size={16} /></button></div><p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-2)' }}>A focused {meta.detailLabel.toLowerCase()} keeps the decision in context while exposing only the information needed for the next action.</p></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">{['Gallery', 'Specifications', 'Options'].map((label, index) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: blueprint?.detail?.[`show${label}`] === false ? 'var(--line)' : 'color-mix(in srgb, var(--accent) 45%, var(--line))', background: 'var(--bg)' }}><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p><p className="mt-1 text-[10px] font-semibold" style={{ color: index === 2 && blueprint?.detail?.showOptions === false ? 'var(--text-3)' : 'var(--text)' }}>{index === 0 ? (blueprint?.detail?.showGallery === false ? 'Hidden' : 'Shown') : index === 1 ? (blueprint?.detail?.showSpecifications === false ? 'Hidden' : 'Shown') : (blueprint?.detail?.showOptions === false ? 'Hidden' : 'Shown')}</p></div>)}</div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Decision</p><p className="mt-1 text-sm font-bold" style={{ color: 'var(--text)' }}>{meta.price}</p></div><button type="button" onClick={onCommit} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ background: 'var(--accent)' }}><Check size={14} /> {meta.commitLabel}</button></div>
    </div>
  );
}

function CommitView({ meta, blueprint, committed, onReplay }) {
  const style = blueprint?.commit?.style || 'MATERIAL';
  return (
    <div className="relative overflow-hidden rounded-2xl border p-6 text-center" style={{ borderColor: committed ? 'var(--accent)' : 'var(--line)', background: committed ? 'color-mix(in srgb, var(--accent) 9%, var(--surface))' : 'var(--surface)' }}>
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${transitionClass()}`} style={{ background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))', color: 'var(--accent)', transform: committed ? 'scale(1.08)' : 'scale(1)' }}>{committed ? <Check size={30} /> : <Package size={28} />}</div>
      <h3 className="mt-4 text-base font-bold" style={{ color: 'var(--text)' }}>{committed ? 'Commit complete' : meta.commitLabel}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5" style={{ color: 'var(--text-3)' }}>{committed ? 'The interaction completes here. The real checkout, inventory, payment and availability state remain owned by the production system.' : `${style.replaceAll('_', ' ')} is the physical metaphor selected for this journey.`}</p>
      {committed && <button type="button" onClick={onReplay} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}><RotateCcw size={13} /> Replay</button>}
    </div>
  );
}

export default function ExperienceSimulatorV2({ blueprint, category }) {
  const preset = blueprint?.preset || CATEGORY_PRESETS[category?.toUpperCase()] || 'SERVICE_JOURNEY';
  const meta = SCENES[preset] || SCENES.SERVICE_JOURNEY;
  const speed = SPEEDS[blueprint?.motion?.tempo || 'BALANCED'];
  const [stage, setStage] = useState(0);
  const [focusedItem, setFocusedItem] = useState(null);
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    setStage(0);
    setFocusedItem(null);
    setCommitted(false);
  }, [preset, blueprint?.navigation?.mode, blueprint?.detail?.presentation, blueprint?.commit?.style]);

  const stageLabels = useMemo(() => [meta.browseLabel, meta.item, meta.detailLabel, meta.commitLabel], [meta]);

  const selectFocus = (item) => {
    setFocusedItem(item);
    setStage(2);
    setCommitted(false);
  };

  const commit = () => {
    setStage(3);
    setCommitted(true);
  };

  const Browse = () => {
    switch (preset) {
      case 'DINING_JOURNEY': return <RestaurantBrowse onFocus={selectFocus} speed={speed} />;
      case 'SHOP_FLOOR': return <RetailBrowse onFocus={selectFocus} />;
      case 'BUILDING_WALK': return <HotelBrowse onFocus={selectFocus} />;
      case 'TRAVEL_JOURNEY': return <TransitBrowse onFocus={selectFocus} />;
      default: return <GenericBrowse onFocus={selectFocus} />;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Interactive experience lab</p><h2 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>{meta.title}</h2><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{meta.eyebrow} · {blueprint?.navigation?.mode?.replaceAll('_', ' ').toLowerCase() || 'contextual'} · {(blueprint?.motion?.tempo || 'BALANCED').toLowerCase()} motion</p></div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: 'var(--bg)' }} aria-hidden="true"><meta.icon size={19} style={{ color: meta.accent }} /></div>
      </div>

      <div className="p-5">
        <StageDots stage={stage} labels={stageLabels} onSelect={(index) => { setStage(index); if (index < 2) setFocusedItem(null); if (index !== 3) setCommitted(false); }} />
        <div className="mt-4 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Customer view</span><span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{stage + 1} / 4</span></div>

        <div className="mt-4" key={`${stage}-${preset}-${focusedItem || ''}`} style={{ transition: `opacity ${Math.max(180, speed / 2)}ms ease, transform ${speed}ms cubic-bezier(.2,.8,.2,1)` }}>
          {stage === 0 && <Browse />}
          {stage === 1 && <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)', background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))' }}><p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>Focused item</p><div className="mx-auto mt-3 grid h-16 w-16 place-items-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))', color: 'var(--accent)' }}><meta.icon size={28} /></div><h3 className="mt-4 text-lg font-black" style={{ color: 'var(--text)' }}>{meta.item}</h3><p className="mt-2 text-xs" style={{ color: 'var(--text-3)' }}>Tap into the detail experience instead of leaving the current journey.</p><button type="button" onClick={() => { setFocusedItem(meta.item); setStage(2); }} className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>Open {meta.detailLabel.toLowerCase()} <ChevronRight size={14} /></button></div>}
          {stage === 2 && <DetailView meta={meta} blueprint={blueprint} item={focusedItem || meta.item} onClose={() => setStage(1)} onCommit={commit} />}
          {stage === 3 && <CommitView meta={meta} blueprint={blueprint} committed={committed} onReplay={() => { setCommitted(false); setStage(2); }} />}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => { setStage(0); setFocusedItem(null); setCommitted(false); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}><RotateCcw size={13} /> Reset</button><button type="button" onClick={() => { if (stage < 3) setStage((value) => Math.min(3, value + 1)); else { setStage(2); setCommitted(false); } }} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: 'var(--accent)' }}>{stage === 3 ? 'Replay journey' : stage === 0 ? 'Open item' : stage === 1 ? 'Inspect details' : 'Complete action'} <ArrowRight size={13} /></button></div>
        <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--text-3)' }}>This is a fidelity preview of the published interaction grammar. It demonstrates the experience shape without pretending to simulate live inventory, pricing, payment, authorization or fulfillment.</p>
      </div>
    </div>
  );
}
