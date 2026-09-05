import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Monitor, Plus, Redo2, Smartphone, Tablet, Trash2, Undo2 } from 'lucide-react';
import StudioLayerTree from './StudioLayerTree';
import StudioInspector from './StudioInspector';
import StorefrontPhonePreview from './StorefrontPhonePreview';
import { STUDIO_NODE_TYPES } from '@/lib/storefrontStudioModel';
import { getStudioParentId } from '@/lib/storefrontStudioTree';
import { normalizeStudioViewport } from '@/lib/storefrontStudioResponsive';
import { STOREFRONT_STUDIO_TOKENS } from '@/lib/storefrontStudioTokens';
import { runtimeAdapterIsContainer, studioDocumentToRuntimeDraft } from '@/lib/storefrontStudioRuntimeAdapter';
import { sanitizeStorefrontPreviewHtml } from '@/lib/storefrontPreviewSanitizer';
import { useStorefrontStudio } from '@/hooks/useStorefrontStudio';

const LABELS = { page:'Page', section:'Section', stack:'Stack', row:'Row', column:'Column', grid:'Grid', overlay:'Overlay', hero:'Hero', 'product-grid':'Product Grid', 'product-carousel':'Product Carousel', 'product-card':'Product Card', 'category-rail':'Category Rail', button:'Button', 'icon-button':'Icon Button', text:'Text', image:'Image', video:'Video', rating:'Rating', reviews:'Reviews', contact:'Contact', location:'Location', promo:'Promotion', social:'Social', spacer:'Spacer', divider:'Divider' };
const VIEWPORTS = [
  { key: 'phone', label: 'Phone', Icon: Smartphone },
  { key: 'tablet', label: 'Tablet', Icon: Tablet },
  { key: 'desktop', label: 'Desktop', Icon: Monitor },
];
const buttonClass = 'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40';

function devicePreviewStyle(viewport) {
  const device = STOREFRONT_STUDIO_TOKENS.studio.previewDevices[normalizeStudioViewport(viewport)];
  const phone = STOREFRONT_STUDIO_TOKENS.studio.previewDevices.phone;
  const scale = device.displayWidthPx / phone.displayWidthPx;
  return {
    width: device.displayWidthPx,
    height: Math.round(device.heightDp * STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE * scale),
  };
}

function StudioStage({ draft, business, document, selection, viewport, onDrop, onSelect, onDropTile }) {
  const runtimeDraft = useMemo(() => {
    const next = studioDocumentToRuntimeDraft(draft, document, viewport);
    next.layoutJson.tiles = next.layoutJson.tiles.map((tile) => tile.widgetType === 'custom_html'
      ? { ...tile, props: { ...tile.props, html: sanitizeStorefrontPreviewHtml(tile.props?.html, 500) } }
      : tile);
    return next;
  }, [draft, document, viewport]);
  const selectedNode = selection[0] ? document.nodes[selection[0]] : null;
  const theme = useMemo(() => ({
    name: draft?.themeName || 'Studio',
    tokenSet: document?.theme?.tokens || {},
  }), [draft?.themeName, document?.theme?.tokens]);
  const normalizedViewport = normalizeStudioViewport(viewport);
  const device = STOREFRONT_STUDIO_TOKENS.studio.previewDevices[normalizedViewport];
  const emulationSize = devicePreviewStyle(normalizedViewport);
  const scale = device.displayWidthPx / STOREFRONT_STUDIO_TOKENS.studio.previewDevices.phone.displayWidthPx;
  const phoneWidth = STOREFRONT_STUDIO_TOKENS.studio.previewDevices.phone.displayWidthPx;
  const phoneHeight = Math.round(STOREFRONT_STUDIO_TOKENS.studio.previewDevices.phone.heightDp * STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[9px] font-semibold shadow-sm" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)', color:'var(--f-text-3)' }}>
        {selectedNode ? `Editing ${LABELS[selectedNode.type] || selectedNode.type}` : 'Select a layer to edit'}
      </div>
      <div className="flex justify-center overflow-visible pt-2" onClick={(e) => e.stopPropagation()}>
        <div
          data-testid="studio-device-emulator"
          data-viewport={normalizedViewport}
          aria-label={`${device.widthDp} by ${device.heightDp} ${normalizedViewport} preview`}
          style={emulationSize}
        >
          <div style={{ width: phoneWidth, height: phoneHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <StorefrontPhonePreview
              draft={runtimeDraft}
              theme={theme}
              widgets={[]}
              business={business}
              businessType={business?.businessType || business?.type || 'GENERAL'}
              selectedTileId={selection[0] || null}
              onSelectTile={onSelect}
              editorMode
              onDropTile={onDropTile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StorefrontStudioV2({ draft, saveDraft, business, onClose }) {
  const studio = useStorefrontStudio({ draft, saveDraft });
  const [tab, setTab] = useState('content');
  const [filter, setFilter] = useState('');
  const [viewport, setViewport] = useState('phone');
  const [dragTarget, setDragTarget] = useState(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const node = studio.selection[0] ? studio.document.nodes[studio.selection[0]] : null;
  const palette = useMemo(() => STUDIO_NODE_TYPES.filter((type) => !filter || type.includes(filter.toLowerCase())), [filter]);
  const select = (id, e) => {
    if (!id) {
      studio.setSelection([]);
      return;
    }
    studio.setSelection((e?.metaKey || e?.ctrlKey) ? [...new Set([...studio.selection, id])] : [id]);
  };
  const add = (type, parentId = null, index = -1) => studio.addNode(type, parentId, index);

  const insertPaletteNode = (type, targetId, edge) => {
    if (!STUDIO_NODE_TYPES.includes(type) || !targetId) return;
    const parentId = getStudioParentId(studio.document, targetId);
    const siblingIds = parentId ? (studio.document.nodes[parentId]?.children || []) : (studio.document.pages?.[0]?.root || []);
    const targetIndex = siblingIds.indexOf(targetId);
    if (targetIndex < 0) return;
    add(type, parentId || null, targetIndex + (edge === 'after' ? 1 : 0));
  };

  const finishPalettePointer = (event, cancelled = false) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    window.removeEventListener('pointermove', active.move);
    window.removeEventListener('pointerup', active.up);
    window.removeEventListener('pointercancel', active.cancel);
    dragRef.current = null;
    if (!cancelled && active.dragging && active.target) {
      insertPaletteNode(active.type, active.target.tileId, active.target.edge);
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    setDragTarget(null);
  };

  const startPalettePointer = (type, event) => {
    if (event.button !== 0 || !STUDIO_NODE_TYPES.includes(type)) return;
    event.preventDefault();
    const origin = { x: event.clientX, y: event.clientY };
    const move = (moveEvent) => {
      if (!dragRef.current || moveEvent.pointerId !== event.pointerId) return;
      const distance = Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y);
      if (distance < 4) return;
      dragRef.current.dragging = true;
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const target = element?.closest?.('[data-studio-drop-target="true"]');
      if (!target) {
        dragRef.current.target = null;
        setDragTarget(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const edge = moveEvent.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      const resolved = { tileId: target.getAttribute('data-tile-id'), edge };
      dragRef.current.target = resolved;
      setDragTarget(resolved);
    };
    const up = (upEvent) => finishPalettePointer(upEvent);
    const cancel = (cancelEvent) => finishPalettePointer(cancelEvent, true);
    dragRef.current = { type, pointerId: event.pointerId, dragging: false, target: null, move, up, cancel };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const normalized = normalizeStudioViewport(viewport);
    if (normalized !== viewport) setViewport(normalized);
  }, [viewport]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (typing) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) studio.redo(); else studio.undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        studio.redo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'd') {
        if (!node) return;
        event.preventDefault();
        studio.duplicate();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && node) {
        event.preventDefault();
        studio.remove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [node, studio]);

  const viewportMeta = VIEWPORTS.find((entry) => entry.key === viewport) || VIEWPORTS[0];

  return <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background:'var(--f-bg)', color:'var(--f-text)' }}>
    <header className="flex min-h-14 items-center justify-between gap-3 border-b px-4" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)' }}><div className="flex items-center gap-3"><strong className="text-sm">Storefront Studio</strong><span className="rounded-full px-2 py-1 text-[10px]" style={{ background:'var(--f-surface-sunken)', color:'var(--f-text-3)' }}>Semantic V2</span><span className="text-[11px]" style={{ color:'var(--f-text-3)' }}>{business?.businessName || ''}</span></div><div className="flex items-center gap-2"><button className={buttonClass} disabled={!studio.canUndo} onClick={studio.undo}><Undo2 className="mr-1 inline h-3.5 w-3.5"/>Undo</button><button className={buttonClass} disabled={!studio.canRedo} onClick={studio.redo}><Redo2 className="mr-1 inline h-3.5 w-3.5"/>Redo</button><button className={buttonClass} disabled={!node} onClick={() => studio.duplicate()}><Copy className="mr-1 inline h-3.5 w-3.5"/>Duplicate</button><button className={buttonClass} disabled={!node} onClick={() => studio.remove()}><Trash2 className="mr-1 inline h-3.5 w-3.5"/>Delete</button><button className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white" style={{ background:'var(--accent)' }} onClick={() => studio.save()}><ExternalLink className="mr-1 inline h-3.5 w-3.5"/>Save</button><button className={buttonClass} onClick={onClose}>Close</button></div></header>
    <div className="grid min-h-0 flex-1 grid-cols-[230px_minmax(360px,1fr)_310px]">
      <aside className="min-h-0 overflow-y-auto border-r p-3" style={{ borderColor:'var(--f-line)', background:'var(--f-surface-sunken)' }}><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em]" style={{ color:'var(--f-text-3)' }}>Components</div><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search components" className="mb-3 w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)', color:'var(--f-text)' }}/><div className="grid grid-cols-2 gap-2">{palette.map((type) => <button key={type} data-studio-palette-node={type} className="rounded-lg border px-2 py-2 text-left text-[10px] font-semibold" style={{ borderColor: dragTarget ? 'var(--f-tint-color)' : 'var(--f-line)', background:'var(--f-surface)', touchAction:'none', cursor:'grab' }} onPointerDown={(event) => startPalettePointer(type, event)} onClick={() => { if (suppressClickRef.current) return; add(type, node && runtimeAdapterIsContainer(node.type) ? node.id : null); }}><Plus className="mr-1 inline h-3 w-3"/>{LABELS[type] || type}</button>)}</div><div className="mt-5 border-t pt-4" style={{ borderColor:'var(--f-line)' }}><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em]" style={{ color:'var(--f-text-3)' }}>Layers</div><StudioLayerTree document={studio.document} selection={studio.selection} onSelectionChange={studio.setSelection} onMoveNode={studio.move} onToggleVisibility={studio.setVisibility} onToggleLock={studio.setLocked}/></div></aside>
      <main className="min-h-0 overflow-auto p-6" style={{ background:'var(--f-bg)' }}><div className="mx-auto max-w-[760px]"><div className="mb-4 flex items-start justify-between gap-4"><div><div className="text-xs font-semibold">{viewportMeta.label} stage</div><div className="text-[11px]" style={{ color:'var(--f-text-3)' }}>Preview the actual responsive intent for this breakpoint. The stage now emulates the target device geometry while keeping the persisted Studio model semantic.</div></div><div className="flex shrink-0 rounded-lg border p-1" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)' }} aria-label="Preview viewport"><span className="sr-only">Preview viewport</span>{VIEWPORTS.map(({ key, label, Icon }) => <button key={key} type="button" onClick={() => setViewport(key)} aria-pressed={viewport === key} title={`${label} preview`} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold" style={{ background: viewport === key ? 'var(--f-surface-sunken)' : 'transparent', color: viewport === key ? 'var(--f-text)' : 'var(--f-text-3)' }}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div><span className="text-[10px]" style={{ color:'var(--f-text-3)' }}>{Object.keys(studio.document.nodes).length} layers</span></div><StudioStage draft={draft} business={business} document={studio.document} selection={studio.selection} viewport={viewport} onSelect={(id) => select(id)} onDropTile={insertPaletteNode}/></div></main>
      <aside className="min-h-0 overflow-hidden border-l" style={{ borderColor:'var(--f-line)', background:'var(--f-surface-sunken)' }}><StudioInspector node={node} pages={studio.document.pages} nodeIds={Object.keys(studio.document.nodes)} activeTab={tab} onTabChange={setTab} onPatch={(domain, patch) => node && studio.patchNode(node.id, domain, patch)}/></aside>
    </div>
  </div>;
}
