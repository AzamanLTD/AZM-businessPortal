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

  /** Public category-native experience contract */
  getPublicExperience: (businessProfileId) =>
    sfRequest(`${BASE}/${businessProfileId}/experience`),

  // ── CATALOG (public, no businessId needed) ─────────────────────────────────
  listThemes:    (category) => sfRequest(`${BASE}/themes${category ? `?category=${category}` : ''}`),
  listWidgets:   (category) => sfRequest(`${BASE}/widgets${category ? `?category=${category}` : ''}`),
  listTemplates: (category) => sfRequest(`${BASE}/templates${category ? `?category=${category}` : ''}`),

  // ── AUTHENTICATED — /me/* (JWT resolves businessProfileId) ─────────────────
  /** Get or create the draft layout for the authenticated business */
  getDraft: () => sfRequest(`${BASE}/me/draft`),

  /** Save the current draft (PUT) */
  saveDraft: (layoutJson, themeId, expectedUpdatedAt) =>
    sfRequest(`${BASE}/me/draft`, {
      method: 'PUT',
      body: JSON.stringify({ layoutJson, themeId, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }),
    }),

  /** Publish the draft using the transactional compare-and-swap publish boundary. */
  publish: (expectedUpdatedAt) =>
    sfRequest(`${BASE}/me/publish-safe`, {
      method: 'POST',
      body: JSON.stringify(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
    }),

  /** Get version history */
  getHistory: (limit) => sfRequest(`${BASE}/me/history${limit ? `?limit=${limit}` : ''}`),

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
  checkEligibility: () => sfRequest(`${BASE}/me/eligibility`),

  /** Record a storefront analytics event */
  recordEvent: (eventType, metadata) =>
    sfRequest(`${BASE}/me/analytics`, {
      method: 'POST',
      body: JSON.stringify({ eventType, metadata }),
    }),

  /** Get aggregated storefront analytics (business owner view) */
  getAnalytics: (days = 30) => sfRequest(`${BASE}/me/analytics?days=${days}`),

  /** Upload media for a tile (multipart) */
  uploadMedia: (formData) =>
    sfRequest(`${BASE}/me/media`, {
      method: 'POST',
      headers: {}, // let browser set Content-Type with boundary
      body: formData,
    }),

  // ── EXPERIENCE STUDIO ─────────────────────────────────────────────────────
  /**
   * The business's effective experience settings:
   * { category, blueprint, defaults, presets, navigationModes, ... }.
   * (Removed by mistake in 0885c0b0; the Studio page could not load without it.)
   */
  getExperience: () => sfRequest(`${BASE}/me/experience`),

  /**
   * Save the blueprint through PUT /me/experience: the server normalizes it
   * for the business's category and writes it into the draft's layout in a
   * locked transaction, keeping the tiles. The draft's updatedAt, read just
   * before, makes a save on top of another editor's newer draft a 409.
   * (It used to PUT the whole layout to /me/draft, whose schema drops
   * `experience`, so a Studio save was silently lost.)
   */
  saveExperience: async (blueprint) => {
    const draft = await sfRequest(`${BASE}/me/draft`);
    return sfRequest(`${BASE}/me/experience`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(blueprint && typeof blueprint === 'object' ? blueprint : {}),
        ...(draft?.updatedAt ? { expectedUpdatedAt: draft.updatedAt } : {}),
      }),
    });
  },
};