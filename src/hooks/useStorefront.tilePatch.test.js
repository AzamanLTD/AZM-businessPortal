import { patchLegacyTile } from '@/lib/storefrontStudioModel';

describe('legacy storefront tile patch boundary', () => {
  it('keeps geometry at tile level while merging content into props', () => {
    const tile = {
      id: 'tile-1',
      widgetType: 'product_grid',
      position: { row: 2, col: 1, rowSpan: 2, colSpan: 4 },
      props: { title: 'Before' },
    };

    const next = patchLegacyTile(tile, {
      position: { row: 3, col: 0 },
      props: { title: 'After' },
    });

    expect(next.position).toEqual({ row: 3, col: 0, rowSpan: 2, colSpan: 4 });
    expect(next.props).toEqual({ title: 'After' });
    expect(next.props.position).toBeUndefined();
    expect(next).not.toHaveProperty('props.row');
    expect(next).not.toHaveProperty('props.col');
  });
});
