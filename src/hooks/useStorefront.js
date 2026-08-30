// src/hooks/useStorefront.js
// All authenticated API calls use /me/* — no businessId passed to API layer.
// businessId is only used as a React dependency to know WHEN to load.
import { useState, useEffect, useCallback, useRef } from 'react';
import { storefrontApi } from '@/services/storefrontApi';

export function useStorefront(businessId) {
  const [draft, setDraft]           = useState(null);
  const [published, setPublished]   = useState(null);
  const [themes, setThemes]         = useState([]);
  const [widgets, setWidgets]       = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const autoSaveTimer               = useRef(null);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    loadAll();
    return () => clearTimeout(autoSaveTimer.current);
  }, [businessId]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [draftData, themesData, widgetsData, eligibilityData] = await Promise.all([
        storefrontApi.getDraft().catch(() => null),
        storefrontApi.listThemes().catch(() => []),
        storefrontApi.listWidgets().catch(() => []),
        storefrontApi.checkEligibility().catch(() => null),
      ]);
      // getPublishedLayout uses the public endpoint — read from draft if available,
      // otherwise fetch separately using businessId
      let publishedData = null;
      if (businessId) {
        publishedData = await storefrontApi.getPublishedLayout(businessId).catch(() => null);
      }
      setDraft(draftData);
      setPublished(publishedData);
      setThemes(Array.isArray(themesData) ? themesData : themesData?.themes ?? []);
      setWidgets(Array.isArray(widgetsData) ? widgetsData : widgetsData?.widgets ?? []);
      setEligibility(eligibilityData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = useCallback(async (layoutJson, themeId) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await storefrontApi.saveDraft(layoutJson, themeId, draft?.updatedAt);
      setDraft(updated);
      return updated;
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'STOREFRONT_DRAFT_CONFLICT' || err.message?.includes('modified by another editor')) {
        setError('Draft was modified by another editor. Refreshing...');
        await loadAll();
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [draft?.updatedAt]);

  const publish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await storefrontApi.publish(draft?.updatedAt);
      setPublished(result);
      setDraft(null);
      return result;
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'STOREFRONT_DRAFT_CONFLICT' || err.message?.includes('modified by another editor')) {
        setError('The storefront changed before publishing. Refreshing the latest draft...');
        await loadAll();
      } else if (err.statusCode === 402 && err.violations) {
        // PHASE 8: Surface Nitro 402 violations to the UI
        const summary = err.violations.map(v =>
          `${v.type === 'theme' ? 'Theme' : 'Widget'} "${v.key}" requires ${v.requiredTier.replace('NITRO_', '')} tier`
        ).join('; ');
        setError(`Nitro eligibility failed: ${summary}. Stake more AZM to unlock.`);
        err.userMessage = `Nitro eligibility failed: ${summary}`;
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [draft?.updatedAt]);

  const scheduleAutoSave = useCallback((layoutJson, themeId) => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(layoutJson, themeId).catch(() => {});
    }, 30000);
  }, [saveDraft]);

  const changeTheme = useCallback((themeId) => {
    if (!draft) return;
    const updated = { ...draft, themeId };
    setDraft(updated);
    saveDraft(draft.layoutJson, themeId).catch(() => {});
  }, [draft, saveDraft]);

  const addTile = useCallback((widgetType, defaultProps = {}) => {
    if (!draft) return;
    const tiles = draft.layoutJson?.tiles ?? [];
    const maxRow = tiles.reduce((max, t) => Math.max(max, (t.position?.row ?? 0) + (t.position?.rowSpan ?? 1)), 0);
    const newTile = {
      id: `tile_${Math.random().toString(36).substring(2, 10)}`,
      widgetType,
      position: { row: maxRow, col: 0, rowSpan: 2, colSpan: 4 },
      props: { ...defaultProps },
    };
    const updated = {
      ...draft,
      layoutJson: { ...draft.layoutJson, tiles: [...tiles, newTile] },
    };
    setDraft(updated);
    scheduleAutoSave(updated.layoutJson, draft.themeId);
  }, [draft, scheduleAutoSave]);

  const updateTile = useCallback((tileId, newProps) => {
    if (!draft) return;
    const updated = {
      ...draft,
      layoutJson: {
        ...draft.layoutJson,
        tiles: draft.layoutJson.tiles.map(t =>
          t.id === tileId ? { ...t, props: { ...t.props, ...newProps } } : t
        ),
      },
    };
    setDraft(updated);
    scheduleAutoSave(updated.layoutJson, draft.themeId);
  }, [draft, scheduleAutoSave]);

  const removeTile = useCallback((tileId) => {
    if (!draft) return;
    const updated = {
      ...draft,
      layoutJson: {
        ...draft.layoutJson,
        tiles: draft.layoutJson.tiles.filter(t => t.id !== tileId),
      },
    };
    setDraft(updated);
    scheduleAutoSave(updated.layoutJson, draft.themeId);
  }, [draft, scheduleAutoSave]);

  const reorderTiles = useCallback((newTiles) => {
    if (!draft) return;
    const updated = { ...draft, layoutJson: { ...draft.layoutJson, tiles: newTiles } };
    setDraft(updated);
    scheduleAutoSave(updated.layoutJson, draft.themeId);
  }, [draft, scheduleAutoSave]);

  const applyTemplate = useCallback(async (templateId) => {
    setSaving(true);
    setError(null);
    try {
      const newDraft = await storefrontApi.applyTemplate(templateId, draft?.updatedAt);
      setDraft(newDraft);
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'STOREFRONT_DRAFT_CONFLICT') {
        setError('The storefront changed before the template was applied. Refreshing...');
        await loadAll();
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [draft?.updatedAt]);

  const revertToVersion = useCallback(async (versionId) => {
    setSaving(true);
    setError(null);
    try {
      const newDraft = await storefrontApi.revertToVersion(versionId, draft?.updatedAt);
      setDraft(newDraft);
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'STOREFRONT_DRAFT_CONFLICT') {
        setError('The storefront changed before the revert was applied. Refreshing...');
        await loadAll();
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [draft?.updatedAt]);

  // PHASE 8: Record analytics event (nitro_upsell_clicked, etc.)
  const recordEvent = useCallback(async (eventType, metadata = {}) => {
    try {
      await storefrontApi.recordEvent(eventType, metadata);
    } catch (e) {
      console.warn('[useStorefront] recordEvent error:', e.message);
    }
  }, []);

  return {
    draft, published, themes, widgets, eligibility, loading, saving, error,
    loadAll, saveDraft, publish, changeTheme, recordEvent,
    addTile, updateTile, removeTile, reorderTiles, applyTemplate, revertToVersion, setError,
  };
}
