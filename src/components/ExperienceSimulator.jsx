import { useMemo, useState } from 'react';

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
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Live journey simulator</p>
          <h2 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>{meta.title}</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{categoryLabel} · {navigationLabel.replaceAll('_', ' ').toLowerCase()}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl text-xl" style={{ background: 'var(--bg)' }} aria-hidden="true">
          {meta.accent}
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--line)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface))' }}>
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
            <span>Customer view</span>
            <span>{Math.min(stage + 1, stages.length)} / {stages.length}</span>
          </div>

          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
            {stage === 0 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-1.5 flex-1 rounded-full" style={{ background: index === 0 ? 'var(--accent)' : 'var(--line)' }} />
                  ))}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>{meta.eyebrow}</p>
                  <p className="mt-2 text-lg font-bold" style={{ color: 'var(--text)' }}>{meta.browse}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['01', '02', '03'].map((number) => (
                    <div key={number} className="aspect-[1.15] rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                      <div className="h-2 w-1/2 rounded" style={{ background: 'var(--line)' }} />
                      <div className="mt-3 h-2 w-4/5 rounded" style={{ background: 'var(--line)' }} />
                      <p className="mt-5 text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{number}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'var(--surface)', color: 'var(--text-3)' }}>{detailLabel.replaceAll('_', ' ')}</span>
                  <button type="button" onClick={reset} className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Back</button>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}>
                  <div className="h-28 rounded-xl" style={{ background: 'linear-gradient(135deg, var(--line), var(--bg))' }} />
                  <p className="mt-3 text-sm font-bold" style={{ color: 'var(--text)' }}>{meta.item}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{meta.detail}</p>
                </div>
              </div>
            )}

            {stage === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Focused detail</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{meta.detail}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Gallery</p>
                    <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text)' }}>{blueprint?.detail?.showGallery ? 'Visible' : 'Hidden'}</p>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Options</p>
                    <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text)' }}>{blueprint?.detail?.showOptions ? 'Enabled' : 'Hidden'}</p>
                  </div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Customer context</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>{blueprint?.customerContext?.enabled ? 'On' : 'Off'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {blueprint?.customerContext?.tableNumber && <span className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>Table</span>}
                    {blueprint?.customerContext?.serviceMode && <span className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>Service mode</span>}
                    {blueprint?.customerContext?.passenger && <span className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>Passenger</span>}
                  </div>
                </div>
              </div>
            )}

            {stage === 3 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 13%, var(--surface))' }}>
                  <span className="text-2xl">{lastCommitted ? '✓' : meta.accent}</span>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{lastCommitted ? 'Customer commitment complete' : meta.commit}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>
                    {commitStyle.replaceAll('_', ' ')} · {tempo.toLowerCase()} motion · {blueprint?.commit?.persistentTray ? 'persistent tray/bag' : 'session tray'}
                  </p>
                </div>
                <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
                  <div className="h-full rounded-full" style={{ width: lastCommitted ? '100%' : '35%', background: 'var(--accent)', transition: 'width 420ms ease' }} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={reset} className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}>Reset</button>
            <button type="button" onClick={advance} className="rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: 'var(--accent)' }}>
              {stage === 3 ? 'Commit again' : 'Try next step'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--text-3)' }}>
          This simulator previews interaction intent only. Customer data, availability, pricing and authorization still come from the live storefront and backend.
        </p>
      </div>
    </div>
  );
}
