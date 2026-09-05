import { describe, expect, it } from 'vitest';
import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from './storefrontStudioTokens';

describe('Storefront Wave A grounded renderer slice 3', () => {
  it('keeps Promo Banner, Social Feed and Live Stats tokens grounded', () => {
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.promo).toMatchObject({
      horizontalPaddingDp: 20,
      verticalPaddingDp: 16,
      radiusDp: 12,
      titleFontSizeDp: 18,
      subtitleFontSizeDp: 13,
      titleSubtitleGapDp: 2,
      ctaGapDp: 12,
    });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.social).toEqual({
      titleBottomGapDp: 10,
      platformIconDp: 20,
      platformIconGapDp: 6,
      viewportHeightDp: 180,
      gridCrossAxisCount: 2,
      gridSpacingDp: 8,
      itemWidthDp: 90,
      itemRadiusDp: 10,
      itemIconDp: 28,
    });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.liveStats).toEqual({
      horizontalPaddingDp: 16,
      verticalPaddingDp: 12,
      radiusDp: 12,
      valueFontSizeDp: 20,
      valueLabelGapDp: 2,
      iconDp: 12,
      iconLabelGapDp: 3,
      labelFontSizeDp: 11,
    });
  });

  it('uses the single device scale for all grounded dimensions', () => {
    expect(toPreviewPx(412)).toBeCloseTo(220);
    expect(toPreviewPx(STOREFRONT_STUDIO_TOKENS.studio.preview.promo.horizontalPaddingDp)).toBeCloseTo(20 * 220 / 412);
    expect(toPreviewPx(STOREFRONT_STUDIO_TOKENS.studio.preview.social.viewportHeightDp)).toBeCloseTo(180 * 220 / 412);
    expect(toPreviewPx(STOREFRONT_STUDIO_TOKENS.studio.preview.liveStats.valueFontSizeDp)).toBeCloseTo(20 * 220 / 412);
  });

  it('deep-freezes the grounded token tree against accidental mutation', () => {
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS.studio.preview.promo)).toBe(true);
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS.studio.preview.social)).toBe(true);
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS.studio.preview.liveStats)).toBe(true);
  });
});
