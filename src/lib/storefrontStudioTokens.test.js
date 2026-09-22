import {
  PREVIEW_SCALE,
  STOREFRONT_STUDIO_TOKENS,
  toPreviewPx,
} from './storefrontStudioTokens';

describe('storefront studio tokens', () => {
  test('keeps measured Flutter device and widget values immutable', () => {
    expect(Object.isFrozen(STOREFRONT_STUDIO_TOKENS)).toBe(true);
    expect(STOREFRONT_STUDIO_TOKENS.device.phone).toEqual({ widthDp: 412, heightDp: 892 });
    expect(STOREFRONT_STUDIO_TOKENS.layout.hero.heightDp).toEqual({ compact: 140, standard: 200, tall: 260 });
    expect(STOREFRONT_STUDIO_TOKENS.layout.hero.titleFontSizeDp).toBe(24);
    expect(STOREFRONT_STUDIO_TOKENS.layout.hero.subtitleFontSizeDp).toBe(14);
    expect(STOREFRONT_STUDIO_TOKENS.layout.quickInfo.labelFontSizeDp).toBe(12);
    expect(STOREFRONT_STUDIO_TOKENS.layout.productGrid.childAspectRatio).toBe(0.75);
    expect(STOREFRONT_STUDIO_TOKENS.layout.retailCollection).toMatchObject({
      titleBottomGapDp: 10,
      subtitleGapDp: 3,
      rowHeightDp: 250,
      cardWidthDp: 168,
      itemGapDp: 10,
      cardRadiusDp: 16,
      cardPaddingDp: 10,
      cardTopPaddingDp: 9,
      cardBottomPaddingDp: 10,
      productTitleGapDp: 4,
    });
  });

  test('uses one uniform preview scale derived from the 412dp phone and 220px frame', () => {
    expect(PREVIEW_SCALE).toBeCloseTo(220 / 412, 12);
    expect(toPreviewPx(412)).toBeCloseTo(220, 12);
    expect(toPreviewPx(140)).toBeCloseTo(140 * (220 / 412), 12);
    expect(toPreviewPx(260)).toBeCloseTo(260 * (220 / 412), 12);
  });
});
