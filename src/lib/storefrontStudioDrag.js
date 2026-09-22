import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from './storefrontStudioTokens';

const GRID_COLS = STOREFRONT_STUDIO_TOKENS.studio.canvas.gridCols;
const ROW_HEIGHT_DP = STOREFRONT_STUDIO_TOKENS.studio.canvas.rowHeightDp;
const GAP_DP = STOREFRONT_STUDIO_TOKENS.studio.canvas.gapDp;
const SNAP_ALONG_PX = toPreviewPx(STOREFRONT_STUDIO_TOKENS.snap.alongSiblingDp);
const SNAP_CROSS_PX = toPreviewPx(STOREFRONT_STUDIO_TOKENS.snap.crossSiblingDp);
const PULL_SHARPNESS = STOREFRONT_STUDIO_TOKENS.snap.pullSharpness;

export const STUDIO_CANVAS_GRID = Object.freeze({
  cols: GRID_COLS,
  rowHeightDp: ROW_HEIGHT_DP,
  gapDp: GAP_DP,
});

export function gridGeometry(canvasWidth, position = {}) {
  const col = Number(position.col ?? 0);
  const row = Number(position.row ?? 0);
  const colSpan = Number(position.colSpan ?? 4);
  const rowSpan = Number(position.rowSpan ?? 2);
  const gapPx = toPreviewPx(GAP_DP);
  const rowHeightPx = toPreviewPx(ROW_HEIGHT_DP);
  const colWidthPx = (canvasWidth - gapPx * (GRID_COLS - 1)) / GRID_COLS;
  return {
    left: col * (colWidthPx + gapPx),
    top: row * (rowHeightPx + gapPx),
    right: col * (colWidthPx + gapPx) + colSpan * colWidthPx + (colSpan - 1) * gapPx,
    bottom: row * (rowHeightPx + gapPx) + rowSpan * rowHeightPx + (rowSpan - 1) * gapPx,
  };
}

const spansOverlap = (startA, spanA, startB, spanB) => {
  const endA = startA + spanA;
  const endB = startB + spanB;
  return startA < endB && startB < endA;
};

export function connectedGroupIds(tiles, rootId, canvasWidth) {
  const byId = new Map((tiles || []).map((tile) => [tile.id, tile]));
  if (!byId.has(rootId)) return [];

  const ids = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const currentId = queue.shift();
    const current = byId.get(currentId);
    const currentPosition = current.position || {};
    const currentCol = Number(currentPosition.col ?? 0);
    const currentRow = Number(currentPosition.row ?? 0);
    const currentColSpan = Number(currentPosition.colSpan ?? 4);
    const currentRowSpan = Number(currentPosition.rowSpan ?? 2);

    for (const candidate of tiles || []) {
      if (!candidate?.id || ids.has(candidate.id) || candidate.id === currentId) continue;
      const position = candidate.position || {};
      const col = Number(position.col ?? 0);
      const row = Number(position.row ?? 0);
      const colSpan = Number(position.colSpan ?? 4);
      const rowSpan = Number(position.rowSpan ?? 2);
      const horizontalAdjacent = (currentCol + currentColSpan === col || col + colSpan === currentCol)
        && spansOverlap(currentRow, currentRowSpan, row, rowSpan);
      const verticalAdjacent = (currentRow + currentRowSpan === row || row + rowSpan === currentRow)
        && spansOverlap(currentCol, currentColSpan, col, colSpan);

      if (horizontalAdjacent || verticalAdjacent) {
        ids.add(candidate.id);
        queue.push(candidate.id);
      }
    }
  }
  return [...ids];
}

function pull(current, target, threshold) {
  const delta = target - current;
  if (Math.abs(delta) > threshold) return current;
  const normalized = Math.abs(delta) / Math.max(threshold, 0.001);
  return current + delta * (1 - Math.pow(normalized, PULL_SHARPNESS));
}

export function magneticSnap({ position, tiles, tileId, canvasWidth }) {
  const result = { ...position };
  const movingBox = gridGeometry(canvasWidth, result);
  const candidates = (tiles || []).filter((tile) => tile?.id && tile.id !== tileId);
  let bestX = { distance: Number.POSITIVE_INFINITY, value: result.col };
  let bestY = { distance: Number.POSITIVE_INFINITY, value: result.row };
  const gapPx = toPreviewPx(GAP_DP);
  const rowHeightPx = toPreviewPx(ROW_HEIGHT_DP);
  const colWidthPx = (canvasWidth - gapPx * (GRID_COLS - 1)) / GRID_COLS;
  const colUnit = colWidthPx + gapPx;
  const rowUnit = rowHeightPx + gapPx;

  for (const tile of candidates) {
    const box = gridGeometry(canvasWidth, tile.position);
    const crossY = Math.max(0, Math.max(movingBox.top, box.top) - Math.min(movingBox.bottom, box.bottom));
    const crossX = Math.max(0, Math.max(movingBox.left, box.left) - Math.min(movingBox.right, box.right));
    const xTargets = [box.left, box.right - (movingBox.right - movingBox.left)];
    const yTargets = [box.top, box.bottom - (movingBox.bottom - movingBox.top)];
    const allowX = crossY <= SNAP_CROSS_PX;
    const allowY = crossX <= SNAP_CROSS_PX;

    if (allowX) {
      for (const targetLeft of xTargets) {
        const currentLeft = movingBox.left;
        const distance = Math.abs(targetLeft - currentLeft);
        if (distance <= SNAP_ALONG_PX && distance < bestX.distance) {
          bestX = { distance, value: result.col + (targetLeft - currentLeft) / colUnit };
        }
      }
    }
    if (allowY) {
      for (const targetTop of yTargets) {
        const currentTop = movingBox.top;
        const distance = Math.abs(targetTop - currentTop);
        if (distance <= SNAP_ALONG_PX && distance < bestY.distance) {
          bestY = { distance, value: result.row + (targetTop - currentTop) / rowUnit };
        }
      }
    }
  }

  if (Number.isFinite(bestX.distance)) {
    result.col = Math.max(0, Math.min(
      GRID_COLS - Number(result.colSpan ?? 4),
      pull(result.col, bestX.value, 1),
    ));
  }
  if (Number.isFinite(bestY.distance)) {
    result.row = Math.max(0, pull(result.row, bestY.value, 1));
  }
  return result;
}

export function clampGridPosition(position = {}) {
  const colSpan = Math.max(1, Math.min(GRID_COLS, Number(position.colSpan ?? 4)));
  const rowSpan = Math.max(1, Number(position.rowSpan ?? 2));
  return {
    ...position,
    colSpan,
    rowSpan,
    col: Math.max(0, Math.min(GRID_COLS - colSpan, Number(position.col ?? 0))),
    row: Math.max(0, Number(position.row ?? 0)),
  };
}

export function commitGridPosition(position = {}) {
  const clamped = clampGridPosition(position);
  return {
    ...clamped,
    colSpan: Math.round(clamped.colSpan),
    rowSpan: Math.round(clamped.rowSpan),
    col: Math.round(clamped.col),
    row: Math.round(clamped.row),
  };
}
