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

  // The current Studio phone frame is 220 CSS px wide. Keep one explicit scale
  // so every Flutter-dp dimension is transformed uniformly for the canvas.
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
    showcase: {
      titleBottomGapDp: 10,
    },
    video: {
      radiusDp: 12,
    },
    actionButtons: {
      itemGapDp: 8,
    },
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
    defaultGrid: {
      rowSpan: 2,
      colSpan: 4,
    },
  },

  snap: {
    // Reserved for Wave B; keep the physics source in the same immutable token
    // contract so later work does not scatter magic numbers through the editor.
    alongSiblingDp: 6,
    crossSiblingDp: 6,
    pullSharpness: 2,
    settleDurationMs: 340,
  },
};

export const STOREFRONT_STUDIO_TOKENS = deepFreeze(TOKENS);

export const PREVIEW_SCALE = STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE;

export const toPreviewPx = (dp) => dp * PREVIEW_SCALE;
