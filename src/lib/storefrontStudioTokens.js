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
  device: { phone: { widthDp: 412, heightDp: 892 } },
  PREVIEW_SCALE: 220 / 412,

  layout: {
    marginDp: 16,
    heroRadiusDp: 12,
    hero: { heightDp: { compact: 140, standard: 200, tall: 260 }, titleFontSizeDp: 24, subtitleFontSizeDp: 14, titleBottomGapDp: 4, sideInsetDp: 20, bottomInsetDp: 16 },
    quickInfo: { horizontalPaddingDp: 16, verticalPaddingDp: 10, itemGapDp: 10, runGapDp: 6, iconSizeDp: 14, labelFontSizeDp: 12, iconLabelGapDp: 4, radiusDp: 12 },
    productGrid: { titleBottomGapDp: 10, crossAxisSpacingDp: 10, mainAxisSpacingDp: 10, childAspectRatio: 0.75, cardRadiusDp: 12, cardPaddingDp: 8 },
    showcase: { titleBottomGapDp: 10 },
    video: { radiusDp: 12 },
    actionButtons: { itemGapDp: 8 },
    retailCollection: { titleBottomGapDp: 10, subtitleGapDp: 3, rowHeightDp: 250, cardWidthDp: 168, itemGapDp: 10, cardRadiusDp: 16, cardPaddingDp: 10, cardTopPaddingDp: 9, cardBottomPaddingDp: 10, productTitleGapDp: 4 },
  },

  studio: {
    frame: { widthDp: 412, heightDp: 892, radiusDp: 28, borderWidthDp: 4 },
    defaultGrid: { rowSpan: 2, colSpan: 4 },
    canvas: { gridCols: 4, rowHeightDp: 80, gapDp: 12 },
    previewDevices: {
      phone: { widthDp: 412, heightDp: 892, displayWidthPx: 220 },
      tablet: { widthDp: 768, heightDp: 1024, displayWidthPx: 320 },
      desktop: { widthDp: 1280, heightDp: 900, displayWidthPx: 640 },
    },

    // All values below are Flutter-dp source values for the deterministic CSS preview.
    preview: { spacing: { block: 16, tight: 8 }, type: { heroTitle: 24, heroSubtitle: 14, identity: 16, section: 12, body: 12, small: 12, caption: 10, micro: 9, stat: 16, counter: 28, nav: 8 } },
    previewWidgets: {
      spacing: { block: 16, tight: 8 },
      type: { heroTitle: 24, heroSubtitle: 14, identity: 16, section: 12, body: 12, small: 12, caption: 10, micro: 9, stat: 16, counter: 28, nav: 8 },
      hero: { heightDp: { compact: 140, standard: 200, tall: 260 }, sideInsetDp: 20, bottomInsetDp: 16, titleBottomGapDp: 4 },
      quickInfo: { horizontalPaddingDp: 16, verticalPaddingDp: 10, itemGapDp: 10, iconLabelGapDp: 4, iconSizeDp: 14 },
      productGrid: { titleBottomGapDp: 10, mainAxisSpacingDp: 10, cardRadiusDp: 12, mediaHeightDp: 160, iconSizeDp: 28, cardPaddingDp: 8, skeletonHeightDp: 10, skeletonRadiusDp: 3, skeletonGapDp: 4, priceHeightDp: 8 },
      review: { titleBottomGapDp: 10, cardRadiusDp: 12, cardPaddingVerticalDp: 8, cardPaddingHorizontalDp: 10, cardGapDp: 6, starGapDp: 2, starSizeDp: 12, textGapDp: 4, lineHeightDp: 7, lineRadiusDp: 3, authorTopGapDp: 4 },
      contact: { actionGapDp: 8, cardRadiusDp: 12, cardPaddingDp: 8, innerGapDp: 4, iconBoxDp: 44, iconSizeDp: 20, phonePreviewChars: 10 },
      showcase: { titleBottomGapDp: 10, itemGapDp: 6, mainHeightDp: 150, radiusDp: 10, mainIconDp: 36, smallIconDp: 20 },
      location: { titleBottomGapDp: 10, mapHeightDp: 160, radiusDp: 12, pinDp: 48, gridStrokeDp: 0.5, shadowYDp: 2, shadowBlurDp: 8, labelGapDp: 6, labelTopGapDp: 6, iconSizeDp: 14 },
      actionButtons: { itemGapDp: 8, minWidthDp: 80, radiusDp: 8, paddingVerticalDp: 10, paddingHorizontalDp: 12 },
      video: { radiusDp: 12, heightDp: 180, playButtonDp: 56, playIconDp: 24 },
      promo: { radiusDp: 12, paddingVerticalDp: 12, paddingHorizontalDp: 16, titleGapDp: 4, ctaTopGapDp: 8, ctaGapDp: 4, ctaPaddingVerticalDp: 6, ctaPaddingHorizontalDp: 12, ctaRadiusDp: 6, ctaIconDp: 16 },
      social: { iconGapDp: 6, titleGapDp: 8, platformIconDp: 20, gridGapDp: 4, radiusDp: 8, imageIconDp: 20 },
      liveStats: { labelTopGapDp: 2 },
      counter: { paddingVerticalDp: 16, labelTopGapDp: 4 },
      customHtml: { radiusDp: 12, paddingVerticalDp: 8, paddingHorizontalDp: 10, maxHeightDp: 120, iconGapDp: 6, iconDp: 20 },
      gradientHero: { heightDp: 180, paddingVerticalDp: 16, paddingHorizontalDp: 20, iconDp: 28, iconTopDp: 12, iconRightDp: 12, titleBottomGapDp: 4 },
      fallback: { marginVerticalDp: 8, marginHorizontalDp: 16, radiusDp: 12, paddingVerticalDp: 12, paddingHorizontalDp: 16, titleTopGapDp: 4 },
      chrome: { statusVerticalDp: 8, statusHorizontalDp: 16, statusItemGapDp: 4, identityPaddingTopDp: 20, identityPaddingHorizontalDp: 20, identityPaddingBottomDp: 16, logoDp: 80, logoBottomGapDp: 8, followTopGapDp: 2, scrollBreathingRoomDp: 40, navHeightDp: 64, navHorizontalPaddingDp: 20, navGapDp: 2, navIconDp: 28 },
      emptyState: { heightDp: 180 },
      dropIndicator: { heightDp: 4 },
      selection: { outlineDp: 2, badgeTopDp: 6, badgeRightDp: 8, badgeRadiusDp: 6, badgePaddingVerticalDp: 4, badgePaddingHorizontalDp: 6 },
    },
  },

  snap: { alongSiblingDp: 6, crossSiblingDp: 6, pullSharpness: 2, settleDurationMs: 340 },
};

export const STOREFRONT_STUDIO_TOKENS = deepFreeze(TOKENS);
export const PREVIEW_SCALE = STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE;
export const toPreviewPx = (dp) => dp * PREVIEW_SCALE;
