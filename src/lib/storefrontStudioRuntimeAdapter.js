// src/lib/storefrontStudioRuntimeAdapter.js
// =============================================================================
// Storefront Studio V2 -> live storefront preview bridge
//
// The editor owns a semantic tree, while the established customer preview still
// consumes the legacy widget-tile contract. Keep that compatibility boundary in
// one pure adapter so Studio and the customer runtime cannot drift into separate
// rendering implementations.
// =============================================================================

const TYPE_TO_WIDGET = Object.freeze({
  hero: 'hero_header',
  'product-grid': 'product_grid',
  'product-carousel': 'product_grid',
  'product-card': 'product_grid',
  'category-rail': 'product_grid',
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
    return {
      ...props,
      customInfo: props.value ?? props.text ?? 'Text block',
    };
  }

  if (node.type === 'rating') {
    return {
      ...props,
      showRating: true,
      customInfo: props.customInfo || props.label,
    };
  }

  if (node.type === 'product-carousel' || node.type === 'category-rail') {
    return {
      ...props,
      title: props.title || (node.type === 'category-rail' ? 'Browse categories' : 'Explore more'),
    };
  }

  if (node.type === 'product-card') {
    return {
      ...props,
      title: props.title || props.name || 'Product',
      maxItems: 1,
    };
  }

  if (node.type === 'button' || node.type === 'icon-button') {
    return {
      ...props,
      showOrder: props.showOrder !== false,
      customLabel: props.label || props.text,
    };
  }

  return props;
}

function appendNode({ document, node, tiles, rowRef }) {
  if (node.layout?.visibility === false) return;

  const widgetType = TYPE_TO_WIDGET[node.type];
  if (widgetType) {
    const position = node.layout?.grid || {};
    const row = Number.isFinite(position.row) ? position.row : rowRef.value;
    const col = Number.isFinite(position.col) ? position.col : 0;
    tiles.push({
      id: node.id,
      widgetType,
      position: {
        row,
        col,
        rowSpan: Number.isFinite(position.rowSpan) ? position.rowSpan : 2,
        colSpan: Number.isFinite(position.colSpan) ? position.colSpan : 4,
      },
      props: runtimeProps(node),
    });
    rowRef.value = Math.max(rowRef.value + 1, row + 1);
  }

  for (const child of nodeChildren(document, node)) {
    appendNode({ document, node: child, tiles, rowRef });
  }
}

export function studioDocumentToRuntimeTiles(document) {
  const tiles = [];
  const rowRef = { value: 0 };
  const home = document?.pages?.[0];

  for (const nodeId of home?.root || []) {
    const node = document?.nodes?.[nodeId];
    if (node) appendNode({ document, node, tiles, rowRef });
  }

  return tiles.sort((a, b) => {
    const rowDelta = (a.position?.row || 0) - (b.position?.row || 0);
    return rowDelta || (a.position?.col || 0) - (b.position?.col || 0);
  });
}

export function studioDocumentToRuntimeDraft(draft, document) {
  return {
    ...(draft || {}),
    layoutJson: {
      ...clone(draft?.layoutJson || {}),
      tiles: studioDocumentToRuntimeTiles(document),
    },
  };
}

export function runtimeAdapterIsContainer(type) {
  return CONTAINER_TYPES.has(type);
}
