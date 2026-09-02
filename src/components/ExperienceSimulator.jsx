import { useEffect, useMemo, useState } from 'react';

const PRESETS = {
  DINING_JOURNEY: {
    eyebrow: 'Dining journey',
    title: 'A menu that feels like a place',
    browse: 'Turn through courses and specials',
    item: 'Chef’s peppered chicken',
    detail: 'Choose a portion, extras and how you want it served.',
    commit: 'Tear the order into the tray',
    accent: '🍽️',
  },
  SHOP_FLOOR: {
    eyebrow: 'Shop floor',
    title: 'A store you can move through',
    browse: 'Move across collections like aisles',
    item: 'Everyday carry set',
    detail: 'Pull the product forward, choose variants and quantities.',
    commit: 'Lift the product into the bag',
    accent: '🛍️',
  },
  BUILDING_WALK: {
    eyebrow: 'Building walk',
    title: 'Explore the property, then the room',
    browse: 'Move between floors and room clusters',
    item: 'Executive corner room',
    detail: 'Inspect the room before choosing the stay dates.',
    commit: 'Reserve the stay',
    accent: '🏨',
  },
  TRAVEL_JOURNEY: {
    eyebrow: 'Travel journey',
    title: 'Understand the trip before the seat',
    browse: 'Follow the departure timeline',
    item: 'Window seat A12',
    detail: 'See coach position, fare and passenger context.',
    commit: 'Confirm the seat',
    accent: '🚌',
  },
  SERVICE_JOURNEY: {
    eyebrow: 'Service journey',
    title: 'A guided path to the right service',
    browse: 'Discover the service that fits',
    item: 'Consultation session',
    detail: 'Review what is included and how the appointment works.',
    commit: 'Continue to confirmation',
    accent: '✨',
  },
};

const CATEGORY_LABELS = {
  FOOD_BEVERAGE: 'Restaurant',
  RESTAURANT: 'Restaurant',
  RETAIL: 'Retail',
  HOSPITALITY: 'Hotel',
  HOTEL: 'Hotel',
  LOGISTICS: 'Transit',
  TRANSIT: 'Transit',
};

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

function DetailPreview({ blueprint, meta }) {
  const presentation = blueprint?.detail?.presentation || 'MORPH';
  const grounded = ['DISH_DOSSIER', 'PRODUCT_DOSSIER', 'ROOM_DOSSIER', 'SEAT_DOSSIER', 'SERVICE_DOSSIER'].includes(presentation);
  return (
    <div className="relative min-h-[250px] overflow-hidden rounded-2xl border p-3" style={{ borderColor: 'var(--line)', background: 'radial-gradient(circle at 35% 10%, color-mix(in srgb, var(--accent) 14%, var(--bg)), var(--bg) 60%)' }}>
      <div className="absolute inset-0 opacity-40" style={{ background: 'linear-gradient(120deg, transparent 20%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 80%)' }} />
      <div className={`relative mx-auto flex h-full max-w-sm flex-col overflow-hidden rounded-[1.35rem] border shadow-xl ${grounded ? 'mt-8' : 'mt-2'}`} style={{ borderColor: 'var(--line)', background: 'var(--surface)', transition: 'transform 420ms cubic-bezier(.2,.8,.2,1), margin 420ms cubic-bezier(.2,.8,.2,1)' }}>
        <div className="h-28" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, var(--surface)), var(--line))' }} />
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{presentation.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--text)' }}>{meta.item}</p>
            </div>
            <span className="rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>{blueprint?.detail?.showGallery ? 'Gallery' : 'Details'}</span>
          </div>
          <p className="text-xs leading-5" style={{ color: 'var(--text-3)' }}>{meta.detail}</p>
          <div className="grid grid-cols-3 gap-2">
            {[['Gallery', blueprint?.detail?.showGallery], ['Specs', blueprint?.detail?.showSpecifications], ['Options', blueprint?.detail?.showOptions]].map(([label, visible]) => (
              <div key={label} className="rounded-lg border p-2" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p>
                <p className="mt-1 text-[10px] font-semibold" style={{ color: visible ? 'var(--accent)' : 'var(--text-3)' }}>{visible ? 'Shown' : 'Hidden'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavigationPreview({ mode, meta }) {
  if (mode === 'FLOOR_TRAVERSE') {
    return (
      <div className="grid grid-cols-[74px_1fr] gap-3">
        <div className="space-y-2">
          {[4, 3, 2, 1].map((floor) => <div key={floor} className="rounded-lg border px-2 py-3 text-center text-[10px] font-bold" style={{ borderColor: floor === 3 ? 'var(--accent)' : 'var(--line)', color: floor === 3 ? 'var(--accent)' : 'var(--text-3)' }}>F{floor}</div>)}
        </div>
        <div className="relative overflow-hidden rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          {[0, 1, 2].map((row) => <div key={row} className="mb-2 flex gap-2">{[0, 1, 2].map((col) => <div key={col} className="h-14 flex-1 rounded-lg border" style={{ borderColor: row === 1 && col === 1 ? 'var(--accent)' : 'var(--line)', background: row === 1 && col === 1 ? 'color-mix(in srgb, var(--accent) 9%, var(--surface))' : 'var(--bg)' }} />)}</div>)}
        </div>
      </div>
    );
  }

  if (mode === 'AISLE_TRAVERSE') {
    return (
      <div className="overflow-hidden rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="mb-3 flex gap-2 overflow-hidden">{['New', 'Best sellers', 'Home', 'Travel'].map((label, index) => <div key={label} className="min-w-[88px] rounded-lg border px-3 py-2 text-[10px] font-semibold" style={{ borderColor: index === 1 ? 'var(--accent)' : 'var(--line)', color: index === 1 ? 'var(--accent)' : 'var(--text-3)' }}>{label}</div>)}</div>
        <div className="flex gap-2">{[0, 1, 2].map((index) => <div key={index} className="min-w-[115px] rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}><div className="h-20 rounded-lg" style={{ background: 'var(--line)' }} /><p className="mt-2 text-[10px] font-semibold" style={{ color: 'var(--text)' }}>{index === 1 ? meta.item : `Collection ${index + 1}`}</p></div>)}</div>
      </div>
    );
  }

  if (mode === 'JOURNEY_TIMELINE') {
    return (
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="relative ml-2 border-l pl-5" style={{ borderColor: 'var(--line)' }}>
          {['Departure', 'Coach', 'Seat', 'Board'].map((label, index) => (
            <div key={label} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[26px] top-0 grid h-3 w-3 place-items-center rounded-full border-2" style={{ borderColor: index <= 1 ? 'var(--accent)' : 'var(--line)', background: 'var(--bg)' }} />
              <p className="text-[10px] font-semibold" style={{ color: index <= 1 ? 'var(--text)' : 'var(--text-3)' }}>{label}</p>
              <p className="mt-1 text-[9px]" style={{ color: 'var(--text-3)' }}>{index === 0 ? '08:40 · Accra' : index === 1 ? 'Coach 04 · 32 seats' : 'Choose when ready'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {['Context', 'Explore', 'Next'].map((label, index) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: index === 0 ? 'var(--accent)' : 'var(--line)', background: 'var(--surface)' }}><div className="h-16 rounded-lg" style={{ background: index === 0 ? 'color-mix(in srgb, var(--accent) 11%, var(--bg))' : 'var(--bg)' }} /><p className="mt-2 text-[10px] font-semibold" style={{ color: 'var(--text)' }}>{label}</p></div>)}
    </div>
  );
}

function CommitPreview({ style, meta, committed }) {
  const labels = {
    PAPER_RIP: 'Tear into tray',
    LIFT_INTO_TRAY: 'Lift into bag',
    MATERIAL: 'Confirm selection',
  };
  return (
    <div className="relative min-h-[210px] overflow-hidden rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className={`mx-auto max-w-xs rounded-2xl border p-4 text-center shadow-sm ${committed ? 'scale-[1.02]' : ''}`} style={{ borderColor: committed ? 'var(--accent)' : 'var(--line)', background: 'var(--bg)', transition: 'all 420ms cubic-bezier(.2,.8,.2,1)' }}>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-xl" style={{ background: 'color-mix(in srgb, var(--accent) 13%, var(--surface))' }}>{committed ? '✓' : meta.accent}</div>
        <p className="mt-3 text-sm font-bold" style={{ color: 'var(--text)' }}>{committed ? 'Commit complete' : labels[style] || meta.commit}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{style.replaceAll('_', ' ')} · {meta.commit}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}><div className="h-full rounded-full" style={{ width: committed ? '100%' : '42%', background: 'var(--accent)', transition: 'width 520ms cubic-bezier(.2,.8,.2,1)' }} /></div>
      </div>
    </div>
  );
}

export default function ExperienceSimulator({ blueprint, category }) {
  const [stage, setStage] = useState(0);
  const [lastCommitted, setLastCommitted] = useState(false);

  const meta = PRESETS[blueprint?.preset] || PRESETS.SERVICE_JOURNEY;
  const categoryLabel = CATEGORY_LABELS[category?.toUpperCase()] || 'Business';
  const detailLabel = blueprint?.detail?.presentation || 'MORPH';
  const navigationLabel = blueprint?.navigation?.mode || 'CONTEXTUAL';
  const commitStyle = blueprint?.commit?.style || 'MATERIAL';
  const tempo = blueprint?.motion?.tempo || 'BALANCED';

  const stages = useMemo(() => [meta.browse, meta.item, meta.detail, meta.commit], [meta]);

  useEffect(() => {
    setStage(0);
    setLastCommitted(false);
  }, [blueprint?.preset, navigationLabel, detailLabel, commitStyle]);

  function advance() {
    if (stage >= stages.length - 1) {
      setLastCommitted(true);
      return;
    }
    setLastCommitted(false);
    setStage((current) => current + 1);
  }

  function reset() {
    setStage(0);
    setLastCommitted(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <style>{`${REDUCED_MOTION} { .azm-experience-transition { transition: none !important; animation: none !important; } }`}</style>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Live journey simulator</p>
          <h2 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>{meta.title}</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{categoryLabel} · {navigationLabel.replaceAll('_', ' ').toLowerCase()} · {tempo.toLowerCase()} motion</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl text-xl" style={{ background: 'var(--bg)' }} aria-hidden="true">{meta.accent}</div>
      </div>

      <div className="p-5">
        <div className="rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--line)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface))' }}>
          <div className="mb-4 flex items-center gap-2">
            {stages.map((label, index) => <button key={`${label}-${index}`} type="button" onClick={() => { setLastCommitted(false); setStage(index); }} className="h-1.5 flex-1 rounded-full" style={{ background: index <= stage ? 'var(--accent)' : 'var(--line)' }} aria-label={`Preview ${label}`} />)}
          </div>

          <div className="mb-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
            <span>Customer view</span>
            <span>{Math.min(stage + 1, stages.length)} / {stages.length}</span>
          </div>

          <div className="azm-experience-transition" style={{ transition: 'opacity 220ms ease, transform 320ms cubic-bezier(.2,.8,.2,1)' }} key={`${stage}-${detailLabel}-${commitStyle}`}>
            {stage === 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>{meta.eyebrow}</p>
                  <p className="mt-2 text-lg font-bold" style={{ color: 'var(--text)' }}>{meta.browse}</p>
                </div>
                <NavigationPreview mode={navigationLabel} meta={meta} />
              </div>
            )}

            {stage === 1 && <DetailPreview blueprint={blueprint} meta={meta} />}

            {stage === 2 && (
              <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Customer context</p><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{blueprint?.customerContext?.enabled ? 'Context can be surfaced where the category supports it.' : 'Context is intentionally quiet.'}</p></div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))', color: 'var(--accent)' }}>{blueprint?.customerContext?.enabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Table', blueprint?.customerContext?.tableNumber], ['Service', blueprint?.customerContext?.serviceMode], ['Passenger', blueprint?.customerContext?.passenger]].map(([label, enabled]) => <div key={label} className="rounded-xl border p-3" style={{ borderColor: enabled ? 'var(--accent)' : 'var(--line)', background: enabled ? 'color-mix(in srgb, var(--accent) 7%, var(--surface))' : 'var(--surface)' }}><p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p><p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text)' }}>{enabled ? 'Included' : 'Quiet'}</p></div>)}
                </div>
              </div>
            )}

            {stage === 3 && <CommitPreview style={commitStyle} meta={meta} committed={lastCommitted} />}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={reset} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}>Reset</button>
            <button type="button" onClick={advance} className="rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: 'var(--accent)' }}>
              {stage === 3 ? (lastCommitted ? 'Replay commit' : 'Try commitment') : 'Continue journey'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--text-3)' }}>
          This simulator previews the interaction grammar selected for this storefront. Availability, pricing, authorization and transaction state remain live-system concerns.
        </p>
      </div>
    </div>
  );
}
