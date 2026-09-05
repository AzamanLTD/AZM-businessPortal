// src/lib/storefrontStudioResponsive.js
// =============================================================================
// Responsive intent resolver for Storefront Studio V2.
// Responsive overrides are semantic, not pixel coordinates, so the renderer
// can derive a deterministic layout for each customer viewport.
// =============================================================================

const VIEWPORTS = new Set(['phone', 'tablet', 'desktop']);
const VIEWPORT_ORDER = ['phone', 'tablet', 'desktop'];

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

function applyResponsiveOverride(target, raw) {
  if (!raw || typeof raw !== 'object') return target;

  target.layout = { ...(target.layout || {}), ...(raw.layout || {}) };
  target.props = { ...(target.props || {}), ...(raw.props || {}) };

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'layout' || key === 'props') continue;
    if (LAYOUT_KEYS.has(key)) target.layout[key] = clone(value);
    else if (key === 'columnCount') target.props.columns = clone(value);
    else if (key === 'textScale' || key === 'carousel') target.props[key] = clone(value);
  }

  return target;
}

/**
 * Resolve a node's responsive intent using mobile-first inheritance.
 * Phone is the base responsive layer; tablet inherits phone and desktop
 * inherits tablet unless it explicitly overrides a value. The persisted node
 * is never mutated and the returned `responsive` definition remains intact.
 */
export function resolveResponsiveNode(node, viewport = 'phone') {
  if (!node) return node;

  const resolvedViewport = normalizeStudioViewport(viewport);
  const next = clone(node);
  const responsive = node.responsive;
  if (!responsive || typeof responsive !== 'object') return next;

  const targetIndex = VIEWPORT_ORDER.indexOf(resolvedViewport);
  for (let index = 0; index <= targetIndex; index += 1) {
    applyResponsiveOverride(next, responsive[VIEWPORT_ORDER[index]]);
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
