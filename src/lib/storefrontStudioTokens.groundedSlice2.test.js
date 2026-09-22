import { describe, expect, it } from 'vitest';
import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from './storefrontStudioTokens';

describe('grounded storefront preview token slice 2', () => {
  it('preserves Flutter-measured Showcase, Location, and Video geometry', () => {
    const preview = STOREFRONT_STUDIO_TOKENS.studio.preview;

    expect(preview.showcase).toMatchObject({
      titleBottomGapDp: 10,
      viewportHeightDp: 160,
      cardWidthDp: 140,
      itemGapDp: 10,
      radiusDp: 12,
      iconDp: 36,
    });
    expect(preview.location).toMatchObject({
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
    expect(preview.video).toMatchObject({
      radiusDp: 12,
      heightDp: 220,
      playButtonDp: 64,
      fallbackIconDp: 40,
      fallbackGapDp: 8,
      fallbackFontSizeDp: 12,
    });

    expect(toPreviewPx(preview.showcase.cardWidthDp)).toBeCloseTo(140 * (220 / 412), 8);
    expect(toPreviewPx(preview.location.mapHeightDp)).toBeCloseTo(180 * (220 / 412), 8);
    expect(toPreviewPx(preview.video.heightDp)).toBeCloseTo(220 * (220 / 412), 8);
  });
});
