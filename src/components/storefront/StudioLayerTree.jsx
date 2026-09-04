import { ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getStudioParentId } from '@/lib/storefrontStudioTree';

const LABELS = {
  page: 'Page', section: 'Section', stack: 'Stack', row: 'Row', column: 'Column', grid: 'Grid', overlay: 'Overlay',
  hero: 'Hero', 'product-grid': 'Product Grid', 'product-carousel': 'Product Carousel', 'product-card': 'Product Card',
  'category-rail': 'Category Rail', button: 'Button', 'icon-button': 'Icon Button', text: 'Text', image: 'Image', video: 'Video',
  rating: 'Rating', reviews: 'Reviews', contact: 'Contact', location: 'Location', promo: 'Promotion', social: 'Social', spacer: 'Spacer', divider: 'Divider',
};

function nodeLabel(node) {
  return node?.props?.label || node?.props?.title || node?.props?.value || LABELS[node?.type] || node?.type || 'Layer';
}

export default function StudioLayerTree({ document, selection = [], onSelectionChange, onMoveNode, onToggleVisibility, onToggleLock }) {
  const selected = useMemo(() => new Set(selection), [selection]);
  const [open, setOpen] = useState(() => new Set(document?.pages?.map((page) => page.id) || []));
  const [dropTarget, setDropTarget] = useState(null);

  const toggleOpen = (id) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const select = (event, id) => {
    event.stopPropagation();
    const additive = event.metaKey || event.ctrlKey;
    if (!additive) return onSelectionChange?.([id]);
    const next = new Set(selection);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange?.([...next]);
  };

  const resolveDropTarget = (event, targetId) => {
    const movingId = event.dataTransfer.getData('text/plain');
    if (!movingId || movingId === targetId) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    const parentId = getStudioParentId(document, targetId);
    const siblingIds = parentId ? (document.nodes[parentId]?.children || []) : (document.pages?.[0]?.root || []);
    const targetIndex = siblingIds.indexOf(targetId);
    if (targetIndex < 0) return null;
    return { movingId, parentId: parentId || null, index: targetIndex + (edge === 'after' ? 1 : 0), edge, targetId };
  };

  const renderNode = (id, depth) => {
    const node = document?.nodes?.[id];
    if (!node) return null;
    const children = Array.isArray(node.children) ? node.children : [];
    const isOpen = open.has(id);
    const isSelected = selected.has(id);
    const locked = node.locked === true;
    const visible = node.layout?.visibility !== false;
    const isBefore = dropTarget?.targetId === id && dropTarget.edge === 'before';
    const isAfter = dropTarget?.targetId === id && dropTarget.edge === 'after';

    return (
      <div key={id} className="text-xs select-none">
        {isBefore && <div className="h-0.5 rounded-full bg-[var(--f-tint-color)]" style={{ marginLeft: depth * 12 + 24, marginRight: 4 }} aria-hidden="true" />}
        <div
          className="group flex items-center gap-1 rounded-lg px-1.5 py-1.5"
          style={{ marginLeft: depth * 12, background: isSelected ? 'var(--f-surface-sunken)' : 'transparent', color: isSelected ? 'var(--f-text)' : 'var(--f-text-2)', opacity: visible ? 1 : 0.55 }}
          onClick={(event) => select(event, id)}
          draggable={!locked}
          onDragStart={(event) => {
            if (locked) return;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            const target = resolveDropTarget(event, id);
            setDropTarget(target);
            if (target) event.dataTransfer.dropEffect = 'move';
          }}
          onDragLeave={() => setDropTarget((current) => current?.targetId === id ? null : current)}
          onDrop={(event) => {
            event.preventDefault();
            const target = resolveDropTarget(event, id);
            setDropTarget(null);
            if (target) onMoveNode?.(target.movingId, { parentId: target.parentId, index: target.index });
          }}
        >
          <span className="w-4 shrink-0 flex items-center justify-center">
            {children.length > 0 ? (
              <button type="button" onClick={(event) => { event.stopPropagation(); toggleOpen(id); }}>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </span>
          <GripVertical className="h-3 w-3 opacity-30 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-medium">{nodeLabel(node)}</span>
          <span className="opacity-50 shrink-0">{LABELS[node.type] || node.type}</span>
          <button type="button" title={visible ? 'Hide layer' : 'Show layer'} className="opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); onToggleVisibility?.(id, !visible); }}>
            {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button type="button" title={locked ? 'Unlock layer' : 'Lock layer'} className="opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); onToggleLock?.(id, !locked); }}>
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
        </div>
        {isAfter && <div className="h-0.5 rounded-full bg-[var(--f-tint-color)]" style={{ marginLeft: depth * 12 + 24, marginRight: 4 }} aria-hidden="true" />}
        {isOpen && children.map((childId) => renderNode(childId, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-1" aria-label="Storefront layers">
      {document?.pages?.map((page) => (
        <div key={page.id}>
          <button type="button" className="w-full flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold" onClick={() => toggleOpen(page.id)} style={{ color: 'var(--f-text)' }}>
            {open.has(page.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span className="truncate">{page.name || page.id}</span>
          </button>
          {open.has(page.id) && (page.root || []).map((id) => renderNode(id, 1))}
        </div>
      ))}
    </div>
  );
}
