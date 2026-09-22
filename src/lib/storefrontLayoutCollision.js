// src/lib/storefrontLayoutCollision.js
// Deterministic grid collision boundary for legacy Storefront tile geometry.

const GRID_COLS = 4;

function normalizePosition(position = {}) {
  return {
    ...position,
    col: Number.isFinite(position.col) ? Math.trunc(position.col) : 0,
    row: Number.isFinite(position.row) ? Math.trunc(position.row) : 0,
    colSpan: Number.isFinite(position.colSpan) ? Math.max(1, Math.trunc(position.colSpan)) : 4,
    rowSpan: Number.isFinite(position.rowSpan) ? Math.max(1, Math.trunc(position.rowSpan)) : 2,
  };
}

function overlaps(a, b) {
  const aRight = a.col + a.colSpan;
  const aBottom = a.row + a.rowSpan;
  const bRight = b.col + b.colSpan;
  const bBottom = b.row + b.rowSpan;
  return a.col < bRight && aRight > b.col && a.row < bBottom && aBottom > b.row;
}

function clampToGrid(position) {
  const next = normalizePosition(position);
  const colSpan = Math.min(next.colSpan, GRID_COLS);
  return {
    ...next,
    colSpan,
    col: Math.max(0, Math.min(next.col, GRID_COLS - colSpan)),
    row: Math.max(0, next.row),
  };
}

export function isTilePositionAvailable(tiles, tileId, position) {
  const candidate = clampToGrid(position);
  return !tiles.some((tile) => {
    if (!tile || tile.id === tileId) return false;
    return overlaps(candidate, normalizePosition(tile.position));
  });
}

/**
 * Return the requested position when free; otherwise find the nearest free
 * location in deterministic Manhattan-distance order. `null` means no free
 * slot was found within the search horizon.
 */
export function resolveTilePosition(tiles, tileId, position) {
  const base = clampToGrid(position);
  if (isTilePositionAvailable(tiles, tileId, base)) return base;

  const maxRow = Math.max(
    24,
    ...tiles.map((tile) => {
      const current = normalizePosition(tile?.position);
      return current.row + current.rowSpan;
    }),
  );

  for (let distance = 1; distance <= maxRow + 4; distance += 1) {
    const candidates = [];
    for (let dx = -distance; dx <= distance; dx += 1) {
      const dy = distance - Math.abs(dx);
      candidates.push({ col: base.col + dx, row: base.row + dy });
      if (dy !== 0) candidates.push({ col: base.col + dx, row: base.row - dy });
    }

    const normalizedCandidates = candidates
      .map((candidate) => clampToGrid({ ...base, ...candidate }))
      .filter((candidate, index, all) =>
        all.findIndex((other) => other.col === candidate.col && other.row === candidate.row) === index
      )
      .sort((a, b) => a.row - b.row || a.col - b.col);

    for (const candidate of normalizedCandidates) {
      if (isTilePositionAvailable(tiles, tileId, candidate)) return candidate;
    }
  }

  return null;
}
