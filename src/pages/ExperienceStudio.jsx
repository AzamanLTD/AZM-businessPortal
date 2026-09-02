import { useEffect, useMemo, useState } from 'react';
import { storefrontApi } from '@/services/storefrontApi';
import ExperienceSimulator from '@/components/ExperienceSimulator';
import { experiencePolicyForCategory } from '@/lib/experiencePolicy';

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

const NAVIGATION_LABELS = {
  CONTEXTUAL: 'Contextual guidance',
  FLOOR_TRAVERSE: 'Traverse by floor',
  AISLE_TRAVERSE: 'Traverse by collection',
  JOURNEY_TIMELINE: 'Journey timeline',
};

const DETAIL_LABELS = {
  MORPH: 'Focused detail',
  DISH_DOSSIER: 'Dish dossier',
  PRODUCT_DOSSIER: 'Product dossier',
  ROOM_DOSSIER: 'Room dossier',
  SEAT_DOSSIER: 'Seat dossier',
  SERVICE_DOSSIER: 'Service dossier',
};

const COMMIT_LABELS = {
  MATERIAL: 'Material commit',
  PAPER_RIP: 'Paper rip into tray',
  LIFT_INTO_TRAY: 'Lift into tray / bag',
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

function SelectPolicy({ label, value, options, labels, onChange }) {
  const safeValue = options.includes(value) ? value : options[0];
  return (
    <label className="block rounded-xl border px-4 py-3" style={{ borderColor: 'var(--line)' }}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>{label}</span>
      <select value={safeValue} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
        {options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}
      </select>
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

  const category = data?.category?.trim().toUpperCase() || '';
  const policy = experiencePolicyForCategory(category);
  const availablePresets = policy.presets;
  const presetMeta = PRESET_META[draft?.preset] || PRESET_META.SERVICE_JOURNEY;
  const navigationModes = (data?.navigationModes || []).filter((mode) => policy.navigationModes.includes(mode));
  const detailPresentations = (data?.detailPresentations || []).filter((presentation) => policy.detailPresentations.includes(presentation));
  const safeNavigationModes = navigationModes.length ? navigationModes : policy.navigationModes;
  const safeDetailPresentations = detailPresentations.length ? detailPresentations : policy.detailPresentations;

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
    const filtered = values.filter((value) => policy.commitStyles.includes(value));
    return filtered.length ? filtered : policy.commitStyles;
  }, [data, policy]);

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await storefrontApi.saveExperience(draft);
      setDraft(saved);
      setMessage('Saved as a storefront draft. Publish your storefront from Storefront Editor to make this experience live.');
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

  const showTableContext = policy.context.tableNumber;
  const showServiceContext = policy.context.serviceMode;
  const showPassengerContext = policy.context.passenger;
  const persistentTrayAvailable = policy.persistentTray;

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
          <button type="button" onClick={save} disabled={saving} className="rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--accent)' }}>
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
            <Section title="Journey preset" description="The preset determines the interaction language available to customers. Your business type constrains what can be selected.">
              <div className="grid gap-3 sm:grid-cols-2">
                {availablePresets.map((preset) => {
                  const meta = PRESET_META[preset];
                  const active = draft.preset === preset;
                  return (
                    <button key={preset} type="button" onClick={() => setDraft((current) => ({ ...current, preset }))} className="text-left rounded-xl border p-4 transition" style={{ borderColor: active ? 'var(--accent)' : 'var(--line)', background: active ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)' }}>
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

            <Section title="Journey navigation" description="Choose how customers understand where they are without exposing an unrestricted navigation builder.">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectPolicy label="Navigation mode" value={draft.navigation.mode} options={safeNavigationModes} labels={NAVIGATION_LABELS} onChange={(value) => patch('navigation.mode', value)} />
                <Toggle label="Show progress / navigation context" checked={draft.navigation.showProgress} onChange={(value) => patch('navigation.showProgress', value)} />
              </div>
            </Section>

            <Section title="Customer context" description="Only context that has meaning for this business category is exposed.">
              <div className="space-y-2">
                <Toggle label="Use contextual information when available" checked={draft.customerContext.enabled} onChange={(value) => patch('customerContext.enabled', value)} />
                {showTableContext && <Toggle label="Offer table number for dine-in customers" checked={draft.customerContext.tableNumber === true} onChange={(value) => patch('customerContext.tableNumber', value)} />}
                {showServiceContext && <Toggle label="Remember service mode (dine-in / takeaway)" checked={draft.customerContext.serviceMode === true} onChange={(value) => patch('customerContext.serviceMode', value)} />}
                {showPassengerContext && <Toggle label="Attach passenger context to the journey" checked={draft.customerContext.passenger === true} onChange={(value) => patch('customerContext.passenger', value)} />}
              </div>
            </Section>

            <Section title="Detail experience" description="Choose the presentation grammar and what a customer can inspect once they focus an item. The actual domain data remains authoritative.">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectPolicy label="Detail presentation" value={draft.detail.presentation} options={safeDetailPresentations} labels={DETAIL_LABELS} onChange={(value) => patch('detail.presentation', value)} />
                <Toggle label="Gallery" checked={draft.detail.showGallery} onChange={(value) => patch('detail.showGallery', value)} />
                <Toggle label="Specifications" checked={draft.detail.showSpecifications} onChange={(value) => patch('detail.showSpecifications', value)} />
                <Toggle label="Options / variants" checked={draft.detail.showOptions} onChange={(value) => patch('detail.showOptions', value)} />
                <Toggle label="Quantity" checked={draft.detail.showQuantity} onChange={(value) => patch('detail.showQuantity', value)} />
              </div>
            </Section>

            <Section title="Motion personality" description="Motion changes pacing, not meaning. Reduced-motion users always receive a safe non-motion equivalent.">
              <div className="grid gap-3 sm:grid-cols-3">
                {(data.motionTempos || []).map((tempo) => (
                  <button key={tempo} type="button" onClick={() => patch('motion.tempo', tempo)} className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: draft.motion.tempo === tempo ? 'var(--accent)' : 'var(--line)', color: 'var(--text)' }}>
                    {tempo[0] + tempo.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Commit behavior" description="Choose the final physical metaphor customers experience when they commit an item. The backend still owns the actual transaction.">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  {allowedCommitStyles.map((style) => (
                    <button key={style} type="button" onClick={() => patch('commit.style', style)} className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: draft.commit.style === style ? 'var(--accent)' : 'var(--line)', background: draft.commit.style === style ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)' }}>
                      <span className="block text-sm font-semibold" style={{ color: 'var(--text)' }}>{COMMIT_LABELS[style] || style}</span>
                      <span className="mt-1 block text-[11px] leading-5" style={{ color: 'var(--text-3)' }}>
                        {style === 'PAPER_RIP' ? 'Dining orders leave the menu and become part of the tray.' : style === 'LIFT_INTO_TRAY' ? 'Products visually move into the customer bag or tray.' : 'Use a restrained confirmation without a physical metaphor.'}
                      </span>
                    </button>
                  ))}
                </div>
                <Toggle
                  label={persistentTrayAvailable ? 'Keep a persistent customer tray / bag' : 'Persistent tray / bag is not used for this business type'}
                  checked={persistentTrayAvailable && draft.commit.persistentTray === true}
                  disabled={!persistentTrayAvailable}
                  onChange={(value) => {
                    if (persistentTrayAvailable) patch('commit.persistentTray', value);
                  }}
                />
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <ExperienceSimulator blueprint={draft} category={category} />
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>Experience guardrails</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                AZM keeps the experience category-native. Your settings can tune pacing, detail and context, but cannot create a journey that contradicts what the business actually does.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
