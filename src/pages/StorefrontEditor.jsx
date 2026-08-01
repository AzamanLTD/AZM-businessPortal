// src/pages/StorefrontEditor.jsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTypeConfig, getWidgetDefaults } from '@/lib/businessTypes';
import { useStorefront } from '@/hooks/useStorefront';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { Card } from '@/components/forge';
import { Tag } from '@/components/forge';
import WidgetPalette from '@/components/storefront/WidgetPalette';
import StorefrontCanvas from '@/components/storefront/StorefrontCanvas';
import TileConfigPanel from '@/components/storefront/TileConfigPanel';
import ThemePicker from '@/components/storefront/ThemePicker';
import StorefrontPhonePreview from '@/components/storefront/StorefrontPhonePreview';
import NitroUpsellBanner from '@/components/storefront/NitroUpsellBanner';
import PublishConfirmModal from '@/components/storefront/PublishConfirmModal';
import VersionHistorySidebar from '@/components/storefront/VersionHistorySidebar';
import KeyboardTileManager from '@/components/storefront/KeyboardTileManager';
import MagicLayout from '@/components/storefront/MagicLayout';
import StorefrontHealthScore from '@/components/storefront/StorefrontHealthScore';
import TemplateGallery from '@/components/storefront/TemplateGallery';
import QrCodePanel from '@/components/QrCodePanel';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, History, Save, Rocket, AlertCircle, X, Layout, LayoutTemplate, QrCode, BarChart3, ExternalLink, Copy, Undo2, Redo2 } from 'lucide-react';

export default function StorefrontEditor() {
  const { bizProfile } = useAuth();
  const businessId = bizProfile?.id;

  const {
    draft, published, themes, widgets, eligibility, loading, saving, error,
    saveDraft, publish, changeTheme, recordEvent, addTile, updateTile, removeTile, reorderTiles,
    applyTemplate, revertToVersion, setError,
  } = useStorefront(businessId);

  const { pushSnapshot, undo, redo, canUndo, canRedo, clear: clearHistory } = useUndoRedo();

  const [selectedTileId, setSelectedTileId]       = useState(null);
  const [showPublishModal, setShowPublishModal]     = useState(false);
  const [showHistory, setShowHistory]               = useState(false);
  const navigate = useNavigate();
  const [showPreview, setShowPreview]               = useState(true);
  const [showTemplates, setShowTemplates]             = useState(false);
  const [showQR, setShowQR]                           = useState(false);

  const selectedTile   = useMemo(() => draft?.layoutJson?.tiles?.find(t => t.id === selectedTileId) ?? null, [draft, selectedTileId]);
  const selectedWidget = useMemo(() => selectedTile ? widgets.find(w => w.widgetType === selectedTile.widgetType) : null, [selectedTile, widgets]);
  const theme          = useMemo(() => themes.find(t => t.id === draft?.themeId) ?? null, [draft?.themeId, themes]);
  const bizType        = useMemo(() => bizProfile ? getTypeConfig(bizProfile).type : 'GENERAL', [bizProfile]);

  // Wrapped mutations with undo/redo
  const handleAddTile = useCallback((widgetType, defaultProps = {}) => {
    if (draft) pushSnapshot(draft);
    addTile(widgetType, defaultProps);
  }, [draft, addTile, pushSnapshot]);

  const handleUpdateTile = useCallback((tileId, newProps) => {
    if (draft) pushSnapshot(draft);
    updateTile(tileId, newProps);
  }, [draft, updateTile, pushSnapshot]);

  const handleRemoveTile = useCallback((tileId) => {
    if (draft) pushSnapshot(draft);
    removeTile(tileId);
  }, [draft, removeTile, pushSnapshot]);

  const handleReorderTiles = useCallback((newTiles) => {
    if (draft) pushSnapshot(draft);
    reorderTiles(newTiles);
  }, [draft, reorderTiles, pushSnapshot]);

  const handleChangeTheme = useCallback((themeId) => {
    if (draft) pushSnapshot(draft);
    changeTheme(themeId);
  }, [draft, changeTheme, pushSnapshot]);

  const handleMagicLayout = useCallback((layoutJson, themeId) => {
    if (draft) pushSnapshot(draft);
    if (themeId) changeTheme(themeId);
    saveDraft(layoutJson, themeId).catch(() => {});
  }, [saveDraft, changeTheme, draft, pushSnapshot]);

  const handleApplyTemplate = useCallback((layoutJson, themeId) => {
    if (draft) pushSnapshot(draft);
    if (themeId) changeTheme(themeId);
    saveDraft(layoutJson, themeId).catch(() => {});
    setShowTemplates(false);
  }, [saveDraft, changeTheme, draft, pushSnapshot]);

  const isTileLocked = useCallback((widgetType) => {
    if (!eligibility) return false;
    const widget = widgets.find(w => w.widgetType === widgetType);
    return widget && widget.minAzmStake > (eligibility.stakedBalance ?? 0);
  }, [eligibility, widgets]);

  if (!businessId) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 text-center">
        <Layout className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--f-text-3)' }} />
        <p className="font-semibold" style={{ color: 'var(--f-text)' }}>No business profile found</p>
        <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>Connect a business profile to start editing your storefront.</p>
      </Card>
    </div>
  );

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--f-tint-color)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>Loading storefront editor…</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--f-bg)' }}>

      {/* ── Toolbar ── */}
      <Card className="flex items-center justify-between px-4 py-3 rounded-none border-x-0 border-t-0 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Layout className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
          <h1 className="text-base font-bold" style={{ color: 'var(--f-text)' }}>Storefront Editor</h1>
          {published && (
            <Tag variant="success">Published</Tag>
          )}
          {saving && (
            <span className="text-xs" style={{ color: 'var(--f-text-3)' }}>Saving…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)', background: showPreview ? 'var(--az-accent-subtle)' : 'transparent' }}>
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button onClick={() => navigate('/storefront/analytics')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}>
            <BarChart3 className="w-4 h-4" />Analytics
          </button>
          <button onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}>
            <LayoutTemplate className="w-4 h-4" />Templates
          </button>
          <button onClick={() => { if (canUndo) undo(); }}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-30"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}
            title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={() => { if (canRedo) redo(); }}
            disabled={!canRedo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-30"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}
            title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </button>
          <button onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}>
            <History className="w-4 h-4" />History
          </button>
          {published && (
            <button onClick={() => setShowQR(q => !q)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)', background: showQR ? 'var(--az-accent-subtle)' : 'transparent' }}>
              <QrCode className="w-4 h-4" />QR
            </button>
          )}
          {published && (
            <button onClick={() => {
              const url = `https://azaman.app/storefront/${bizProfile?.id}`;
              navigator.clipboard.writeText(url);
              navigator.open?.(url, '_blank') || window.open(url, '_blank');
            }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}>
              <ExternalLink className="w-4 h-4" />View Live
            </button>
          )}
          <button onClick={() => saveDraft(draft?.layoutJson, draft?.themeId)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50"
            style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}>
            <Save className="w-4 h-4" />Save Draft
          </button>
          <button onClick={() => setShowPublishModal(true)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--f-tint-color)', color: '#fff' }}>
            <Rocket className="w-4 h-4" />Publish
          </button>
        </div>
      </Card>

      {/* ── QR Code Panel ── */}
      {showQR && published && (
        <div className="mx-4 mt-3 p-3">
          <QrCodePanel
            label={`${bizProfile?.businessName || 'Storefront'} — Live Preview`}
            url={`${window.location.origin}/api/storefront/${bizProfile?.id}/render`}
          />
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: 'var(--az-danger-subtle)', color: 'var(--f-bad)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Widget Palette */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r" style={{ background: 'var(--az-bg-alt)', borderColor: 'var(--f-line)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'var(--f-line)' }}>
            <MagicLayout businessType={bizType} widgets={widgets} themes={themes} draft={draft} onApply={handleMagicLayout} disabled={loading} />
          </div>
          <KpiCardPalette widgets={widgets} eligibility={eligibility} businessType={bizType} onAdd={(widgetType, defaultProps) => {
              const typeDefaults = getWidgetDefaults(widgetType, bizType);
              handleAddTile(widgetType, { ...defaultProps, ...typeDefaults });
            }} isLocked={isTileLocked} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--f-bg)' }}>
          <KeyboardTileManager
            tiles={draft?.layoutJson?.tiles || []}
            selectedTileId={selectedTileId}
            onSelectTile={setSelectedTileId}
            onUpdateTile={handleUpdateTile}
            onRemoveTile={handleRemoveTile}
            onReorderTiles={handleReorderTiles}
            onOpenConfig={() => {}}
          >
            <StorefrontCanvas
              draft={draft}
              theme={theme}
              selectedTileId={selectedTileId}
              onSelectTile={setSelectedTileId}
              onUpdateTile={updateTile}
              onRemoveTile={removeTile}
              onReorderTiles={reorderTiles}
            />
          </KeyboardTileManager>
        </div>

        {/* Right: Config + Preview */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-l" style={{ background: 'var(--az-bg-alt)', borderColor: 'var(--f-line)' }}>
          {selectedTile && selectedWidget ? (
            <TileConfigPanel
              tile={selectedTile}
              widget={selectedWidget}
              onUpdate={(props) => updateTile(selectedTileId, props)}
              onRemove={() => { removeTile(selectedTileId); setSelectedTileId(null); }}
            />
          ) : (
            <div className="p-4 space-y-4">
              <StorefrontHealthScore draft={draft} businessType={bizType} />
              <ThemePicker themes={themes} currentThemeId={draft?.themeId} eligibility={eligibility} onThemeChange={handleChangeTheme} businessType={bizType} />
              <NitroUpsellBanner 
                eligibility={eligibility} 
                onStakeClick={(tier, currentStake) => recordEvent('nitro_upsell_clicked', {
                  targetTier: tier.name,
                  currentStake,
                  needed: tier.needed,
                })}
              />
            </div>
          )}

          {/* Phone Preview inline in right panel */}
          {showPreview && (
            <div className="p-4 border-t" style={{ borderColor: 'var(--f-line)' }}>
              <StorefrontPhonePreview draft={draft} theme={theme} widgets={widgets} business={bizProfile} businessType={bizType} />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals & Overlays ── */}
      {showHistory && (
        <VersionHistorySidebar businessId={businessId} onRevert={revertToVersion} onClose={() => setShowHistory(false)} />
      )}
      {showPublishModal && (
        <PublishConfirmModal
          draft={draft}
          published={published}
          onConfirm={async () => { await publish(); setShowPublishModal(false); }}
          onCancel={() => setShowPublishModal(false)}
        />
      )}
      {showTemplates && (
        <TemplateGallery
          businessType={bizType}
          widgets={widgets}
          themes={themes}
          eligibility={eligibility}
          onApply={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
