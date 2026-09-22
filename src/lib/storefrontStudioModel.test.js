import { describe, expect, it } from 'vitest';
import {
  createEmptyStudioDocument,
  migrateLegacyTiles,
  migrateLayoutToStudio,
  patchLegacyTile,
  patchNodeActions,
  patchNodeContent,
  patchNodeLayout,
  patchNodeStyle,
} from './storefrontStudioModel';

describe('storefrontStudioModel', () => {
  it('creates a valid v2 empty document', () => {
    const doc = createEmptyStudioDocument();
    expect(doc.schemaVersion).toBe(2);
    expect(doc.pages[0]).toMatchObject({ id: 'home', slug: '/', root: [] });
    expect(doc.nodes).toEqual({});
  });

  it('migrates legacy tiles into semantic nodes without mutating input', () => {
    const source = {
      schemaVersion: 1,
      gridColumns: 4,
      tiles: [{
        id: 'tile-1',
        widgetType: 'product_grid',
        position: { row: 3, col: 1, rowSpan: 2, colSpan: 3 },
        props: { title: 'Featured' },
      }],
    };
    const doc = migrateLegacyTiles(source);

    expect(source.tiles[0].position.col).toBe(1);
    expect(doc.nodes['tile-1']).toMatchObject({
      type: 'product-grid',
      props: { title: 'Featured', legacyWidgetType: 'product_grid' },
      layout: { grid: { row: 3, col: 1, rowSpan: 2, colSpan: 3 } },
    });
    expect(doc.pages[0].root).toEqual(['tile-1']);
  });

  it('migrates retail collection boxes to a first-class semantic node', () => {
    const doc = migrateLegacyTiles({
      tiles: [{
        id: 'collection-1',
        widgetType: 'retail_collection_box',
        props: { title: 'Summer collection', maxItems: 6 },
      }],
    });

    expect(doc.nodes['collection-1']).toMatchObject({
      type: 'retail-collection-box',
      props: { title: 'Summer collection', maxItems: 6, legacyWidgetType: 'retail_collection_box' },
    });
  });

  it('uses stable deterministic ids for legacy tiles without ids', () => {
    const source = {
      tiles: [
        { widgetType: 'text', props: { value: 'First' } },
        { widgetType: 'button', props: { label: 'Second' } },
      ],
    };

    const first = migrateLegacyTiles(source);
    const second = migrateLegacyTiles(source);

    expect(first.pages[0].root).toEqual(['legacy_1', 'legacy_2']);
    expect(second.pages[0].root).toEqual(first.pages[0].root);
    expect(second.nodes.legacy_1.props.value).toBe('First');
    expect(second.nodes.legacy_2.props.label).toBe('Second');
  });

  it('resolves deterministic ids without colliding with explicit ids', () => {
    const source = {
      tiles: [
        { id: 'legacy_1', widgetType: 'text' },
        { widgetType: 'button', props: { label: 'Second' } },
      ],
    };

    const doc = migrateLegacyTiles(source);

    expect(doc.pages[0].root).toEqual(['legacy_1', 'legacy_2']);
    expect(doc.nodes.legacy_1.type).toBe('section');
    expect(doc.nodes.legacy_2.type).toBe('section');
  });

  it('prefers an existing v2 experience document', () => {
    const source = {
      tiles: [{ id: 'legacy', widgetType: 'text', props: { title: 'old' } }],
      experience: {
        schemaVersion: 2,
        pages: [{ id: 'home', name: 'Home', slug: '/', root: ['node-1'] }],
        nodes: { 'node-1': { id: 'node-1', type: 'text', props: { title: 'new' } } },
      },
    };
    expect(migrateLayoutToStudio(source).nodes['node-1'].props.title).toBe('new');
    expect(migrateLayoutToStudio(source).pages[0].root).toEqual(['node-1']);
  });

  it('keeps legacy tile layout fields out of props', () => {
    const tile = {
      id: 'tile-1',
      widgetType: 'hero_header',
      position: { row: 0, col: 0, rowSpan: 2, colSpan: 4 },
      props: { title: 'Hero' },
    };
    const updated = patchLegacyTile(tile, {
      position: { row: 2, col: 1 },
      props: { title: 'New Hero' },
    });

    expect(updated.position).toEqual({ row: 2, col: 1, rowSpan: 2, colSpan: 4 });
    expect(updated.props).toEqual({ title: 'New Hero' });
    expect(updated.props.position).toBeUndefined();
  });

  it('keeps Studio mutation domains separate', () => {
    const node = {
      id: 'b1',
      type: 'button',
      props: { label: 'Buy' },
      style: { variant: 'filled' },
      layout: { align: 'start' },
      actions: {},
    };
    expect(patchNodeContent(node, { label: 'Add to cart' })).toMatchObject({ props: { label: 'Add to cart' }, style: node.style });
    expect(patchNodeStyle(node, { variant: 'tonal' })).toMatchObject({ style: { variant: 'tonal' }, props: node.props });
    expect(patchNodeLayout(node, { align: 'center' })).toMatchObject({ layout: { align: 'center' }, props: node.props });
    expect(patchNodeActions(node, { tap: { type: 'openCart' } })).toMatchObject({ actions: { tap: { type: 'openCart' } }, props: node.props });
  });
});
