import { useEffect, useMemo, useState } from 'react';
import { storefrontApi } from '@/services/storefrontApi';

const PRESET_META = {
  DINING_JOURNEY: {
    title: 'Dining journey',
    description: 'Customers browse like a menu, open dishes into a focused order view, and add choices into a living tray.',
    steps: ['Browse chapters', 'Open dish', 'Choose size / options', 'Send to tray'],
  },
  SHOP_FLOOR: {
    title: 'Shop floor',
    description: 'Customers move through collections like aisles, pull products forward, and build a bag without losing their place.',
    steps: ['Move through aisles', 'Pull product forward', 'Choose variants', 'Lift into bag'],
  },
  BUILDING_WALK: {
    title: 'Building walk',
    description: 'Customers travel through floors and room clusters, then open a room into a visual stay dossier.',
    steps: ['Traverse floors', 'Inspect room', 'Review gallery / specs', 'Reserve stay'],
  },
  TRAVEL_JOURNEY: {
    title: 'Travel journey',
    description: 'Customers follow the journey from departure context into the vehicle and seat-selection experience.',
    steps: ['Choose departure', 'Understand coach', 'Choose seat', 'Board / book'],
  },
  SERVICE_JOURNEY: {
    title: 'Service journey',
    description: 'A calm, guided path from service discovery to a clear appointment or service commitment.',
    steps: ['Discover service', 'Open service', 'Confirm details', 'Commit'],
  },
};

const CATEGORY_PRESETS = {
  FOOD_BEVERAGE: ['DINING_JOURNEY'],
  RESTAURANT: ['DINING_JOURNEY'],
  RETAIL: ['SHOP_FLOOR'],
  HOSPITALITY: ['BUILDING_WALK'],
  HOTEL: ['BUILDING_WALK'],
  LOGISTICS: ['TRAVEL_JOURNEY'],
  TRANSIT: ['TRAVEL_JOURNEY'],
};

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
        {description && <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`} style={{ borderColor: 'var(--line)' }}>
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function ExperienceStudio() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    storefrontApi.getExperience()
      .then((response) => {
        if (!active) return;
        setData(response);
        setDraft(response.blueprint);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Could not load experience settings.');
      });
    return () => { active = false; };
  }, []);

  const category = data?.category?.toUpperCase() || '';
  const availablePresets = CATEGORY_PRESETS[category] || Object.keys(PRESET_META);
  const presetMeta = PRESET_META[draft?.preset] || PRESET_META.SERVICE_JOURNEY;

  const patch = (path, value) => {
    setDraft((current) => {
      const next = structuredClone(current);
      let target = next;
      const parts = path.split('.');
      const leaf = parts.pop();
      for (const part of parts) target = target[part];
      target[leaf] = value;
      return next;
    });
    setMessage('');
  };

  const allowedCommitStyles = useMemo(() => {
    const values = data?.commitStyles || [];
    if (draft?.preset === 'DINING_JOURNEY') return values.filter((value) => value === 'PAPER_RIP' || value === 'MATERIAL');
    if (draft?.preset === 'BUILDING_WALK' || draft?.preset === 'SHOP_FLOOR') return values.filter((value) => value === 'LIFT_INTO_TRAY' || value === 'MATERIAL');
    return values;
  }, [data, draft?.preset]);

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await storefrontApi.saveExperience(draft);
      setDraft(saved);
      setMessage('Experience saved. It is now ready for the storefront renderer.');
    } catch (err) {
      setError(err?.message || 'Could not save experience settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: error ? 'var(--danger)' : 'var(--text-3)' }}>{error || 'Loading Experience Studio…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>Experience Studio</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Design how customers move through your business</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              This is not a page builder. AZM owns the interaction grammar and accessibility; you control the character, context and transaction feel.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? 'Saving…' : 'Save experience'}
          </button>
        </header>

        {(message || error) && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: error ? 'var(--danger)' : 'var(--line)', color: error ? 'var(--danger)' : 'var(--text-2)', background: 'var(--surface)' }}>
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Section
              title="Journey preset"
              description="The preset determines the interaction language available to customers. Your business type constrains what can be selected."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {availablePresets.map((preset) => {
                  const meta = PRESET_META[preset];
                  const active = draft.preset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, preset }))}
                      className="text-left rounded-xl border p-4 transition"
                      style={{ borderColor: active ? 'var(--accent)' : 'var(--line)', background: active ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{meta.title}</span>
                        {active && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Active</span>}
                      </div>
                      <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{meta.description}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Customer context" description="Let the experience acknowledge useful real-world context without making it mandatory.">
              <div className="space-y-2">
                <Toggle label="Use contextual information when available" checked={draft.customerContext.enabled} onChange={(value) => patch('customerContext.enabled', value)} />
                {'tableNumber' in draft.customerContext && (
                  <Toggle label="Offer table number for dine-in customers" checked={draft.customerContext.tableNumber === true} onChange={(value) => patch('customerContext.tableNumber', value)} />
                )}
                {'serviceMode' in draft.customerContext && (
                  <Toggle label="Remember service mode (dine-in / takeaway)" checked={draft.customerContext.serviceMode === true} onChange={(value) => patch('customerContext.serviceMode', value)} />
                )}
                {'passenger' in draft.customerContext && (
                  <Toggle label="Attach passenger context to the journey" checked={draft.customerContext.passenger === true} onChange={(value) => patch('customerContext.passenger', value)} />
                )}
              </div>
            </Section>

            <Section title="Detail experience" description="Choose what a customer can inspect once they focus an item. The actual domain data still comes from your catalog, rooms or trip records.">
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="Gallery" checked={draft.detail.showGallery} onChange={(value) => patch('detail.showGallery', value)} />
                <Toggle label="Specifications" checked={draft.detail.showSpecifications} onChange={(value) => patch('detail.showSpecifications', value)} />
                <Toggle label="Options / variants" checked={draft.detail.showOptions} onChange={(value) => patch('detail.showOptions', value)} />
                <Toggle label="Quantity" checked={draft.detail.showQuantity} onChange={(value) => patch('detail.showQuantity', value)} />
              </div>
            </Section>

            <Section title="Motion personality" description="Motion changes pacing, not meaning. Reduced-motion users always receive a safe non-motion equivalent.">
              <div className="grid gap-3 sm:grid-cols-3">
                {(data.motionTempos || []).map((tempo) => (
                  <button
                    key={tempo}
                    type="button"
                    onClick={() => patch('motion.tempo', tempo)}
                    className="rounded-xl border px-4 py-3 text-sm font-semibold"
                    style={{ borderColor: draft.motion.tempo === tempo ? 'var(--accent)' : 'var(--line)', color: 'var(--text)' }}
                  >
                    {tempo[0] + tempo.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <section className="sticky top-6 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <div className="border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Customer preview</p>
                <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--text)' }}>{presetMeta.title}</h2>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>{presetMeta.description}</p>
              </div>
              <div className="space-y-3 p-5">
                {presetMeta.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--line)' }}>
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>{index + 1}</div>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="border-t p-5" style={{ borderColor: 'var(--line)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Commit animation</p>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>This is the visual language used when a customer commits an item or reservation.</p>
                <div className="mt-3 space-y-2">
                  {allowedCommitStyles.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => patch('commit.style', style)}
                      className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm"
                      style={{ borderColor: draft.commit.style === style ? 'var(--accent)' : 'var(--line)', color: 'var(--text)' }}
                    >
                      <span>{style === 'PAPER_RIP' ? 'Paper rip into tray' : style === 'LIFT_INTO_TRAY' ? 'Lift into tray' : 'Material commit'}</span>
                      {draft.commit.style === style && <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--accent)' }}>Selected</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t px-5 py-4 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>
                Accessibility-safe motion is always enabled. Businesses cannot script arbitrary animation sequences.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
