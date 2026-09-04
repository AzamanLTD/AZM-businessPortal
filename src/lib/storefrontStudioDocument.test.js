import { describe, expect, it } from 'vitest';
import { createEmptyStudioDocument, createStudioNode } from './storefrontStudioModel';
import {
  makeHistoryState,
  redoHistory,
  studioDocumentFromDraft,
  undoHistory,
  updateStudioNode,
} from './storefrontStudioDocument';

function fixture() {
  const doc = createEmptyStudioDocument();
  doc.nodes.button = createStudioNode({
    id: 'button',
    type: 'button',
    props: { label: 'Buy' },
    style: { variant: 'filled' },
    layout: { align: 'start' },
    actions: { tap: { type: 'openCart' } },
  });
  doc.pages[0].root = ['button'];
  return doc;
}

describe('storefrontStudioDocument', () => {
  it('derives a semantic document from a legacy draft', () => {
    const draft = { layoutJson: { tiles: [{ id: 'tile-1', widgetType: 'action_buttons', position: { row: 0, col: 0, rowSpan: 1, colSpan: 4 }, props: {} }] } };
    expect(studioDocumentFromDraft(draft).nodes['tile-1'].type).toBe('row');
  });

  it('updates only the requested mutation domain and preserves the source', () => {
    const doc = fixture();
    const next = updateStudioNode(doc, 'button', 'style', { variant: 'outline', radius: 'large' });
    expect(next.nodes.button.style).toMatchObject({ variant: 'outline', radius: 'large' });
    expect(next.nodes.button.props).toEqual({ label: 'Buy' });
    expect(doc.nodes.button.style).toEqual({ variant: 'filled' });
  });

  it('round-trips undo and redo snapshots', () => {
    const first = fixture();
    const second = updateStudioNode(first, 'button', 'content', { label: 'Purchase' });
    const third = updateStudioNode(second, 'button', 'style', { variant: 'tonal' });

    let history = { past: [makeHistoryState(first), makeHistoryState(second)], future: [] };
    let current = makeHistoryState(third);
    const undone = undoHistory(history, current);
    expect(undone.current.document.nodes.button.props.label).toBe('Purchase');
    expect(undone.current.document.nodes.button.style.variant).toBe('filled');

    const redone = redoHistory(undone.history, undone.current);
    expect(redone.current.document.nodes.button.style.variant).toBe('tonal');
  });
});
