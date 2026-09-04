import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import StudioLayerTree from './StudioLayerTree';
import StudioInspector from './StudioInspector';
import StorefrontPhonePreview from './StorefrontPhonePreview';
import { STUDIO_NODE_TYPES } from '@/lib/storefrontStudioModel';
import { runtimeAdapterIsContainer, studioDocumentToRuntimeDraft } from '@/lib/storefrontStudioRuntimeAdapter';
import { useStorefrontStudio } from '@/hooks/useStorefrontStudio';

const LABELS = { page:'Page', section:'Section', stack:'Stack', row:'Row', column:'Column', grid:'Grid', overlay:'Overlay', hero:'Hero', 'product-grid':'Product Grid', 'product-carousel':'Product Carousel', 'product-card':'Product Card', 'category-rail':'Category Rail', button:'Button', 'icon-button':'Icon Button', text:'Text', image:'Image', video:'Video', rating:'Rating', reviews:'Reviews', contact:'Contact', location:'Location', promo:'Promotion', social:'Social', spacer:'Spacer', divider:'Divider' };
const buttonClass = 'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40';

function StudioStage({ draft, business, document, selection, onDrop, onSelect }) {
  const runtimeDraft = useMemo(() => studioDocumentToRuntimeDraft(draft, document), [draft, document]);
  const selectedNode = selection[0] ? document.nodes[selection[0]] : null;
  const theme = useMemo(() => ({
    name: draft?.themeName || 'Studio',
    tokenSet: document?.theme?.tokens || {},
  }), [draft?.themeName, document?.theme?.tokens]);

  return (
    <div
      className="relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => onSelect(null)}
    >
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[9px] font-semibold shadow-sm" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)', color:'var(--f-text-3)' }}>
        {selectedNode ? `Editing ${LABELS[selectedNode.type] || selectedNode.type}` : 'Select a layer to edit'}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <StorefrontPhonePreview
          draft={runtimeDraft}
          theme={theme}
          widgets={[]}
          business={business}
          businessType={business?.businessType || business?.type || 'GENERAL'}
          selectedTileId={selection[0] || null}
          onSelectTile={onSelect}
          editorMode
        />
      </div>
    </div>
  );
}

export default function StorefrontStudioV2({ draft, saveDraft, business, onClose }) {
  const studio = useStorefrontStudio({ draft, saveDraft });
  const [tab, setTab] = useState('content');
  const [filter, setFilter] = useState('');
  const node = studio.selection[0] ? studio.document.nodes[studio.selection[0]] : null;
  const palette = useMemo(() => STUDIO_NODE_TYPES.filter((type) => !filter || type.includes(filter.toLowerCase())), [filter]);
  const select = (id, e) => {
    if (!id) {
      studio.setSelection([]);
      return;
    }
    studio.setSelection((e?.metaKey || e?.ctrlKey) ? [...new Set([...studio.selection, id])] : [id]);
  };
  const add = (type) => studio.addNode(type, node && runtimeAdapterIsContainer(node.type) ? node.id : null);

  return <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background:'var(--f-bg)', color:'var(--f-text)' }}>
    <header className="flex min-h-14 items-center justify-between gap-3 border-b px-4" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)' }}><div className="flex items-center gap-3"><strong className="text-sm">Storefront Studio</strong><span className="rounded-full px-2 py-1 text-[10px]" style={{ background:'var(--f-surface-sunken)', color:'var(--f-text-3)' }}>Semantic V2</span><span className="text-[11px]" style={{ color:'var(--f-text-3)' }}>{business?.businessName || ''}</span></div><div className="flex items-center gap-2"><button className={buttonClass} disabled={!studio.canUndo} onClick={studio.undo}><Undo2 className="mr-1 inline h-3.5 w-3.5"/>Undo</button><button className={buttonClass} disabled={!studio.canRedo} onClick={studio.redo}><Redo2 className="mr-1 inline h-3.5 w-3.5"/>Redo</button><button className={buttonClass} disabled={!node} onClick={() => studio.duplicate()}><Copy className="mr-1 inline h-3.5 w-3.5"/>Duplicate</button><button className={buttonClass} disabled={!node} onClick={() => studio.remove()}><Trash2 className="mr-1 inline h-3.5 w-3.5"/>Delete</button><button className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white" style={{ background:'var(--accent)' }} onClick={() => studio.save()}><ExternalLink className="mr-1 inline h-3.5 w-3.5"/>Save</button><button className={buttonClass} onClick={onClose}>Close</button></div></header>
    <div className="grid min-h-0 flex-1 grid-cols-[230px_minmax(360px,1fr)_310px]">
      <aside className="min-h-0 overflow-y-auto border-r p-3" style={{ borderColor:'var(--f-line)', background:'var(--f-surface-sunken)' }}><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em]" style={{ color:'var(--f-text-3)' }}>Components</div><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search components" className="mb-3 w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)', color:'var(--f-text)' }}/><div className="grid grid-cols-2 gap-2">{palette.map((type) => <button key={type} className="rounded-lg border px-2 py-2 text-left text-[10px] font-semibold" style={{ borderColor:'var(--f-line)', background:'var(--f-surface)' }} draggable onDragStart={(e) => e.dataTransfer.setData('application/x-azm-studio-node', type)} onClick={() => add(type)}><Plus className="mr-1 inline h-3 w-3"/>{LABELS[type] || type}</button>)}</div><div className="mt-5 border-t pt-4" style={{ borderColor:'var(--f-line)' }}><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em]" style={{ color:'var(--f-text-3)' }}>Layers</div><StudioLayerTree document={studio.document} selection={studio.selection} onSelectionChange={studio.setSelection} onMoveNode={studio.move} onToggleVisibility={studio.setVisibility} onToggleLock={studio.setLocked}/></div></aside>
      <main className="min-h-0 overflow-auto p-6" style={{ background:'var(--f-bg)' }}><div className="mx-auto max-w-[760px]"><div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-semibold">Phone stage</div><div className="text-[11px]" style={{ color:'var(--f-text-3)' }}>The stage uses the same widget renderers as the live storefront preview. Drag a component here or add one from the palette, then select its layer to edit it.</div></div><span className="text-[10px]" style={{ color:'var(--f-text-3)' }}>{Object.keys(studio.document.nodes).length} layers</span></div><StudioStage draft={draft} business={business} document={studio.document} selection={studio.selection} onSelect={(id) => select(id)} onDrop={(e) => { e.preventDefault(); const type=e.dataTransfer.getData('application/x-azm-studio-node'); if(type) add(type); }}/></div></main>
      <aside className="min-h-0 overflow-hidden border-l" style={{ borderColor:'var(--f-line)', background:'var(--f-surface-sunken)' }}><StudioInspector node={node} pages={studio.document.pages} nodeIds={Object.keys(studio.document.nodes)} activeTab={tab} onTabChange={setTab} onPatch={(domain, patch) => node && studio.patchNode(node.id, domain, patch)}/></aside>
    </div>
  </div>;
}
