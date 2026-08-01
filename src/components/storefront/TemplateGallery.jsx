// src/components/storefront/TemplateGallery.jsx
// Pre-designed storefront layouts per business type — businesses browse,
// preview, and apply with one click.
import { Card } from '@/components/forge';
import { LayoutTemplate, Check, Sparkles, Star, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { getWidgetDefaults } from '@/lib/businessTypes';

// ── Template Definitions ─────────────────────────────────────────────
// Each template is a curated widget set with a specific theme and tier.

const TEMPLATES = [
  {
    id: 'tpl_restaurant_starter',
    name: 'Restaurant Starter',
    businessType: 'RESTAURANT',
    themeKey: 'classic_light',
    tier: 'FREE',
    description: 'Essential layout for new restaurants — menu, reviews, and contact',
    tiles: [
      { widgetType: 'hero_header',     rowSpan: 3 },
      { widgetType: 'quick_info_bar',  rowSpan: 1 },
      { widgetType: 'action_buttons',   rowSpan: 1 },
      { widgetType: 'product_grid',    rowSpan: 3 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'contact_card',     rowSpan: 1 },
    ],
    tags: ['Menu', 'Reviews', 'Contact'],
  },
  {
    id: 'tpl_restaurant_pro',
    name: 'Restaurant Pro',
    businessType: 'RESTAURANT',
    themeKey: 'warm_sunset',
    tier: 'NITRO_BRONZE',
    description: 'Full-featured restaurant storefront with gallery, promos, and video',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'promo_banner',    rowSpan: 2 },
      { widgetType: 'showcase_gallery',rowSpan: 2 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'location_map',    rowSpan: 2 },
      { widgetType: 'contact_card',    rowSpan: 1 },
    ],
    tags: ['Gallery', 'Promos', 'Video-ready', '9 widgets'],
  },
  {
    id: 'tpl_hotel_starter',
    name: 'Hotel Starter',
    businessType: 'HOTEL',
    themeKey: 'classic_light',
    tier: 'FREE',
    description: 'Clean hotel layout with rooms, reviews, and booking contact',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'showcase_gallery', rowSpan: 2 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Rooms', 'Gallery', 'Reviews', 'Map'],
  },
  {
    id: 'tpl_hotel_premium',
    name: 'Hotel Premium',
    businessType: 'HOTEL',
    themeKey: 'ocean_breeze',
    tier: 'NITRO_SILVER',
    description: 'Luxury hotel experience with video tour, live stats, and social feed',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 4 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'showcase_gallery', rowSpan: 3 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'video_player',     rowSpan: 2 },
      { widgetType: 'live_stats',        rowSpan: 1 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'social_feed',       rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Video Tour', 'Live Stats', 'Social', '11 widgets'],
  },
  {
    id: 'tpl_transit_starter',
    name: 'Transit Starter',
    businessType: 'TRANSIT',
    themeKey: 'classic_light',
    tier: 'FREE',
    description: 'Essential transit layout with routes, schedules, and booking',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Routes', 'Schedule', 'Map', 'Contact'],
  },
  {
    id: 'tpl_transit_pro',
    name: 'Transit Pro',
    businessType: 'TRANSIT',
    themeKey: 'classic_light',
    tier: 'NITRO_BRONZE',
    description: 'Full transit storefront with fleet gallery, promos, and stats',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'promo_banner',    rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'showcase_gallery',rowSpan: 2 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'social_feed',      rowSpan: 2 },
      { widgetType: 'contact_card',     rowSpan: 1 },
    ],
    tags: ['Fleet Gallery', 'Promos', 'Social', '10 widgets'],
  },
  {
    id: 'tpl_retail_starter',
    name: 'Retail Starter',
    businessType: 'RETAIL',
    themeKey: 'classic_light',
    tier: 'FREE',
    description: 'Product-focused layout for retail stores',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'showcase_gallery', rowSpan: 2 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Products', 'Gallery', 'Reviews', 'Map'],
  },
  {
    id: 'tpl_retail_pro',
    name: 'Retail Showcase',
    businessType: 'RETAIL',
    themeKey: 'neon_pulse',
    tier: 'NITRO_BRONZE',
    description: 'Eye-catching retail storefront with promos, video, and social feed',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'promo_banner',    rowSpan: 2 },
      { widgetType: 'video_player',    rowSpan: 2 },
      { widgetType: 'showcase_gallery',rowSpan: 2 },
      { widgetType: 'review_carousel', rowSpan: 2 },
      { widgetType: 'social_feed',      rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Promos', 'Video', 'Social', '11 widgets'],
  },
  {
    id: 'tpl_services_starter',
    name: 'Services Starter',
    businessType: 'SERVICES',
    themeKey: 'minimal_mono',
    tier: 'FREE',
    description: 'Professional services layout with booking and portfolio',
    tiles: [
      { widgetType: 'hero_header',      rowSpan: 3 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'showcase_gallery', rowSpan: 2 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Services', 'Portfolio', 'Reviews', 'Booking'],
  },
  {
    id: 'tpl_services_pro',
    name: 'Services Premium',
    businessType: 'SERVICES',
    themeKey: 'royal_gold',
    tier: 'NITRO_GOLD',
    description: 'Premium services storefront with video, custom HTML, and gradient hero',
    tiles: [
      { widgetType: 'gradient_hero',    rowSpan: 4 },
      { widgetType: 'quick_info_bar',   rowSpan: 1 },
      { widgetType: 'action_buttons',    rowSpan: 1 },
      { widgetType: 'product_grid',     rowSpan: 3 },
      { widgetType: 'video_player',     rowSpan: 2 },
      { widgetType: 'showcase_gallery', rowSpan: 2 },
      { widgetType: 'live_stats',        rowSpan: 1 },
      { widgetType: 'review_carousel',  rowSpan: 2 },
      { widgetType: 'custom_html',       rowSpan: 2 },
      { widgetType: 'location_map',     rowSpan: 2 },
      { widgetType: 'contact_card',      rowSpan: 1 },
    ],
    tags: ['Gradient Hero', 'Video', 'Custom HTML', '11 widgets'],
  },
];

function generateTemplateLayout(template, widgets) {
  const tiles = [];
  let currentRow = 0;

  for (const tileSpec of template.tiles) {
    const widget = widgets.find(w => w.widgetType === tileSpec.widgetType);
    if (!widget) continue;

    const typeDefaults = getWidgetDefaults(tileSpec.widgetType, template.businessType);
    const defaultProps = { ...(widget.defaultProps || {}), ...typeDefaults };

    tiles.push({
      id: `tile_${Math.random().toString(36).substring(2, 10)}`,
      widgetType: tileSpec.widgetType,
      position: { row: currentRow, col: 0, rowSpan: tileSpec.rowSpan, colSpan: 4 },
      props: defaultProps,
    });

    currentRow += tileSpec.rowSpan;
  }

  return { tiles };
}

function TemplateCard({ template, themes, widgets, onApply, isLocked }) {
    const theme = themes.find(t => t.key === template.themeKey);
  const accent = theme?.tokenSet?.accent || '#6C4FD1';
  const bg = theme?.tokenSet?.background || '#F7F5F2';
  const locked = isLocked(template);

  const handleApply = () => {
    const layoutJson = generateTemplateLayout(template, widgets);
    const themeId = theme?.id || null;
    onApply(layoutJson, themeId);
    toast({
      title: `✨ ${template.name} applied`,
      description: `${layoutJson.tiles.length} widgets added. Customize as needed.`,
    });
  };

  return (
    <div className="rounded-xl overflow-hidden border transition-all"
      style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}
    >
      {/* Mini Preview */}
      <div className="h-24 overflow-hidden relative" style={{ background: bg }}>
        <div className="absolute inset-0 flex flex-col gap-0.5 p-2">
          {template.tiles.slice(0, 6).map((t, i) => (
            <div key={i} className="rounded-sm"
              style={{
                height: `${t.rowSpan * 6}px`,
                background: `${accent}25`,
                border: `1px solid ${accent}40`,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <span className="text-[10px] font-bold text-[var(--f-text)] px-2 py-1 rounded-full"
              style={{ background: accent }}>
              {template.tier.replace('NITRO_', '')} Required
            </span>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>{template.name}</p>
          {template.tier === 'FREE' ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(31, 163, 122, 0.15)', color: '#1FA37A' }}>
              FREE
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }}>
              {template.tier.replace('NITRO_', '')}
            </span>
          )}
        </div>
        <p className="text-[11px] mb-2" style={{ color: 'var(--f-text-3)' }}>{template.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {template.tags.map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-3)' }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Apply Button */}
        <button onClick={handleApply} disabled={locked}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{
            background: locked ? 'var(--f-surface-sunken)' : accent,
            color: locked ? 'var(--f-text-3)' : '#fff',
          }}>
          {locked ? 'Upgrade Required' : 'Apply Template'}
          {!locked && <ArrowRight className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

export default function TemplateGallery({ businessType, widgets, themes, eligibility, onApply, onClose }) {
  const [filter, setFilter] = useState(businessType || 'ALL');

  // Show templates matching the business type first, then all others
  const allTypes = ['ALL', 'RESTAURANT', 'HOTEL', 'TRANSIT', 'RETAIL', 'SERVICES'];
  const filteredTemplates = filter === 'ALL'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.businessType === filter);

  // Sort: current business type first
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.businessType === businessType && b.businessType !== businessType) return -1;
    if (b.businessType === businessType && a.businessType !== businessType) return 1;
    return 0;
  });

  const isLocked = (template) => {
    if (!eligibility || template.tier === 'FREE') return false;
    const staked = eligibility.stakedBalance ?? 0;
    const minStake = template.tier === 'NITRO_BRONZE' ? 500
                   : template.tier === 'NITRO_SILVER' ? 2000
                   : template.tier === 'NITRO_GOLD' ? 5000 : 0;
    return staked < minStake;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <GlassPanel className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--f-text)' }}>Template Gallery</h2>
          </div>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--f-text-3)' }}>Close</button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 px-4 py-2.5 border-b overflow-x-auto" style={{ borderColor: 'var(--f-line)' }}>
          {allTypes.map(type => (
            <button key={type} onClick={() => setFilter(type)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: filter === type ? 'var(--f-tint-color)' : 'var(--f-surface-sunken)',
                color: filter === type ? '#fff' : 'var(--f-text-3)',
              }}>
              {type === 'ALL' ? 'All Templates' : type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filter === 'ALL' && businessType && (
            <div className="mb-3 p-2.5 rounded-lg flex items-center gap-2"
              style={{ background: 'var(--f-surface-sunken)' }}>
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--f-tint-color)' }} />
              <p className="text-xs" style={{ color: 'var(--f-text-2)' }}>
                Showing templates for your business type first. Use Magic Layout for an instant optimized setup.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {sortedTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                themes={themes}
                widgets={widgets}
                onApply={onApply}
                isLocked={isLocked}
              />
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
