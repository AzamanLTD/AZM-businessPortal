// src/lib/storefrontStudioModel.js
// =============================================================================
// Azaman Storefront Studio V2 — document primitives
//
// The visual editor is intentionally separated into mutation domains so canvas
// interactions cannot accidentally write layout fields into component props.
// The legacy tile format remains the server compatibility boundary for now.
// =============================================================================

export const STUDIO_SCHEMA_VERSION = 2;

export const STUDIO_NODE_TYPES = Object.freeze([
  'page',
  'section',
  'stack',
  'row',
  'column',
  'grid',
  'overlay',
  'hero',
  'product-grid',
  'product-carousel',
  'product-card',
  'category-rail',
  'retail-collection-box',
  'button',
  'icon-button',
  'text',
  'image',
  'video',
  'rating',
  'reviews',
  'contact',
  'location',
  'promo',
  'social',
  'spacer',
  'divider',
]);

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

export function createStudioNode({ id, type, children = [], props = {}, style = {}, layout = {}, actions = {}, responsive = {} }) {
  if (!id || !type) throw new Error('Studio node id and type are required.');
  if (!STUDIO_NODE_TYPES.includes(type)) throw new Error(`Unsupported studio node type: ${type}`);
  return {
    id,
    type,
    children: [...children],
    props: { ...props },
    style: { ...style },
    responsive: { ...responsive },
    layout: { ...layout },
    actions: { ...actions },
  };
}

export function createEmptyStudioDocument() {
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    pages: [{ id: 'home', name: 'Home', slug: '/', root: [] }],
    nodes: {},
    theme: { tokens: {} },
    navigation: {},
    assets: [],
  };
}

function legacyType(widgetType) {
  const map = {
    hero_header: 'hero',
    quick_info_bar: 'section',
    product_grid: 'product-grid',
    showcase_gallery: 'product-carousel',
    review_carousel: 'reviews',
    contact_card: 'contact',
    location_map: 'location',
    action_buttons: 'row',
    video_player: 'video',
    promo_banner: 'promo',
    social_feed: 'social',
    retail_collection_box: 'retail-collection-box',
    custom_html: 'section',
    gradient_hero: 'hero',
  };
  return map[widgetType] || 'section';
}

export function migrateLegacyTiles(layoutJson = {}) {
  const tiles = Array.isArray(layoutJson.tiles) ? layoutJson.tiles : [];
  const doc = createEmptyStudioDocument();
  const root = [];
  const allocatedIds = new Set();

  const allocateId = (tile, index) => {
    const explicitId = tile?.id == null ? '' : String(tile.id).trim();
    if (explicitId) {
      if (!allocatedIds.has(explicitId)) {
        allocatedIds.add(explicitId);
        return explicitId;
      }
      let duplicate = `${explicitId}-${index + 1}`;
      let suffix = 2;
      while (allocatedIds.has(duplicate)) duplicate = `${explicitId}-${index + 1}-${suffix++}`;
      allocatedIds.add(duplicate);
      return duplicate;
    }

    const base = `legacy_${index + 1}`;
    let generated = base;
    let suffix = 2;
    while (allocatedIds.has(generated)) generated = `${base}_${suffix++}`;
    allocatedIds.add(generated);
    return generated;
  };

  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index] || {};
    const id = allocateId(tile, index);
    const type = legacyType(tile.widgetType);
    const node = createStudioNode({
      id,
      type,
      props: { ...(tile.props || {}), legacyWidgetType: tile.widgetType || 'unknown' },
      layout: {
        mode: 'grid-item',
        grid: {
          row: Number.isFinite(tile.position?.row) ? tile.position.row : 0,
          col: Number.isFinite(tile.position?.col) ? tile.position.col : 0,
          rowSpan: Number.isFinite(tile.position?.rowSpan) ? tile.position.rowSpan : 2,
          colSpan: Number.isFinite(tile.position?.colSpan) ? tile.position.colSpan : 4,
        },
      },
    });
    doc.nodes[id] = node;
    root.push(id);
  }

  doc.pages[0].root = root;
  return doc;
}

/** Convert the current v1 tile contract into a v2 document without changing the original. */
export function migrateLayoutToStudio(layoutJson = {}) {
  if (layoutJson?.experience?.schemaVersion >= STUDIO_SCHEMA_VERSION && layoutJson.experience.nodes) {
    return clone(layoutJson.experience);
  }
  return migrateLegacyTiles(layoutJson);
}

/** Strictly patch presentation-independent content. */
export function patchNodeContent(node, patch = {}) {
  return { ...clone(node), props: { ...(node?.props || {}), ...clone(patch) } };
}

/** Strictly patch visual presentation. */
export function patchNodeStyle(node, patch = {}) {
  return { ...clone(node), style: { ...(node?.style || {}), ...clone(patch) } };
}

/** Strictly patch geometry/layout. */
export function patchNodeLayout(node, patch = {}) {
  return { ...clone(node), layout: { ...(node?.layout || {}), ...clone(patch) } };
}

/** Strictly patch executable customer intent metadata. */
export function patchNodeActions(node, patch = {}) {
  return { ...clone(node), actions: { ...(node?.actions || {}), ...clone(patch) } };
}

/** Convert one legacy-compatible tile patch without leaking top-level tile fields into props. */
export function patchLegacyTile(tile, patch = {}) {
  const next = clone(tile);
  const { props, position, ...rest } = patch;
  if (Object.keys(rest).length) Object.assign(next, rest);
  if (props && typeof props === 'object') next.props = { ...(next.props || {}), ...clone(props) };
  if (position && typeof position === 'object') next.position = { ...(next.position || {}), ...clone(position) };
  return next;
}
