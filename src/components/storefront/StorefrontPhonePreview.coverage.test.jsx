import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const WIDGET_TYPES = [
  'hero_header',
  'quick_info_bar',
  'product_grid',
  'showcase_gallery',
  'review_carousel',
  'contact_card',
  'location_map',
  'action_buttons',
  'retail_collection_box',
  'video_player',
  'promo_banner',
  'social_feed',
  'live_stats',
  'animated_counter',
  'custom_html',
  'gradient_hero',
];

describe('StorefrontPhonePreview widget coverage', () => {
  it('keeps every active catalog renderer represented in the preview registry', () => {
    const source = fs.readFileSync(
      path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'),
      'utf8',
    );

    expect(WIDGET_TYPES).toHaveLength(16);
    for (const widgetType of WIDGET_TYPES) {
      expect(source).toContain(`${widgetType}:`);
    }
  });
});
