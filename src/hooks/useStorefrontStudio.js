import { useCallback, useEffect, useMemo, useState } from 'react';
import { duplicateNode, pushHistory, redoHistory, removeSelectedNodes, setNodeLocked, setNodeVisibility, studioDocumentFromDraft, undoHistory, updateStudioNode } from '@/lib/storefrontStudioDocument';
import { createChildNode, insertNode, moveNode } from '@/lib/storefrontStudioTree';
import { STUDIO_NODE_TYPES } from '@/lib/storefrontStudioModel';

const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = (type) => `studio_${type}_${Math.random().toString(36).slice(2, 9)}`;
const defaultPropsFor = (type) => ({
  hero: { title: 'Your business', subtitle: 'Make your first impression count.' },
  text: { value: 'Tell customers what makes your business different.' },
  button: { label: 'Shop now' },
  image: { alt: '', mediaUrl: '' },
  'product-grid': { title: 'Featured products', columns: 2, maxItems: 4, showPrice: true },
  'product-carousel': { title: 'Explore more' },
  'category-rail': { title: 'Browse categories' },
  promo: { title: 'Special offer', subtitle: 'A focused message for your customers.', ctaText: 'Learn more' },
  reviews: { title: 'What customers say' },
  contact: { showPhone: true, showWhatsApp: true, showEmail: false, showWebsite: false },
  location: { title: 'Find us' },
}[type] || {});

export function useStorefrontStudio({ draft, saveDraft }) {
  const initial = useMemo(() => studioDocumentFromDraft(draft), [draft]);
  const [document, setDocument] = useState(initial);
  const [selection, setSelection] = useState([]);
  const [history, setHistory] = useState({ past: [], future: [] });

  useEffect(() => {
    setDocument(initial); setSelection([]); setHistory({ past: [], future: [] });
  }, [initial]);

  const commit = useCallback((nextDocument, nextSelection = selection) => {
    setHistory((value) => pushHistory(value, { document, selection }));
    setDocument(nextDocument); setSelection(nextSelection);
  }, [document, selection]);

  const patchNode = useCallback((nodeId, domain, patch) => commit(updateStudioNode(document, nodeId, domain, patch), selection), [commit, document, selection]);
  const addNode = useCallback((type, parentId = null) => {
    if (!STUDIO_NODE_TYPES.includes(type)) return;
    const node = createChildNode({
      id: makeId(type), type, props: defaultPropsFor(type),
      style: type === 'button' ? { borderRadius: 10 } : {},
      layout: { mode: parentId ? 'flow' : 'block' }, responsive: {},
      actions: type === 'button' ? { tap: { type: 'openCart' } } : {},
    });
    commit(insertNode(document, node, { parentId }), [node.id]);
  }, [commit, document]);

  const move = useCallback((nodeId, target) => commit(moveNode(document, nodeId, target), selection), [commit, document, selection]);
  const remove = useCallback((ids = selection) => commit(removeSelectedNodes(document, ids), []), [commit, document, selection]);
  const duplicate = useCallback((nodeId = selection[0]) => {
    if (!nodeId) return;
    const result = duplicateNode(document, nodeId);
    commit(result.doc, [result.newRootId]);
  }, [commit, document, selection]);
  const setVisibility = useCallback((nodeId, visible) => commit(setNodeVisibility(document, nodeId, visible), selection), [commit, document, selection]);
  const setLocked = useCallback((nodeId, locked) => commit(setNodeLocked(document, nodeId, locked), selection), [commit, document, selection]);

  const undo = useCallback(() => setHistory((value) => {
    const result = undoHistory(value, { document, selection });
    setDocument(result.current.document); setSelection(result.current.selection); return result.history;
  }), [document, selection]);
  const redo = useCallback(() => setHistory((value) => {
    const result = redoHistory(value, { document, selection });
    setDocument(result.current.document); setSelection(result.current.selection); return result.history;
  }), [document, selection]);

  // Preserve the optimistic-concurrency snapshot observed when the editor
  // loaded. The API layer already forwards this as `expectedUpdatedAt` and the
  // backend rejects stale saves rather than silently overwriting newer work.
  const save = useCallback(
    () => saveDraft(
      { ...clone(draft?.layoutJson || {}), experience: clone(document) },
      draft?.themeId,
      draft?.updatedAt,
    ),
    [document, draft?.layoutJson, draft?.themeId, draft?.updatedAt, saveDraft],
  );

  return { document, selection, setSelection, patchNode, addNode, move, remove, duplicate, setVisibility, setLocked, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0, save };
}