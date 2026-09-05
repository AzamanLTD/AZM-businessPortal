// src/lib/storefrontStudioResponsive.js
// =============================================================================
// Responsive intent resolver for Storefront Studio V2.
// Responsive overrides are semantic, not pixel coordinates, so the renderer
// can derive a deterministic layout for each customer viewport.
// =============================================================================

import { STOREFRONT_STUDIO_TOKENS } from './storefrontStudioTokens';

const VIEWPORT_ORDER = ['phone', 'tablet', 'desktop'];
const VIEWPORTS = new Set(VIEWPORT_ORDER);

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

export const STUDIO_VIEWPORTS = Object.freeze(VIEWPORT_ORDER);
export const STUDIO_PHONE_DEVICE = STOREFRONT_STUDIO_TOKENS.device.phone;

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
 * Resolve a node's responsive intent with explicit breakpoint inheritance.
 * Tablet inherits phone intent when a tablet layer exists; desktop inherits
 * tablet intent when a tablet layer exists. A desktop-only document remains
 * backward-compatible with the pre-cascade behavior and resolves desktop from
 * its base node plus the explicit desktop override.
 *
 * The persisted node is never mutated and the returned `responsive` definition
 * remains intact.
 */
export function resolveResponsiveNode(node, viewport = 'phone') {
  if (!node) return node;

  const resolvedViewport = normalizeStudioViewport(viewport);
  const next = clone(node);
  const responsive = node.responsive;
  if (!responsive || typeof responsive !== 'object') return next;

  if (resolvedViewport === 'phone') {
    applyResponsiveOverride(next, responsive.phone);
    return next;
  }

  if (resolvedViewport === 'tablet') {
    applyResponsiveOverride(next, responsive.phone);
    applyResponsiveOverride(next, responsive.tablet);
    return next;
  }

  // Preserve the established desktop fallback when no tablet definition exists;
  // once tablet intent exists, desktop naturally inherits the complete tablet
  // layer before applying its own explicit overrides.
  if (responsive.tablet && typeof responsive.tablet === 'object') {
    applyResponsiveOverride(next, responsive.phone);
    applyResponsiveOverride(next, responsive.tablet);
  }
  applyResponsiveOverride(next, responsive.desktop);
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
