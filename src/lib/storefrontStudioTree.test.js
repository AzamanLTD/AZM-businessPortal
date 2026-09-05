import { describe, expect, it } from 'vitest';
import { createEmptyStudioDocument, createStudioNode } from './storefrontStudioModel';
import {
  duplicateSubtree,
  getStudioAncestors,
  getStudioParentId,
  moveNode,
  normalizeSelection,
  removeNodes,
  toggleSelection,
} from './storefrontStudioTree';

function fixture() {
  const doc = createEmptyStudioDocument();
  doc.nodes.section = createStudioNode({ id: 'section', type: 'section', children: ['stack'] });
  doc.nodes.stack = createStudioNode({ id: 'stack', type: 'stack', children: ['button', 'text'] });
  doc.nodes.button = createStudioNode({ id: 'button', type: 'button', props: { label: 'Buy' } });
  doc.nodes.text = createStudioNode({ id: 'text', type: 'text', props: { value: 'Hello' } });
  doc.pages[0].root = ['section'];
  return doc;
}

describe('storefrontStudioTree', () => {
  it('resolves parents and ancestors from semantic ownership', () => {
    const doc = fixture();
    expect(getStudioParentId(doc, 'button')).toBe('stack');
    expect(getStudioAncestors(doc, 'button')).toEqual(['stack', 'section', 'home']);
  });

  it('normalizes selection and supports additive multi-selection', () => {
    const doc = fixture();
    expect(normalizeSelection(doc, ['button', 'button', 'missing'])).toEqual(['button']);
    expect(toggleSelection(doc, ['button'], 'text')).toEqual(['button', 'text']);
    expect(toggleSelection(doc, ['button', 'text'], 'button')).toEqual(['text']);
  });

  it('moves a node without allowing descendant cycles', () => {
    const doc = fixture();
    const moved = moveNode(doc, 'button', { parentId: 'section', index: 0 });
    expect(moved.nodes.section.children).toEqual(['button', 'stack']);
    expect(moved.nodes.stack.children).toEqual(['text']);
    expect(() => moveNode(doc, 'section', { parentId: 'button' })).toThrow(/descendants/);
  });

  it('preserves the source page when moving a root node without an explicit parent', () => {
    const doc = fixture();
    doc.pages.push({ id: 'about', name: 'About', root: ['about-section'] });
    doc.nodes['about-section'] = createStudioNode({ id: 'about-section', type: 'section', children: ['about-text'] });
    doc.nodes['about-text'] = createStudioNode({ id: 'about-text', type: 'text', props: { value: 'About' } });

    const moved = moveNode(doc, 'about-section', { index: 0 });

    expect(moved.pages[0].root).toEqual(['section']);
    expect(moved.pages[1].root).toEqual(['about-section']);
  });

  it('removes a selected subtree and all descendants', () => {
    const doc = fixture();
    const next = removeNodes(doc, ['stack']);
    expect(next.nodes.stack).toBeUndefined();
    expect(next.nodes.button).toBeUndefined();
    expect(next.nodes.text).toBeUndefined();
    expect(next.pages[0].root).toEqual(['section']);
    expect(next.nodes.section.children).toEqual([]);
  });

  it('duplicates a subtree with remapped child IDs', () => {
    const doc = fixture();
    const result = duplicateSubtree(doc, 'stack', { parentId: 'section', index: 1, createId: (id) => `${id}-duplicate` });
    expect(result.newRootId).toBe('stack-duplicate');
    expect(result.idMap.get('button')).toBe('button-duplicate');
    expect(result.doc.nodes['stack-duplicate'].children).toEqual(['button-duplicate', 'text-duplicate']);
    expect(result.doc.nodes['button-duplicate'].props.label).toBe('Buy');
    expect(result.doc.nodes.section.children).toEqual(['stack', 'stack-duplicate']);
  });

  it('preserves the source page when duplicating a root subtree without an explicit parent', () => {
    const doc = fixture();
    doc.pages.push({ id: 'about', name: 'About', root: ['about-section'] });
    doc.nodes['about-section'] = createStudioNode({ id: 'about-section', type: 'section', children: ['about-text'] });
    doc.nodes['about-text'] = createStudioNode({ id: 'about-text', type: 'text', props: { value: 'About' } });

    const result = duplicateSubtree(doc, 'about-section', { index: 0, createId: (id) => `${id}-copy` });

    expect(result.doc.pages[0].root).toEqual(['section']);
    expect(result.doc.pages[1].root).toEqual(['about-section-copy', 'about-section']);
  });
});
