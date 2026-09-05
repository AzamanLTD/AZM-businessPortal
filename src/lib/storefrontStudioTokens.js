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
      // Grounded directly in the matching Flutter widget implementations.
      hero: { heightDp: { compact: 140, standard: 200, tall: 260 }, sideInsetDp: 20, bottomInsetDp: 16, titleBottomGapDp: 4 },
      quickInfo: { horizontalPaddingDp: 16, verticalPaddingDp: 10, itemGapDp: 10, runGapDp: 6, iconLabelGapDp: 4, iconSizeDp: 14, radiusDp: 12 },
      productGrid: { titleBottomGapDp: 10, crossAxisSpacingDp: 10, mainAxisSpacingDp: 10, childAspectRatio: 0.75, cardRadiusDp: 12, cardPaddingDp: 8, emptyHorizontalPaddingDp: 20, emptyVerticalPaddingDp: 28, emptyRadiusDp: 14, emptyIconDp: 30, emptyIconGapDp: 8, emptyBodyGapDp: 4, productTitleGapDp: 3, productImageFlex: 3 },
      review: { titleBottomGapDp: 10, viewportHeightDp: 136, cardWidthDp: 260, cardRadiusDp: 12, cardPaddingDp: 12, cardGapDp: 10, starSizeDp: 15, bodyGapDp: 8, emptyPaddingDp: 14, emptyRadiusDp: 12 },
      contact: { cardPaddingDp: 14, cardRadiusDp: 12, itemGapDp: 10, iconDp: 16, labelFontSizeDp: 13 },
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
