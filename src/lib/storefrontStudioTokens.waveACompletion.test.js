import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STOREFRONT_STUDIO_TOKENS } from './storefrontStudioTokens';

const previewPath = fileURLToPath(new URL('../components/storefront/StorefrontPhonePreview.jsx', import.meta.url));
const source = readFileSync(previewPath, 'utf8');
const rendererHelpers = ['counterPx', 'customHtmlPx', 'gradientHeroPx', 'actionPx', 'fallbackPx', 'selectionPx', 'chromePx', 'framePx'];
const widgetTypes = ['hero_header', 'quick_info_bar', 'product_grid', 'showcase_gallery', 'review_carousel', 'contact_card', 'location_map', 'action_buttons', 'retail_collection_box', 'video_player', 'promo_banner', 'social_feed', 'live_stats', 'animated_counter', 'custom_html', 'gradient_hero'];

describe('Storefront Wave A completion guard', () => {
  it('has no inline numeric CSS pixel literals in the preview source', () => {
    expect(source).not.toMatch(/\b\d+(?:\.\d+)?px\b/);
    expect(source).not.toMatch(/\bpx\(\s*\d/);
    rendererHelpers.forEach((helper) => expect(source).toContain(helper));
  });

  it('wires every catalog widget to the preview registry', () => {
    expect(source).toContain('const WIDGET_RENDERERS');
    widgetTypes.forEach((widgetType) => expect(source).toContain(`${widgetType}:`));
  });

  it('keeps the authoritative phone frame geometry tokenized', () => {
    expect(source).toContain("framePx('widthDp')");
    expect(source).toContain("framePx('heightDp')");
    expect(STOREFRONT_STUDIO_TOKENS.studio.frame).toMatchObject({ widthDp: 412, heightDp: 892, radiusDp: 28, borderWidthDp: 4 });
  });
});
