// src/lib/storefrontStudioDocument.js
// =============================================================================
// Azaman Storefront Studio V2 — immutable document controller primitives
// =============================================================================

import {
  migrateLayoutToStudio,
  patchNodeActions,
  patchNodeContent,
  patchNodeLayout,
  patchNodeStyle,
} from './storefrontStudioModel';
import {
  duplicateSubtree,
  moveNode,
  removeNodes,
} from './storefrontStudioTree';

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

export function studioDocumentFromDraft(draft) {
  return migrateLayoutToStudio(draft?.layoutJson || {});
}

export function updateStudioNode(doc, nodeId, domain, patch) {
  const node = doc?.nodes?.[nodeId];
  if (!node) throw new Error(`Studio node not found: ${nodeId}`);

  let nextNode;
  switch (domain) {
    case 'content': nextNode = patchNodeContent(node, patch); break;
    case 'style': nextNode = patchNodeStyle(node, patch); break;
    case 'layout': nextNode = patchNodeLayout(node, patch); break;
    case 'actions': nextNode = patchNodeActions(node, patch); break;
    case 'responsive': nextNode = { ...clone(node), responsive: { ...(node.responsive || {}), ...clone(patch) } }; break;
    default: throw new Error(`Unsupported Studio mutation domain: ${domain}`);
  }

  return { ...clone(doc), nodes: { ...doc.nodes, [nodeId]: nextNode } };
}

export function setNodeVisibility(doc, nodeId, visible) {
  return updateStudioNode(doc, nodeId, 'layout', { visibility: Boolean(visible) });
}

export function setNodeLocked(doc, nodeId, locked) {
  const node = doc?.nodes?.[nodeId];
  if (!node) throw new Error(`Studio node not found: ${nodeId}`);
  return { ...clone(doc), nodes: { ...doc.nodes, [nodeId]: { ...node, locked: Boolean(locked) } } };
}

export function insertNodesAtRoot(doc, nodes, index = -1) {
  let next = clone(doc);
  for (const node of nodes) next = moveNode({ ...next, nodes: { ...next.nodes, [node.id]: node } }, node.id, { parentId: null, index });
  return next;
}

export function duplicateNode(doc, nodeId, options = {}) {
  return duplicateSubtree(doc, nodeId, options);
}

export function removeSelectedNodes(doc, selection) {
  return removeNodes(doc, selection);
}

export function makeHistoryState(document, selection = []) {
  return {
    document: clone(document),
    selection: [...selection],
  };
}

export function pushHistory(history, snapshot, max = 100) {
  const past = [...(history?.past || []), makeHistoryState(snapshot.document, snapshot.selection)];
  return {
    past: past.slice(Math.max(0, past.length - max)),
    future: [],
  };
}

export function undoHistory(history, current) {
  const past = history?.past || [];
  if (!past.length) return { history, current };
  const previous = past[past.length - 1];
  return {
    history: {
      past: past.slice(0, -1),
      future: [makeHistoryState(current.document, current.selection), ...(history.future || [])],
    },
    current: makeHistoryState(previous.document, previous.selection),
  };
}

export function redoHistory(history, current) {
  const future = history?.future || [];
  if (!future.length) return { history, current };
  const next = future[0];
  return {
    history: {
      past: [...(history.past || []), makeHistoryState(current.document, current.selection)],
      future: future.slice(1),
    },
    current: makeHistoryState(next.document, next.selection),
  };
}
