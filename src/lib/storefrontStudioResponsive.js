// src/lib/storefrontStudioResponsive.js
// =============================================================================
// Responsive intent resolver for Storefront Studio V2.
// Responsive overrides are semantic, not pixel coordinates, so the renderer
// can derive a deterministic layout for each customer viewport.
// =============================================================================

const VIEWPORTS = new Set(['phone', 'tablet', 'desktop']);

const LAYOUT_KEYS = new Set([
  'direction',
  'align',
  'gap',
  'padding',
  'visibility',
  'widthMode',
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function normalizeStudioViewport(viewport) {
  return VIEWPORTS.has(viewport) ? viewport : 'phone';
}

/**
 * Resolve a node's responsive intent. Overrides may be expressed as the
 * documented semantic keys or explicitly under `layout` / `props`.
 */
export function resolveResponsiveNode(node, viewport = 'phone') {
  if (!node) return node;

  const resolvedViewport = normalizeStudioViewport(viewport);
  const raw = node.responsive?.[resolvedViewport];
  if (!raw || typeof raw !== 'object') return clone(node);

  const next = clone(node);
  next.layout = { ...(next.layout || {}), ...(raw.layout || {}) };
  next.props = { ...(next.props || {}), ...(raw.props || {}) };

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'layout' || key === 'props') continue;
    if (LAYOUT_KEYS.has(key)) next.layout[key] = clone(value);
    else if (key === 'columnCount') next.props.columns = clone(value);
    else if (key === 'textScale' || key === 'carousel') next.props[key] = clone(value);
  }

  return next;
}

export function responsiveGrid(node, viewport = 'phone') {
  const resolved = resolveResponsiveNode(node, viewport);
  const grid = { ...(resolved?.layout?.grid || {}) };

  if (Number.isFinite(resolved?.props?.columns) &&
      (resolved.type === 'product-grid' || resolved.type === 'product-carousel' || resolved.type === 'category-rail')) {
    grid.colSpan = Number.isFinite(grid.colSpan) ? grid.colSpan : 4;
  }

  return grid;
}
