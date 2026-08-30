// src/services/storefrontApi.js
// All authenticated endpoints use /me/* — the backend resolves businessProfileId from the JWT.
// Public endpoints use /:businessProfileId/* for unauthenticated access.
import { request } from '@/lib/apiCore';

const BASE = '/api/storefront';

async function sfRequest(path, options) {
  try {
    const response = await request(path, options);
    // Backend wraps responses in { success, data } — unwrap transparently
    return response?.data !== undefined ? response.data : response;
  } catch (err) {
    throw err;
  }
}

export const storefrontApi = {
  // ── PUBLIC (no auth — uses businessProfileId in URL) ──────────────────────
  /** Render the published storefront for a business (used by Flutter + public web) */
  getPublishedLayout: (businessProfileId) =>
    sfRequest(`${BASE}/${businessProfileId}/render`),

  /** Public theme tokens for web ordering integration */
  getPublicTheme: (businessProfileId) =>
    sfRequest(`${BASE}/${businessProfileId}/public-theme`),

  // ── CATALOG (public, no businessId needed) ─────────────────────────────────
  listThemes:    (category) => sfRequest(`${BASE}/themes${category ? `?category=${category}` : ''}`),
  listWidgets:   (category) => sfRequest(`${BASE}/widgets${category ? `?category=${category}` : ''}`),
  listTemplates: (category) => sfRequest(`${BASE}/templates${category ? `?category=${category}` : ''}`),

  // ── AUTHENTICATED — /me/* (JWT resolves businessProfileId) ─────────────────
  /** Get or create the draft layout for the authenticated business */
  getDraft: () =>
    sfRequest(`${BASE}/me/draft`),

  /** Save the current draft (PUT) */
  saveDraft: (layoutJson, themeId, expectedUpdatedAt) =>
    sfRequest(`${BASE}/me/draft`, {
      method: 'PUT',
      body: JSON.stringify({ layoutJson, themeId, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }),
    }),

  /** Publish the draft using the snapshot the editor last observed. */
  publish: (expectedUpdatedAt) =>
    sfRequest(`${BASE}/me/publish`, {
      method: 'POST',
      body: JSON.stringify(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
    }),

  /** Get version history */
  getHistory: (limit) =>
    sfRequest(`${BASE}/me/history${limit ? `?limit=${limit}` : ''}`),

  /** Revert draft to a previous version while protecting the current snapshot. */
  revertToVersion: (versionId, expectedUpdatedAt) =>
    sfRequest(`${BASE}/me/revert`, {
      method: 'POST',
      body: JSON.stringify({ versionId, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }),
    }),

  /** Apply a template while protecting the current draft snapshot. */
  applyTemplate: (templateId, expectedUpdatedAt) =>
    sfRequest(`${BASE}/me/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }),
    }),

  /** Check AZM staking eligibility / tier */
  checkEligibility: () =>
    sfRequest(`${BASE}/me/eligibility`),

  /** Record a storefront analytics event */
  recordEvent: (eventType, metadata) =>
    sfRequest(`${BASE}/me/analytics`, {
      method: 'POST',
      body: JSON.stringify({ eventType, metadata }),
    }),

  /** Get aggregated storefront analytics (business owner view) */
  getAnalytics: (days = 30) =>
    sfRequest(`${BASE}/me/analytics?days=${days}`),

  /** Upload media for a tile (multipart) */
  uploadMedia: (formData) =>
    sfRequest(`${BASE}/me/media`, {
      method: 'POST',
      headers: {}, // let browser set Content-Type with boundary
      body: formData,
    }),
};
