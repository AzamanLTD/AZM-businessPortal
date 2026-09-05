import { describe, expect, it } from 'vitest';
import {
  clampGridPosition,
  commitGridPosition,
  connectedGroupIds,
  gridGeometry,
  magneticSnap,
  STUDIO_CANVAS_GRID,
} from './storefrontStudioDrag';

const tile = (id, position) => ({ id, position });

describe('storefront studio drag engine', () => {
  it('exposes the measured canvas grid contract', () => {
    expect(STUDIO_CANVAS_GRID).toEqual({ cols: 4, rowHeightDp: 80, gapDp: 12 });
  });

  it('clamps resize and movement to the four-column grid without mutating input', () => {
    const input = { col: -4, row: -2, colSpan: 9, rowSpan: 0 };
    const result = clampGridPosition(input);
    expect(result).toEqual({ col: 0, row: 0, colSpan: 4, rowSpan: 1 });
    expect(input).toEqual({ col: -4, row: -2, colSpan: 9, rowSpan: 0 });
  });

  it('snaps a continuously positioned tile to a nearby overlapping sibling edge', () => {
    const canvasWidth = 220;
    const sibling = tile('b', { col: 2, row: 0, colSpan: 1, rowSpan: 2 });
    const result = magneticSnap({
      canvasWidth,
      tileId: 'a',
      position: { col: 0.98, row: 0.1, colSpan: 1, rowSpan: 2 },
      tiles: [tile('a', { col: 0.98, row: 0.1, colSpan: 1, rowSpan: 2 }), sibling],
    });
    expect(result.col).toBeCloseTo(1, 6);
  });

  it('does not snap horizontally toward a sibling on a non-overlapping row', () => {
    const canvasWidth = 220;
    const position = { col: 0.98, row: 0.1, colSpan: 1, rowSpan: 1 };
    const result = magneticSnap({
      canvasWidth,
      tileId: 'a',
      position,
      tiles: [tile('a', position), tile('b', { col: 2, row: 3, colSpan: 1, rowSpan: 1 })],
    });
    expect(result.col).toBeCloseTo(position.col, 6);
  });

  it('rounds only on persistence so live pointer previews remain continuous', () => {
    expect(commitGridPosition({ col: 1.49, row: 2.51, colSpan: 1.2, rowSpan: 2.8 })).toEqual({
      col: 1,
      row: 3,
      colSpan: 1,
      rowSpan: 3,
    });
  });

  it('finds transitive edge-connected groups for fused movement', () => {
    const canvasWidth = 220;
    const tiles = [
      tile('a', { col: 0, row: 0, colSpan: 2, rowSpan: 1 }),
      tile('b', { col: 2, row: 0, colSpan: 1, rowSpan: 1 }),
      tile('c', { col: 3, row: 0, colSpan: 1, rowSpan: 1 }),
      tile('d', { col: 0, row: 2, colSpan: 4, rowSpan: 1 }),
    ];
    expect(connectedGroupIds(tiles, 'a', canvasWidth)).toEqual(['a', 'b', 'c']);
  });

  it('derives stable geometry from the same dp scale used by preview renderers', () => {
    const box = gridGeometry(220, { col: 1, row: 2, colSpan: 2, rowSpan: 1 });
    expect(box.left).toBeGreaterThan(0);
    expect(box.right).toBeGreaterThan(box.left);
    expect(box.bottom).toBeGreaterThan(box.top);
  });
});
