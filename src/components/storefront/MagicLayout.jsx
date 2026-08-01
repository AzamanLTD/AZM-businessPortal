// src/components/storefront/MagicLayout.jsx
// One-click auto-layout generator — analyzes the business type and creates
// an optimized storefront with the right widgets, order, defaults, and theme.
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useToast } from '@/components/ui/Toast';
import { Sparkles, Wand2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { getWidgetDefaults } from '@/lib/businessTypes';

// ── Magic Layout Presets ──────────────────────────────────────────────
// Each preset defines the optimal widget set, order, and theme for a business type.
// Tiles are positioned sequentially in a 4-column grid.

const MAGIC_PRESETS = {
  RESTAURANT: {
    name: 'Restaurant Magic Layout',
    themeKey: 'warm_sunset',
    tiles: [
      { widgetType: 'hero_header',     rowSpan: 3 },
      { widgetType: 'quick_info_bar',  rowSpan: 1 },
      { widgetType: 'action_buttons',  rowSpan: 1 },
      { widgetType: 'product_grid',    rowSpan: 3 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'showcase_gallery',rowSpan: 2 },
      { widgetType: 'location_map',    rowSpan: 2 },
      { widgetType: 'contact_card',   rowSpan: 1 },
    ],
    tips: [
      'Hero with food photography banner',
      'Quick info with hours & cuisine',
      'Order + Book action buttons',
      'Menu items grid (6 items)',
      'Customer reviews carousel',
      'Food gallery showcase',
      'Location map for directions',
      'Contact card for reservations',
    ],
  },
  HOTEL: {
    name: 'Hotel Magic Layout',
    themeKey: 'ocean_breeze',
    tiles: [
      { widgetType: 'hero_header',       rowSpan: 4 },
      { widgetType: 'quick_info_bar',    rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'showcase_gallery',   rowSpan: 3 },
      { widgetType: 'product_grid',      rowSpan: 3 },
      { widgetType: 'review_carousel',   rowSpan: 2 },
      { widgetType: 'location_map',      rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tips: [
      'Tall hero with property exterior',
      'Quick info with star rating',
      'Book + Follow action buttons',
      'Property & room photo gallery',
      'Room types & rates grid',
      'Guest reviews carousel',
      'Location map',
      'Contact card for bookings',
    ],
  },
  TRANSIT: {
    name: 'Transit Magic Layout',
    themeKey: 'classic_light',
    tiles: [
      { widgetType: 'hero_header',     rowSpan: 3 },
      { widgetType: 'quick_info_bar',  rowSpan: 1 },
      { widgetType: 'action_buttons',   rowSpan: 1 },
      { widgetType: 'product_grid',    rowSpan: 3 },
      { widgetType: 'location_map',    rowSpan: 2 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'showcase_gallery',rowSpan: 2 },
      { widgetType: 'contact_card',    rowSpan: 1 },
    ],
    tips: [
      'Hero with fleet / route banner',
      'Quick info with schedule & on-time',
      'Book Trip action button',
      'Popular routes grid',
      'Map with terminals & stops',
      'Passenger reviews',
      'Fleet photo gallery',
      'Booking office contact',
    ],
  },
  RETAIL: {
    name: 'Retail Magic Layout',
    themeKey: 'neon_pulse',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',   rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'promo_banner',    rowSpan: 2 },
      { widgetType: 'showcase_gallery',rowSpan: 2 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'location_map',    rowSpan: 2 },
      { widgetType: 'contact_card',    rowSpan: 1 },
    ],
    tips: [
      'Hero with storefront banner',
      'Quick info with hours & rating',
      'Order + Follow action buttons',
      'Featured products grid',
      'Promo banner for sales',
      'Product showcase gallery',
      'Customer reviews',
      'Store location map',
      'Store contact info',
    ],
  },
  SERVICES: {
    name: 'Services Magic Layout',
    themeKey: 'minimal_mono',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',   rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'showcase_gallery', rowSpan: 2 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',     rowSpan: 1 },
    ],
    tips: [
      'Hero with service banner',
      'Quick info with hours & category',
      'Book Appointment + Follow buttons',
      'Services offerings grid',
      'Portfolio / work showcase',
      'Client testimonials',
      'Office location map',
      'Booking & contact info',
    ],
  },
  GENERAL: {
    name: 'Smart Layout',
    themeKey: 'classic_light',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',   rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',     rowSpan: 1 },
    ],
    tips: [
      'Hero banner with business image',
      'Quick info bar with hours',
      'Action buttons for engagement',
      'Featured products grid',
      'Customer reviews',
      'Location map',
      'Contact information',
    ],
  },
};

export function generateMagicLayout(businessType, widgets, themes) {
  const preset = MAGIC_PRESETS[businessType] || MAGIC_PRESETS.GENERAL;
  const tiles = [];
  let currentRow = 0;

  for (const tileSpec of preset.tiles) {
    const widget = widgets.find(w => w.widgetType === tileSpec.widgetType);
    if (!widget) continue;

    const typeDefaults = getWidgetDefaults(tileSpec.widgetType, businessType);
    const defaultProps = { ...(widget.defaultProps || {}), ...typeDefaults };

    tiles.push({
      id: `tile_${Math.random().toString(36).substring(2, 10)}`,
      widgetType: tileSpec.widgetType,
      position: {
        row: currentRow,
        col: 0,
        rowSpan: tileSpec.rowSpan,
        colSpan: 4,
      },
      props: defaultProps,
    });

    currentRow += tileSpec.rowSpan;
  }

  // Find the recommended theme
  const theme = themes.find(t => t.key === preset.themeKey) || themes.find(t => t.tier === 'FREE') || themes[0];

  return {
    layoutJson: { tiles },
    themeId: theme?.id || null,
    themeKey: theme?.key || preset.themeKey,
    presetName: preset.name,
    tips: preset.tips,
  };
}

// ── Magic Layout Button + Confirmation Modal ──────────────────────────

export default function MagicLayout({ businessType, widgets, themes, draft, onApply, disabled }) {
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [generated, setGenerated] = useState(null);

  const handleClick = () => {
    const result = generateMagicLayout(businessType, widgets, themes);
    setGenerated(result);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onApply(generated.layoutJson, generated.themeId);
    setShowConfirm(false);
    setGenerated(null);
    toast({
      title: `✨ ${generated.presetName} applied`,
      description: `${generated.layoutJson.tiles.length} widgets added. Adjust as needed.`,
    });
  };

  const tileCount = draft?.layoutJson?.tiles?.length || 0;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, var(--f-tint-color), var(--f-tint-color))',
          color: '#fff',
          boxShadow: '0 2px 12px rgba(108, 79, 209, 0.3)',
        }}
      >
        <Wand2 className="w-4 h-4" />
        <div className="flex-1 text-left">
          <p>Magic Layout</p>
          <p className="text-[10px] opacity-80 font-normal">Auto-generate your storefront in one click</p>
        </div>
        <Sparkles className="w-4 h-4 opacity-70" />
      </button>

      {/* Confirmation Modal */}
      {showConfirm && generated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowConfirm(false)}>
          <GlassPanel className="max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--f-surface-sunken)' }}>
                <Sparkles className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>{generated.presetName}</h3>
                <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>
                  {tileCount > 0 ? `This will replace your ${tileCount} existing widget${tileCount > 1 ? 's' : ''}` : 'Ready to generate'}
                </p>
              </div>
            </div>

            {/* Widget preview list */}
            <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
              {generated.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--f-text-2)' }}>
                  <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--f-tint-color)' }} />
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
                style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}>
                Cancel
              </button>
              <button onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--f-tint-color)', color: '#fff' }}>
                Apply Layout
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </>
  );
}
