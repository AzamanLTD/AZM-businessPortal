// src/components/storefront/WidgetPalette.jsx
import { Card } from '@/components/forge';
import { Badge } from '@/components/forge';
import { Lock, Plus, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// Business-type-specific widget subtitles — tells the user how this widget
// applies to THEIR business, so it doesn't feel like generic filler.
const WIDGET_SUBTITLES = {
  RESTAURANT: {
    product_grid: 'Menu items with photos & prices',
    showcase_gallery: 'Food & ambiance photos',
    action_buttons: 'Order, book, follow, share',
    review_carousel: 'Diner reviews & ratings',
    promo_banner: 'Happy hour, specials, deals',
    location_map: 'Restaurant location',
    video_player: 'Cooking demos, food reels',
    social_feed: 'Instagram food posts',
    hero_header: 'Food photography banner',
    quick_info_bar: 'Hours, cuisine, rating',
    contact_card: 'Reservations & contact',
  },
  HOTEL: {
    product_grid: 'Room types & rates',
    showcase_gallery: 'Property & room photos',
    action_buttons: 'Book, follow, share',
    review_carousel: 'Guest reviews',
    promo_banner: 'Seasonal deals & packages',
    location_map: 'Hotel location',
    video_player: 'Property tour video',
    social_feed: 'Instagram hotel content',
    hero_header: 'Hotel exterior / interior',
    quick_info_bar: 'Star rating, check-in',
    contact_card: 'Front desk & booking',
  },
  TRANSIT: {
    product_grid: 'Trip routes & fares',
    showcase_gallery: 'Fleet photos',
    action_buttons: 'Book trip, follow, share',
    review_carousel: 'Passenger reviews',
    promo_banner: 'Discount routes, deals',
    location_map: 'Terminals & stops',
    video_player: 'Fleet tour',
    social_feed: 'Travel content',
    hero_header: 'Fleet / route banner',
    quick_info_bar: 'Schedule, on-time info',
    contact_card: 'Booking office contact',
  },
  RETAIL: {
    product_grid: 'Products with prices',
    showcase_gallery: 'Product photos',
    action_buttons: 'Order, follow, share',
    review_carousel: 'Customer reviews',
    promo_banner: 'Sales & promotions',
    location_map: 'Store location',
    video_player: 'Product demos',
    social_feed: 'Instagram product posts',
    hero_header: 'Storefront banner',
    quick_info_bar: 'Hours, rating, category',
    contact_card: 'Store contact info',
  },
  SERVICES: {
    product_grid: 'Service offerings',
    showcase_gallery: 'Portfolio / work samples',
    action_buttons: 'Book appointment, follow',
    review_carousel: 'Client testimonials',
    promo_banner: 'Service promotions',
    location_map: 'Office location',
    video_player: 'Service explainer video',
    social_feed: 'Instagram content',
    hero_header: 'Service banner',
    quick_info_bar: 'Hours, category, rating',
    contact_card: 'Booking & contact',
  },
  GENERAL: {
    product_grid: 'Products or items',
    showcase_gallery: 'Photo gallery',
    action_buttons: 'Order, follow, share',
    review_carousel: 'Customer reviews',
    promo_banner: 'Promotional banner',
    location_map: 'Business location',
    video_player: 'Video content',
    social_feed: 'Social media feed',
    hero_header: 'Hero banner image',
    quick_info_bar: 'Hours, rating, category',
    contact_card: 'Contact information',
  },
};

// Recommended widget order per business type (within each category)
const WIDGET_ORDER_BY_TYPE = {
  RESTAURANT: ['hero_header', 'quick_info_bar', 'product_grid', 'action_buttons', 'review_carousel', 'showcase_gallery', 'promo_banner', 'location_map', 'contact_card', 'video_player', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'],
  HOTEL: ['hero_header', 'quick_info_bar', 'showcase_gallery', 'product_grid', 'action_buttons', 'review_carousel', 'location_map', 'contact_card', 'promo_banner', 'video_player', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'],
  TRANSIT: ['hero_header', 'quick_info_bar', 'product_grid', 'action_buttons', 'location_map', 'review_carousel', 'showcase_gallery', 'contact_card', 'promo_banner', 'video_player', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'],
  RETAIL: ['hero_header', 'quick_info_bar', 'product_grid', 'showcase_gallery', 'action_buttons', 'promo_banner', 'review_carousel', 'location_map', 'contact_card', 'video_player', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'],
  SERVICES: ['hero_header', 'quick_info_bar', 'product_grid', 'showcase_gallery', 'action_buttons', 'review_carousel', 'contact_card', 'location_map', 'promo_banner', 'video_player', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'],
  GENERAL: ['hero_header', 'quick_info_bar', 'product_grid', 'action_buttons', 'showcase_gallery', 'review_carousel', 'contact_card', 'location_map', 'promo_banner', 'video_player', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'],
};

export default function WidgetPalette({ widgets, eligibility, onAdd, isLocked, businessType = 'GENERAL' }) {
  const categories = ['HEADER', 'CONTENT', 'COMMERCE', 'SOCIAL', 'MEDIA'];
  const subtitles = WIDGET_SUBTITLES[businessType] || WIDGET_SUBTITLES.GENERAL;
  const orderPref = WIDGET_ORDER_BY_TYPE[businessType] || WIDGET_ORDER_BY_TYPE.GENERAL;

  if (!widgets?.length) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4" style={{ color: 'var(--f-text-3)' }} />
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--f-text)' }}>Widgets</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>No widgets available</p>
      </div>
    );
  }

  // Sort widgets by business-type-specific order
  const sortedWidgets = [...widgets].sort((a, b) => {
    const aIdx = orderPref.indexOf(a.widgetType);
    const bIdx = orderPref.indexOf(b.widgetType);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4" style={{ color: 'var(--f-text-3)' }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--f-text)' }}>Widgets</h2>
      </div>

      {categories.map(cat => {
        const catWidgets = sortedWidgets.filter(w => w.category === cat);
        if (!catWidgets.length) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--f-text-3)' }}>
              {cat}
            </p>
            <div className="space-y-1.5">
              {catWidgets.map(widget => {
                const locked = isLocked ? isLocked(widget.widgetType) : false;
                const subtitle = subtitles[widget.widgetType];
                return (
                  <button
                    key={widget.id || widget.widgetType}
                    disabled={locked}
                    onClick={() => onAdd(widget.widgetType, widget.defaultProps || {})}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left',
                      'border',
                      locked && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                      background: 'var(--f-surface)',
                      borderColor: 'var(--f-line)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--f-surface-sunken)' }}>
                      {locked
                        ? <Lock className="w-4 h-4" style={{ color: 'var(--f-text-3)' }} />
                        : <Plus className="w-4 h-4" style={{ color: 'var(--f-tint-color)' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--f-text)' }}>
                        {widget.displayName || widget.widgetType}
                      </p>
                      {subtitle && (
                        <p className="text-[11px] truncate" style={{ color: 'var(--f-text-3)' }}>
                          {subtitle}
                        </p>
                      )}
                    </div>
                    {widget.minAzmStake > 0 && (
                      <Badge variant={locked ? 'danger' : 'primary'}>
                        {(widget.tier || '').replace('NITRO_', '') || 'PRO'}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
