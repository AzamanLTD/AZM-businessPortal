// src/lib/storefrontStudioTree.js
// =============================================================================
// Azaman Storefront Studio V2 — semantic tree editing primitives
//
// Pure helpers for layer selection and document mutations. These deliberately
// operate on the semantic Studio document rather than DOM state, making them
// usable by the editor, keyboard commands, tests, and future collaborative
// editing without coupling business data to layout mechanics.
// =============================================================================

import { createStudioNode } from './storefrontStudioModel';

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const ensureDocument = (doc) => {
  if (!doc || typeof doc !== 'object' || !doc.nodes || !Array.isArray(doc.pages)) {
    throw new Error('A valid Studio document is required.');
  }
  return doc;
};

export function getStudioNode(doc, nodeId) {
  ensureDocument(doc);
  return nodeId ? doc.nodes[nodeId] || null : null;
}

export function getStudioNodeIds(doc) {
  ensureDocument(doc);
  return Object.keys(doc.nodes);
}

export function getStudioParentId(doc, nodeId) {
  ensureDocument(doc);
  for (const node of Object.values(doc.nodes)) {
    if (Array.isArray(node.children) && node.children.includes(nodeId)) return node.id;
  }
  for (const page of doc.pages) {
    if (Array.isArray(page.root) && page.root.includes(nodeId)) return page.id;
  }
  return null;
}

export function getStudioAncestors(doc, nodeId) {
  const result = [];
  let parent = getStudioParentId(doc, nodeId);
  const seen = new Set();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    result.push(parent);
    const parentNode = doc.nodes[parent];
    if (!parentNode) break;
    parent = getStudioParentId(doc, parent);
  }
  return result;
}

export function normalizeSelection(doc, selection = []) {
  ensureDocument(doc);
  const ids = new Set(Object.keys(doc.nodes));
  const unique = [];
  for (const id of Array.isArray(selection) ? selection : []) {
    if (ids.has(id) && !unique.includes(id)) unique.push(id);
  }
  return unique;
}

export function toggleSelection(doc, selection, nodeId, { additive = true } = {}) {
  const current = normalizeSelection(doc, selection);
  if (!additive) return current.includes(nodeId) ? [] : [nodeId];
  return current.includes(nodeId)
    ? current.filter((id) => id !== nodeId)
    : [...current, nodeId];
}

const CONTAINER_TYPES = new Set(['page', 'section', 'stack', 'row', 'column', 'grid', 'overlay', 'product-carousel', 'category-rail']);

export function canContain(node) {
  return Boolean(node && CONTAINER_TYPES.has(node.type));
}

function containsDescendant(doc, ancestorId, candidateId) {
  const ancestor = doc.nodes[ancestorId];
  if (!ancestor || !Array.isArray(ancestor.children)) return false;
  const seen = new Set();
  const stack = [...ancestor.children];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    if (id === candidateId) return true;
    const node = doc.nodes[id];
    if (node?.children) stack.push(...node.children);
  }
  return false;
}

function detachFromParent(doc, nodeId) {
  const next = clone(doc);
  for (const page of next.pages) {
    if (Array.isArray(page.root)) page.root = page.root.filter((id) => id !== nodeId);
  }
  for (const node of Object.values(next.nodes)) {
    if (Array.isArray(node.children)) node.children = node.children.filter((id) => id !== nodeId);
  }
  return next;
}

export function insertNode(doc, node, { parentId = null, index = -1 } = {}) {
  const source = ensureDocument(doc);
  if (!node?.id || source.nodes[node.id]) throw new Error('Studio node id must be unique.');
  if (parentId && !canContain(source.nodes[parentId])) throw new Error('Target node cannot contain children.');

  const next = clone(source);
  next.nodes[node.id] = clone(node);
  const siblings = parentId ? next.nodes[parentId].children : next.pages[0]?.root;
  if (!Array.isArray(siblings)) throw new Error('Studio insertion target is unavailable.');
  const at = index < 0 ? siblings.length : Math.max(0, Math.min(index, siblings.length));
  siblings.splice(at, 0, node.id);
  return next;
}

export function moveNode(doc, nodeId, { parentId = null, index = -1 } = {}) {
  const source = ensureDocument(doc);
  const node = source.nodes[nodeId];
  if (!node) throw new Error(`Studio node not found: ${nodeId}`);
  if (parentId && (parentId === nodeId || containsDescendant(source, nodeId, parentId))) {
    throw new Error('A node cannot be moved into itself or its descendants.');
  }
  if (parentId && !canContain(source.nodes[parentId])) throw new Error('Target node cannot contain children.');

  let next = detachFromParent(source, nodeId);
  const siblings = parentId ? next.nodes[parentId].children : next.pages[0]?.root;
  if (!Array.isArray(siblings)) throw new Error('Studio insertion target is unavailable.');
  const at = index < 0 ? siblings.length : Math.max(0, Math.min(index, siblings.length));
  siblings.splice(at, 0, nodeId);
  return next;
}

export function removeNodes(doc, nodeIds = []) {
  const source = ensureDocument(doc);
  const requested = new Set(normalizeSelection(source, nodeIds));
  if (!requested.size) return clone(source);

  // Remove descendants automatically when a container is selected.
  const removed = new Set(requested);
  const queue = [...requested];
  while (queue.length) {
    const id = queue.pop();
    const node = source.nodes[id];
    for (const child of node?.children || []) {
      if (!removed.has(child)) {
        removed.add(child);
        queue.push(child);
      }
    }
  }

  const next = detachFromParent(source, [...removed]);
  for (const id of removed) delete next.nodes[id];
  return next;
}

export function duplicateSubtree(doc, nodeId, { parentId = null, index = -1, createId = (id) => `${id}-copy` } = {}) {
  const source = ensureDocument(doc);
  const root = source.nodes[nodeId];
  if (!root) throw new Error(`Studio node not found: ${nodeId}`);

  const next = clone(source);
  const idMap = new Map();
  const allocate = (id) => {
    let candidate = createId(id);
    let suffix = 2;
    while (next.nodes[candidate] || idMap.has(candidate)) candidate = `${createId(id)}-${suffix++}`;
    return candidate;
  };

  const copy = (oldId) => {
    const original = source.nodes[oldId];
    const newId = allocate(oldId);
    idMap.set(oldId, newId);
    const newNode = { ...clone(original), id: newId, children: [] };
    next.nodes[newId] = newNode;
    for (const child of original.children || []) {
      newNode.children.push(copy(child));
    }
    return newId;
  };

  const newRootId = copy(nodeId);
  const detached = detachFromParent(next, newRootId);
  const siblings = parentId ? detached.nodes[parentId]?.children : detached.pages[0]?.root;
  if (!Array.isArray(siblings)) throw new Error('Studio duplication target is unavailable.');
  const at = index < 0 ? siblings.length : Math.max(0, Math.min(index, siblings.length));
  siblings.splice(at, 0, newRootId);
  return { doc: detached, newRootId, idMap };
}

export function createChildNode({ id, type, props, style, layout, responsive, actions }) {
  return createStudioNode({ id, type, props, style, layout, responsive, actions });
}
