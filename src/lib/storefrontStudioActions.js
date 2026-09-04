// src/lib/storefrontStudioActions.js
// =============================================================================
// Azaman Storefront Studio V2 — safe customer action registry
//
// Actions are declarative intents, never executable JavaScript. The editor and
// the published storefront can share this registry so the Business Portal
// cannot author an action the customer app does not understand.
// =============================================================================

export const STOREFRONT_ACTION_VERSION = 1;

export const STOREFRONT_ACTION_TYPES = Object.freeze({
  OPEN_PRODUCT: 'openProduct',
  OPEN_CATEGORY: 'openCategory',
  ADD_TO_CART: 'addToCart',
  OPEN_CART: 'openCart',
  CHECKOUT: 'checkout',
  OPEN_REVIEWS: 'openStoreReviews',
  OPEN_LOCATION: 'openStoreLocation',
  CALL_BUSINESS: 'callBusiness',
  OPEN_EXTERNAL_URL: 'openExternalUrl',
  NAVIGATE_PAGE: 'navigatePage',
  SCROLL_TO: 'scrollTo',
  FOLLOW_STORE: 'followStore',
});

const FIELD_TYPES = Object.freeze({
  productId: 'string',
  categoryId: 'string',
  pageId: 'string',
  nodeId: 'string',
  url: 'string',
  analyticsEvent: 'string',
  confirmation: 'boolean',
});

export const STOREFRONT_ACTION_DEFINITIONS = Object.freeze({
  [STOREFRONT_ACTION_TYPES.OPEN_PRODUCT]: { required: ['productId'], fields: { productId: FIELD_TYPES.productId } },
  [STOREFRONT_ACTION_TYPES.OPEN_CATEGORY]: { required: ['categoryId'], fields: { categoryId: FIELD_TYPES.categoryId } },
  [STOREFRONT_ACTION_TYPES.ADD_TO_CART]: { required: ['productId'], fields: { productId: FIELD_TYPES.productId, confirmation: FIELD_TYPES.confirmation } },
  [STOREFRONT_ACTION_TYPES.OPEN_CART]: { required: [], fields: {} },
  [STOREFRONT_ACTION_TYPES.CHECKOUT]: { required: [], fields: {} },
  [STOREFRONT_ACTION_TYPES.OPEN_REVIEWS]: { required: [], fields: {} },
  [STOREFRONT_ACTION_TYPES.OPEN_LOCATION]: { required: [], fields: {} },
  [STOREFRONT_ACTION_TYPES.CALL_BUSINESS]: { required: [], fields: {} },
  [STOREFRONT_ACTION_TYPES.OPEN_EXTERNAL_URL]: { required: ['url'], fields: { url: FIELD_TYPES.url } },
  [STOREFRONT_ACTION_TYPES.NAVIGATE_PAGE]: { required: ['pageId'], fields: { pageId: FIELD_TYPES.pageId } },
  [STOREFRONT_ACTION_TYPES.SCROLL_TO]: { required: ['nodeId'], fields: { nodeId: FIELD_TYPES.nodeId } },
  [STOREFRONT_ACTION_TYPES.FOLLOW_STORE]: { required: [], fields: {} },
});

const isPlainObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export function listStorefrontActions() {
  return Object.entries(STOREFRONT_ACTION_DEFINITIONS).map(([type, definition]) => ({
    type,
    ...definition,
  }));
}

export function validateStorefrontAction(action, { pageIds = [], nodeIds = [] } = {}) {
  if (!isPlainObject(action)) return { valid: false, code: 'ACTION_OBJECT_REQUIRED', errors: ['Action must be an object.'] };

  const type = action.type;
  const definition = STOREFRONT_ACTION_DEFINITIONS[type];
  if (!definition) {
    return { valid: false, code: 'UNKNOWN_ACTION', errors: [`Unsupported storefront action: ${type || '(missing)'}.`] };
  }

  const errors = [];
  for (const field of definition.required) {
    if (!isNonEmptyString(action[field])) errors.push(`${field} is required.`);
  }

  for (const [field, fieldType] of Object.entries(definition.fields)) {
    if (!(field in action)) continue;
    const value = action[field];
    if (fieldType === 'string' && !isNonEmptyString(value)) errors.push(`${field} must be a non-empty string.`);
    if (fieldType === 'boolean' && typeof value !== 'boolean') errors.push(`${field} must be boolean.`);
  }

  if (type === STOREFRONT_ACTION_TYPES.NAVIGATE_PAGE && isNonEmptyString(action.pageId) && !pageIds.includes(action.pageId)) {
    errors.push(`Unknown pageId: ${action.pageId}.`);
  }
  if (type === STOREFRONT_ACTION_TYPES.SCROLL_TO && isNonEmptyString(action.nodeId) && !nodeIds.includes(action.nodeId)) {
    errors.push(`Unknown nodeId: ${action.nodeId}.`);
  }
  if (type === STOREFRONT_ACTION_TYPES.OPEN_EXTERNAL_URL && isNonEmptyString(action.url)) {
    try {
      const parsed = new URL(action.url);
      if (!['https:', 'http:'].includes(parsed.protocol)) errors.push('External URLs must use http or https.');
      if (parsed.username || parsed.password) errors.push('External URLs may not contain embedded credentials.');
    } catch {
      errors.push('External URL is invalid.');
    }
  }

  return { valid: errors.length === 0, code: errors.length ? 'INVALID_ACTION' : null, errors };
}

export function normalizeStorefrontActions(actions, context = {}) {
  if (!isPlainObject(actions)) return {};
  const normalized = {};
  for (const [trigger, action] of Object.entries(actions)) {
    const result = validateStorefrontAction(action, context);
    if (result.valid) {
      normalized[trigger] = { type: action.type, ...action };
    }
  }
  return normalized;
}
