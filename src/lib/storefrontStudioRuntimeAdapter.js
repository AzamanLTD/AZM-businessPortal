// src/lib/storefrontStudioRuntimeAdapter.js
// =============================================================================
// Storefront Studio V2 -> live storefront preview bridge
// =============================================================================

import { normalizeStudioViewport, responsiveGrid, resolveResponsiveNode } from './storefrontStudioResponsive';
import { STOREFRONT_STUDIO_TOKENS } from './storefrontStudioTokens';

const TYPE_TO_WIDGET = Object.freeze({
  hero: 'hero_header',
  'product-grid': 'product_grid',
  'product-carousel': 'product_grid',
  'product-card': 'product_grid',
  'category-rail': 'product_grid',
  'retail-collection-box': 'retail_collection_box',
  reviews: 'review_carousel',
  contact: 'contact_card',
  location: 'location_map',
  promo: 'promo_banner',
  social: 'social_feed',
  video: 'video_player',
  button: 'action_buttons',
  'icon-button': 'action_buttons',
  text: 'quick_info_bar',
  rating: 'quick_info_bar',
  image: 'showcase_gallery',
  'gradient-hero': 'gradient_hero',
});

const CONTAINER_TYPES = new Set([
  'page',
  'section',
  'stack',
  'row',
  'column',
  'grid',
  'overlay',
]);

const DEFAULT_GRID = STOREFRONT_STUDIO_TOKENS.studio.defaultGrid;

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

function nodeChildren(document, node) {
  return (node.children || [])
    .map((id) => document.nodes?.[id])
    .filter(Boolean);
}

function runtimeProps(node) {
  const props = clone(node.props || {});

  if (node.type === 'text') {
    return { ...props, customInfo: props.value ?? props.text ?? 'Text block' };
  }
  if (node.type === 'rating') {
    return { ...props, showRating: true, customInfo: props.customInfo || props.label };
  }
  if (node.type === 'product-carousel' || node.type === 'category-rail') {
    return { ...props, title: props.title || (node.type === 'category-rail' ? 'Browse categories' : 'Explore more') };
  }
  if (node.type === 'product-card') {
    return { ...props, title: props.title || props.name || 'Product', maxItems: 1 };
  }
  if (node.type === 'button' || node.type === 'icon-button') {
    return { ...props, showOrder: props.showOrder !== false, customLabel: props.label || props.text };
  }
  if (node.type === 'retail-collection-box') {
    return { ...props, title: props.title || 'Collection', maxItems: Number.isFinite(props.maxItems) ? props.maxItems : 6 };
  }
  return props;
}

function appendNode({ document, node, tiles, rowRef, viewport }) {
  const resolvedNode = resolveResponsiveNode(node, viewport);
  if (resolvedNode.layout?.visibility === false) return;

  const widgetType = TYPE_TO_WIDGET[resolvedNode.type];
  if (widgetType) {
    const position = responsiveGrid(resolvedNode, viewport);
    const row = Number.isFinite(position.row) ? position.row : rowRef.value;
    const col = Number.isFinite(position.col) ? position.col : 0;
    tiles.push({
      id: resolvedNode.id,
      widgetType,
      position: {
        row,
        col,
        rowSpan: Number.isFinite(position.rowSpan) ? position.rowSpan : DEFAULT_GRID.rowSpan,
        colSpan: Number.isFinite(position.colSpan) ? position.colSpan : DEFAULT_GRID.colSpan,
      },
      props: runtimeProps(resolvedNode),
    });
    rowRef.value = Math.max(rowRef.value + 1, row + 1);
  }

  for (const child of nodeChildren(document, resolvedNode)) {
    appendNode({ document, node: child, tiles, rowRef, viewport });
  }
}

export function studioDocumentToRuntimeTiles(document, viewport = 'phone') {
  const tiles = [];
  const rowRef = { value: 0 };
  const home = document?.pages?.[0];
  const resolvedViewport = normalizeStudioViewport(viewport);

  for (const nodeId of home?.root || []) {
    const node = document?.nodes?.[nodeId];
    if (node) appendNode({ document, node, tiles, rowRef, viewport: resolvedViewport });
  }

  return tiles.sort((a, b) => {
    const rowDelta = (a.position?.row || 0) - (b.position?.row || 0);
    return rowDelta || (a.position?.col || 0) - (b.position?.col || 0);
  });
}

export function studioDocumentToRuntimeDraft(draft, document, viewport = 'phone') {
  return {
    ...(draft || {}),
    layoutJson: {
      ...clone(draft?.layoutJson || {}),
      tiles: studioDocumentToRuntimeTiles(document, viewport),
    },
  };
}

export function runtimeAdapterIsContainer(type) {
  return CONTAINER_TYPES.has(type);
}
