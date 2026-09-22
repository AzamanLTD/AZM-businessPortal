import { describe, expect, it } from 'vitest';
import { isTilePositionAvailable, resolveTilePosition } from './storefrontLayoutCollision';

describe('storefrontLayoutCollision', () => {
  const tiles = [
    { id: 'hero', position: { row: 0, col: 0, rowSpan: 2, colSpan: 4 } },
    { id: 'products', position: { row: 2, col: 0, rowSpan: 3, colSpan: 2 } },
    { id: 'reviews', position: { row: 2, col: 2, rowSpan: 2, colSpan: 2 } },
  ];

  it('detects rectangular overlap while allowing the tile itself', () => {
    expect(isTilePositionAvailable(tiles, 'products', { row: 2, col: 0, rowSpan: 3, colSpan: 2 })).toBe(true);
    expect(isTilePositionAvailable(tiles, 'new', { row: 2, col: 0, rowSpan: 2, colSpan: 2 })).toBe(false);
    expect(isTilePositionAvailable(tiles, 'new', { row: 5, col: 0, rowSpan: 2, colSpan: 2 })).toBe(true);
  });

  it('finds the nearest free slot for a colliding move', () => {
    const resolved = resolveTilePosition(tiles, 'new', { row: 2, col: 0, rowSpan: 2, colSpan: 2 });
    expect(resolved).toMatchObject({ row: 5, col: 0, rowSpan: 2, colSpan: 2 });
  });

  it('clamps positions to the four-column canvas', () => {
    const resolved = resolveTilePosition([], 'new', { row: -4, col: 9, rowSpan: 1, colSpan: 3 });
    expect(resolved).toMatchObject({ row: 0, col: 1, rowSpan: 1, colSpan: 3 });
  });

  it('finds a free row after a densely packed vertical stack', () => {
    const packed = Array.from({ length: 25 }, (_, row) => ({
      id: `tile-${row}`,
      position: { row, col: 0, rowSpan: 1, colSpan: 4 },
    }));
    const resolved = resolveTilePosition(packed, 'new', { row: 10, col: 0, rowSpan: 1, colSpan: 4 });
    expect(resolved).toMatchObject({ row: 25, col: 0, rowSpan: 1, colSpan: 4 });
  });
});
