import fs from 'node:fs';
import path from 'node:path';
import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from '@/lib/storefrontStudioTokens';

const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');

function functionBody(name) {
  const start = source.indexOf(`function ${name}`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

describe('Storefront Wave A grounded renderer slice 2', () => {
  test('routes Showcase, Location and Video geometry through shared preview tokens', () => {
    expect(source).toContain('const showcasePx = (name) => px(previewTokens.showcase[name]);');
    expect(source).toContain('const locationPx = (name) => px(previewTokens.location[name]);');
    expect(source).toContain('const videoPx = (name) => px(previewTokens.video[name]);');
    for (const renderer of ['ShowcaseGallery', 'LocationMap', 'VideoPlayer']) {
      const body = functionBody(renderer);
      expect(body).not.toMatch(/(?:height|width|fontSize|borderRadius|gap|margin(?:Top|Right|Bottom|Left)?|padding(?:Top|Right|Bottom|Left)?):\s*\d+(?:\.\d+)?\b/);
      expect(body).not.toMatch(/padding:\s*['"]\d/);
      expect(body).not.toMatch(/margin:\s*['"]\d/);
    }
  });

  test('preserves the Flutter-grounded second-slice dimensions and preview scaling', () => {
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.showcase).toMatchObject({
      titleBottomGapDp: 10,
      viewportHeightDp: 160,
      cardWidthDp: 140,
      itemGapDp: 10,
      radiusDp: 12,
      iconDp: 36,
    });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.location).toMatchObject({
      titleBottomGapDp: 10,
      mapHeightDp: 180,
      radiusDp: 12,
      pinDp: 48,
      badgeBottomDp: 8,
      badgeLeftDp: 8,
      badgePaddingHorizontalDp: 10,
      badgePaddingVerticalDp: 4,
      badgeRadiusDp: 8,
      badgeFontSizeDp: 11,
    });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.video).toMatchObject({
      radiusDp: 12,
      heightDp: 220,
      playButtonDp: 64,
      fallbackIconDp: 40,
      fallbackGapDp: 8,
      fallbackFontSizeDp: 12,
    });
    expect(toPreviewPx(412)).toBeCloseTo(220);
  });
});
