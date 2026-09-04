import { describe, expect, it } from 'vitest';
import {
  runtimeAdapterIsContainer,
  studioDocumentToRuntimeDraft,
  studioDocumentToRuntimeTiles,
} from './storefrontStudioRuntimeAdapter';

describe('storefrontStudioRuntimeAdapter', () => {
  it('flattens semantic nodes into the legacy runtime tile contract', () => {
    const document = {
      pages: [{ id: 'home', root: ['section'] }],
      nodes: {
        section: { id: 'section', type: 'section', children: ['hero', 'products'] },
        hero: {
          id: 'hero', type: 'hero', children: [],
          props: { title: 'Hello', subtitle: 'Welcome' },
          layout: { visibility: true },
        },
        products: {
          id: 'products', type: 'product-grid', children: [],
          props: { title: 'Menu', columns: 2, maxItems: 4 },
          layout: { grid: { row: 4, col: 0 } },
        },
      },
    };

    expect(studioDocumentToRuntimeTiles(document)).toEqual([
      expect.objectContaining({ id: 'hero', widgetType: 'hero_header' }),
      expect.objectContaining({ id: 'products', widgetType: 'product_grid', position: expect.objectContaining({ row: 4 }) }),
    ]);
  });

  it('omits hidden nodes from the runtime preview', () => {
    const document = {
      pages: [{ id: 'home', root: ['visible', 'hidden'] }],
      nodes: {
        visible: { id: 'visible', type: 'hero', children: [], props: {}, layout: {} },
        hidden: { id: 'hidden', type: 'promo', children: [], props: {}, layout: { visibility: false } },
      },
    };

    expect(studioDocumentToRuntimeTiles(document).map((tile) => tile.id)).toEqual(['visible']);
  });

  it('preserves the draft while replacing only preview tiles', () => {
    const draft = {
      businessName: 'Cafe',
      layoutJson: { background: 'white', tiles: [{ id: 'old' }] },
    };
    const document = { pages: [{ root: [] }], nodes: {} };

    expect(studioDocumentToRuntimeDraft(draft, document)).toEqual({
      businessName: 'Cafe',
      layoutJson: { background: 'white', tiles: [] },
    });
  });

  it('recognizes semantic containers so palette insertions can target them', () => {
    expect(runtimeAdapterIsContainer('section')).toBe(true);
    expect(runtimeAdapterIsContainer('grid')).toBe(true);
    expect(runtimeAdapterIsContainer('hero')).toBe(false);
  });
});
