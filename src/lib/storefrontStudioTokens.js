/**
 * Storefront Studio visual source-of-truth.
 *
 * Values marked `dp` are measured from the Flutter storefront runtime. CSS
 * renderers must derive preview dimensions from these values through the single
 * PREVIEW_SCALE rather than introducing independent geometry.
 */

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

const TOKENS = {
  device: {
    phone: { widthDp: 412, heightDp: 892 },
  },

  PREVIEW_SCALE: 220 / 412,

  layout: {
    marginDp: 16,
    heroRadiusDp: 12,
    hero: {
      heightDp: { compact: 140, standard: 200, tall: 260 },
      titleFontSizeDp: 24,
      subtitleFontSizeDp: 14,
      titleBottomGapDp: 4,
      sideInsetDp: 20,
      bottomInsetDp: 16,
    },
    quickInfo: {
      horizontalPaddingDp: 16,
      verticalPaddingDp: 10,
      itemGapDp: 10,
      runGapDp: 6,
      iconSizeDp: 14,
      labelFontSizeDp: 12,
      iconLabelGapDp: 4,
      radiusDp: 12,
    },
    productGrid: {
      titleBottomGapDp: 10,
      crossAxisSpacingDp: 10,
      mainAxisSpacingDp: 10,
      childAspectRatio: 0.75,
      cardRadiusDp: 12,
      cardPaddingDp: 8,
    },
    showcase: { titleBottomGapDp: 10 },
    video: { radiusDp: 12 },
    actionButtons: { itemGapDp: 8 },
    retailCollection: {
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
    },
  },

  studio: {
    frame: {
      widthDp: 412,
      heightDp: 892,
      radiusDp: 28,
      borderWidthDp: 4,
    },
    defaultGrid: { rowSpan: 2, colSpan: 4 },
    canvas: { gridCols: 4, rowHeightDp: 80, gapDp: 12 },
    previewDevices: {
      phone: { widthDp: 412, heightDp: 892, displayWidthPx: 220 },
      tablet: { widthDp: 768, heightDp: 1024, displayWidthPx: 320 },
      desktop: { widthDp: 1280, heightDp: 900, displayWidthPx: 640 },
    },
    preview: {
      spacing: { block: 16, tight: 8 },
      type: { heroTitle: 24, heroSubtitle: 14, identity: 16, section: 12, body: 12, small: 12, caption: 10, micro: 9, stat: 16, counter: 28, nav: 8 },
      hero: { heightDp: { compact: 140, standard: 200, tall: 260 }, sideInsetDp: 20, bottomInsetDp: 16, titleBottomGapDp: 4 },
      quickInfo: { horizontalPaddingDp: 16, verticalPaddingDp: 10, itemGapDp: 10, runGapDp: 6, iconLabelGapDp: 4, iconSizeDp: 14, radiusDp: 12 },
      productGrid: { titleBottomGapDp: 10, crossAxisSpacingDp: 10, mainAxisSpacingDp: 10, childAspectRatio: 0.75, cardRadiusDp: 12, cardPaddingDp: 8, emptyHorizontalPaddingDp: 20, emptyVerticalPaddingDp: 28, emptyRadiusDp: 14, emptyIconDp: 30, emptyIconGapDp: 8, emptyBodyGapDp: 4, productTitleGapDp: 3, productImageFlex: 3 },
      review: { titleBottomGapDp: 10, viewportHeightDp: 136, cardWidthDp: 260, cardRadiusDp: 12, cardPaddingDp: 12, cardGapDp: 10, starSizeDp: 15, bodyGapDp: 8, emptyPaddingDp: 14, emptyRadiusDp: 12 },
      contact: { cardPaddingDp: 14, cardRadiusDp: 12, itemGapDp: 10, iconDp: 16, labelFontSizeDp: 13 },
      showcase: { titleBottomGapDp: 10, viewportHeightDp: 160, cardWidthDp: 140, itemGapDp: 10, radiusDp: 12, iconDp: 36 },
      location: { titleBottomGapDp: 10, mapHeightDp: 180, radiusDp: 12, pinDp: 48, badgeBottomDp: 8, badgeLeftDp: 8, badgePaddingHorizontalDp: 10, badgePaddingVerticalDp: 4, badgeRadiusDp: 8, badgeFontSizeDp: 11 },
      video: { radiusDp: 12, heightDp: 220, playButtonDp: 64, fallbackIconDp: 40, fallbackGapDp: 8, fallbackFontSizeDp: 12 },
      promo: { horizontalPaddingDp: 20, verticalPaddingDp: 16, radiusDp: 12, titleFontSizeDp: 18, subtitleFontSizeDp: 13, titleSubtitleGapDp: 2, ctaGapDp: 12 },
      social: { titleBottomGapDp: 10, platformIconDp: 20, platformIconGapDp: 6, viewportHeightDp: 180, gridCrossAxisCount: 2, gridSpacingDp: 8, itemWidthDp: 90, itemRadiusDp: 10, itemIconDp: 28 },
      liveStats: { horizontalPaddingDp: 16, verticalPaddingDp: 12, radiusDp: 12, valueFontSizeDp: 20, valueLabelGapDp: 2, iconDp: 12, iconLabelGapDp: 3, labelFontSizeDp: 11 },
      animatedCounter: { horizontalPaddingDp: 16, verticalPaddingDp: 12, radiusDp: 12, valueFontSizeDp: 28, labelFontSizeDp: 12, labelGapDp: 2 },
      customHtml: { paddingDp: 14, radiusDp: 12, emptyFontSizeDp: 13, contentFontSizeDp: 14 },
      gradientHero: { heightDp: 280, radiusDp: 12, horizontalInsetDp: 24, bottomInsetDp: 28, titleFontSizeDp: 28, subtitleFontSizeDp: 16, titleSubtitleGapDp: 6 },
    },
  },

  snap: {
    alongSiblingDp: 6,
    crossSiblingDp: 6,
    pullSharpness: 2,
    settleDurationMs: 340,
  },
};

export const STOREFRONT_STUDIO_TOKENS = deepFreeze(TOKENS);
export const PREVIEW_SCALE = STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE;
export const toPreviewPx = (dp) => dp * PREVIEW_SCALE;
