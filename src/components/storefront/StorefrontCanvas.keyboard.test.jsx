import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StorefrontCanvas from './StorefrontCanvas';

describe('StorefrontCanvas keyboard nudging', () => {
  it('nudges the selected tile by one grid cell with arrow keys', () => {
    const onUpdateTile = vi.fn();
    const onSelectTile = vi.fn();

    render(
      <StorefrontCanvas
        draft={{
          layoutJson: {
            tiles: [{
              id: 'tile-1',
              widgetType: 'product_grid',
              position: { row: 2, col: 1, rowSpan: 2, colSpan: 2 },
              props: { title: 'Products' },
            }],
          },
        }}
        selectedTileId="tile-1"
        onSelectTile={onSelectTile}
        onUpdateTile={onUpdateTile}
        onRemoveTile={vi.fn()}
        onReorderTiles={vi.fn()}
      />,
    );

    const canvas = screen.getByRole('application');
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });

    expect(onUpdateTile).toHaveBeenCalledTimes(1);
    expect(onUpdateTile).toHaveBeenCalledWith('tile-1', {
      position: { row: 2, col: 2, rowSpan: 2, colSpan: 2 },
    });
  });

  it('uses Shift for two-cell steps and clamps at the grid boundary', () => {
    const onUpdateTile = vi.fn();

    render(
      <StorefrontCanvas
        draft={{
          layoutJson: {
            tiles: [{
              id: 'tile-1',
              widgetType: 'hero_header',
              position: { row: 0, col: 2, rowSpan: 1, colSpan: 2 },
              props: {},
            }],
          },
        }}
        selectedTileId="tile-1"
        onSelectTile={vi.fn()}
        onUpdateTile={onUpdateTile}
        onRemoveTile={vi.fn()}
        onReorderTiles={vi.fn()}
      />,
    );

    const canvas = screen.getByRole('application');
    fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(canvas, { key: 'ArrowLeft', shiftKey: true });

    expect(onUpdateTile).toHaveBeenNthCalledWith(1, 'tile-1', {
      position: { row: 0, col: 2, rowSpan: 1, colSpan: 2 },
    });
    expect(onUpdateTile).toHaveBeenNthCalledWith(2, 'tile-1', {
      position: { row: 0, col: 0, rowSpan: 1, colSpan: 2 },
    });
  });

  it('does not intercept unrelated keys', () => {
    const onUpdateTile = vi.fn();

    render(
      <StorefrontCanvas
        draft={{ layoutJson: { tiles: [{ id: 'tile-1', widgetType: 'hero_header', position: {}, props: {} }] } }}
        selectedTileId="tile-1"
        onSelectTile={vi.fn()}
        onUpdateTile={onUpdateTile}
        onRemoveTile={vi.fn()}
        onReorderTiles={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('application'), { key: 'Enter' });
    expect(onUpdateTile).not.toHaveBeenCalled();
  });
});
