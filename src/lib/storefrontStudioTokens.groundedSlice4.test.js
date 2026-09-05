import { PREVIEW_SCALE, STOREFRONT_STUDIO_TOKENS, toPreviewPx } from './storefrontStudioTokens';

describe('remaining Flutter-grounded preview tokens', () => {
  test('maps animated counter, custom HTML, and gradient hero geometry', () => {
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.animatedCounter).toEqual({
      horizontalPaddingDp: 16,
      verticalPaddingDp: 12,
      radiusDp: 12,
      valueFontSizeDp: 28,
      labelFontSizeDp: 12,
      labelGapDp: 2,
    });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.customHtml).toEqual({
      paddingDp: 14,
      radiusDp: 12,
      emptyFontSizeDp: 13,
      contentFontSizeDp: 14,
    });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.gradientHero).toEqual({
      heightDp: 280,
      radiusDp: 12,
      horizontalInsetDp: 24,
      bottomInsetDp: 28,
      titleFontSizeDp: 28,
      subtitleFontSizeDp: 16,
      titleSubtitleGapDp: 6,
    });
  });

  test('keeps the single preview scale authoritative', () => {
    expect(toPreviewPx(28)).toBe(28 * PREVIEW_SCALE);
    expect(toPreviewPx(280)).toBe(280 * PREVIEW_SCALE);
  });

  test('freezes the new token groups', () => {
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS.studio.preview.animatedCounter)).toBe(true);
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS.studio.preview.customHtml)).toBe(true);
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS.studio.preview.gradientHero)).toBe(true);
  });
});
