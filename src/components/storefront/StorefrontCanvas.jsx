// src/components/storefront/StorefrontCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AZAMAN Business Portal — True 2D Visual Storefront Builder
//
// Layout mutation is intentionally limited to the tile.position patch domain.
// Content/configuration stays in tile.props. The visual interaction layer uses
// the shared Studio drag engine so pointer input, snapping, and connected groups
// remain deterministic and do not create a second layout authority.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState, useEffect } from 'react';
import { Trash2, Plus, Image, Info, ShoppingBag, Star, Phone, MapPin, MousePointerClick, Video, BadgePercent, Instagram, BarChart, Hash, Code, Sparkles, Layers, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STOREFRONT_STUDIO_TOKENS } from '@/lib/storefrontStudioTokens';
import { clampGridPosition, commitGridPosition, connectedGroupIds, gridGeometry, magneticSnap } from '@/lib/storefrontStudioDrag';

const WIDGET_ICONS = {
  hero_header: Image,
  quick_info_bar: Info,
  product_grid: ShoppingBag,
  showcase_gallery: Layers,
  review_carousel: Star,
  contact_card: Phone,
  location_map: MapPin,
  action_buttons: MousePointerClick,
  video_player: Video,
  promo_banner: BadgePercent,
  social_feed: Instagram,
  live_stats: BarChart,
  animated_counter: Hash,
  custom_html: Code,
  gradient_hero: Sparkles,
  retail_collection_box: ShoppingBag,
};

const GRID_COLS = STOREFRONT_STUDIO_TOKENS.studio.canvas.gridCols;
const ROW_HEIGHT = STOREFRONT_STUDIO_TOKENS.studio.canvas.rowHeightDp * STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE;
const GAP = STOREFRONT_STUDIO_TOKENS.studio.canvas.gapDp * STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE;
const SETTLE_MS = STOREFRONT_STUDIO_TOKENS.snap.settleDurationMs;

const samePosition = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function StorefrontCanvas({
  draft, theme, selectedTileId, onSelectTile, onUpdateTile, onRemoveTile, onReorderTiles,
}) {
  const tiles = draft?.layoutJson?.tiles ?? [];
  const canvasRef = useRef(null);
  const dragPreviewRef = useRef({});
  const [dragState, setDragState] = useState(null);
  const [dragPreview, setDragPreview] = useState({});
  const [canvasWidth, setCanvasWidth] = useState(600);

  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current) setCanvasWidth(canvasRef.current.offsetWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const colWidth = (canvasWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;

  const gridToPx = (position = {}) => {
    const box = gridGeometry(canvasWidth, clampGridPosition(position));
    return {
      left: box.left,
      top: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
    };
  };

  const clearDrag = useCallback(() => {
    dragPreviewRef.current = {};
    setDragPreview({});
    setDragState(null);
  }, []);

  const startDrag = useCallback((e, tile, mode) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const originalPosition = clampGridPosition({
      ...(tile.position || {}),
      col: tile.position?.col ?? 0,
      row: tile.position?.row ?? 0,
      colSpan: tile.position?.colSpan ?? 4,
      rowSpan: tile.position?.rowSpan ?? 2,
    });
    const groupIds = mode === 'move'
      ? connectedGroupIds(tiles, tile.id, canvasWidth)
      : [tile.id];
    const originalPositions = Object.fromEntries(groupIds.map((id) => {
      const member = tiles.find((candidate) => candidate.id === id);
      return [id, clampGridPosition(member?.position || originalPosition)];
    }));

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragState({
      tileId: tile.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origCol: originalPosition.col,
      origRow: originalPosition.row,
      origColSpan: originalPosition.colSpan,
      origRowSpan: originalPosition.rowSpan,
      origPosition: originalPosition,
      originalPositions,
      groupIds,
      mode,
    });
    dragPreviewRef.current = originalPositions;
    setDragPreview(originalPositions);
    onSelectTile(tile.id);
  }, [canvasWidth, onSelectTile, tiles]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    let nextPreview;
    if (dragState.mode === 'move') {
      const previewCol = dragState.origCol + deltaX / colWidth;
      const previewRow = dragState.origRow + deltaY / (ROW_HEIGHT + GAP);
      const rootPosition = clampGridPosition({
        ...dragState.origPosition,
        col: previewCol,
        row: previewRow,
      });
      const snappedRoot = magneticSnap({
        position: rootPosition,
        tiles,
        tileId: dragState.tileId,
        canvasWidth,
      });
      const colDelta = snappedRoot.col - dragState.origCol;
      const rowDelta = snappedRoot.row - dragState.origRow;
      nextPreview = Object.fromEntries(dragState.groupIds.map((id) => {
        const original = dragState.originalPositions[id];
        return [id, clampGridPosition({
          ...original,
          col: original.col + colDelta,
          row: original.row + rowDelta,
        })];
      }));
    } else {
      const newColSpan = Math.max(1, Math.min(
        dragState.origColSpan + Math.round(deltaX / colWidth),
        GRID_COLS - dragState.origCol,
      ));
      const newRowSpan = Math.max(1, dragState.origRowSpan + Math.round(deltaY / (ROW_HEIGHT + GAP)));
      nextPreview = {
        ...dragState.originalPositions,
        [dragState.tileId]: clampGridPosition({
          ...dragState.origPosition,
          colSpan: newColSpan,
          rowSpan: newRowSpan,
        }),
      };
    }

    dragPreviewRef.current = nextPreview;
    setDragPreview(nextPreview);
  }, [canvasWidth, colWidth, dragState, tiles]);

  const finishDrag = useCallback((e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const preview = dragPreviewRef.current;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Browser may have released capture already.
    }
    for (const id of dragState.groupIds) {
      const nextPosition = preview[id];
      const originalPosition = dragState.originalPositions[id];
      if (nextPosition && !samePosition(nextPosition, originalPosition)) {
        onUpdateTile(id, { position: commitGridPosition(nextPosition) });
      }
    }
    clearDrag();
  }, [clearDrag, dragState, onUpdateTile]);

  const handlePointerCancel = useCallback((e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Browser may have released capture already.
    }
    clearDrag();
  }, [clearDrag, dragState]);

  const handleCanvasKeyDown = useCallback((e) => {
    const tile = tiles.find((candidate) => candidate.id === selectedTileId);
    if (!tile || dragState) return;

    const directionByKey = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directionByKey[e.key];
    if (!direction) return;

    e.preventDefault();
    const step = e.shiftKey ? 2 : 1;
    const current = clampGridPosition(tile.position || {});
    const col = Math.max(0, Math.min(
      current.col + direction[0] * step,
      GRID_COLS - current.colSpan,
    ));
    const row = Math.max(0, current.row + direction[1] * step);

    if (col === current.col && row === current.row) return;
    onUpdateTile(tile.id, {
      position: {
        ...current,
        col,
        row,
      },
    });
  }, [tiles, selectedTileId, dragState, onUpdateTile]);

  const maxRow = tiles.reduce((max, t) => {
    const rowEnd = (t.position?.row ?? 0) + (t.position?.rowSpan ?? 2);
    return Math.max(max, rowEnd);
  }, 0);
  const canvasHeight = Math.max(400, maxRow * (ROW_HEIGHT + GAP) + ROW_HEIGHT);

  if (!tiles.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed"
        style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}>
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--f-surface-sunken)' }}>
          <Plus className="w-8 h-8" style={{ color: 'var(--f-tint-color)' }} />
        </div>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--f-text)' }}>Start Building</h3>
        <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>
          Add widgets from the left panel to build your storefront layout.
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--f-text-3)' }}>
          Drag tiles to reposition • Drag corners to resize
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium" style={{ color: 'var(--f-text-3)' }}>
          {tiles.length} tile{tiles.length !== 1 ? 's' : ''} — drag to move, drag corner to resize
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-3)' }}>
            {GRID_COLS} cols
          </span>
          {dragState && <span className="text-[10px] font-semibold" style={{ color: 'var(--f-tint-color)' }}>Editing locally — release to save</span>}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative rounded-2xl border-2 overflow-hidden"
        style={{
          background: 'var(--f-surface-sunken)',
          borderColor: 'var(--f-line)',
          height: canvasHeight,
          backgroundImage: `
            linear-gradient(to right, var(--f-line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--f-line) 1px, transparent 1px)
          `,
          backgroundSize: `${colWidth + GAP}px ${ROW_HEIGHT + GAP}px`,
          backgroundPosition: '0 0',
        }}
        tabIndex={0}
        role="application"
        aria-label="Storefront layout canvas. Use arrow keys to nudge the selected tile. Hold Shift for larger steps."
        onKeyDown={handleCanvasKeyDown}
      >
        {tiles.map((tile) => {
          const position = dragPreview[tile.id] || clampGridPosition(tile.position || {});
          const pos = gridToPx(position);
          const isSelected = selectedTileId === tile.id;
          const Icon = WIDGET_ICONS[tile.widgetType] || Layers;
          const isDragging = dragState?.groupIds?.includes(tile.id);

          return (
            <div
              key={tile.id}
              data-studio-drag-pointer={dragState?.pointerId ?? ''}
              onPointerDown={(e) => startDrag(e, tile, 'move')}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={handlePointerCancel}
              onClick={(e) => { e.stopPropagation(); onSelectTile(tile.id); }}
              className={cn(
                'absolute rounded-xl border-2 transition-shadow cursor-move select-none overflow-hidden',
                isDragging && 'opacity-80 shadow-2xl z-50',
                !isDragging && 'transition-all'
              )}
              style={{
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                background: 'var(--f-surface)',
                borderColor: isSelected ? 'var(--f-tint-color)' : 'var(--f-line)',
                boxShadow: isSelected
                  ? '0 0 0 3px var(--f-surface-sunken), 0 4px 12px rgba(0,0,0,0.08)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: isDragging ? 'none' : `left ${SETTLE_MS}ms ease-out, top ${SETTLE_MS}ms ease-out, width ${SETTLE_MS}ms ease-out, height ${SETTLE_MS}ms ease-out, box-shadow 150ms ease-out`,
                touchAction: 'none',
              }}
            >
              <div className="flex flex-col h-full p-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--f-surface-sunken)' }}>
                    <Icon className="w-4 h-4" style={{ color: isSelected ? 'var(--f-tint-color)' : 'var(--f-text-3)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--f-text)' }}>
                      {(tile.widgetType || '').replace(/_/g, ' ')}
                    </p>
                    {tile.props?.title && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--f-text-3)' }}>
                        {tile.props.title}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--f-text-3)', opacity: 0.7 }}>
                      {Math.round(position.colSpan)}×{Math.round(position.rowSpan)} · col {Number(position.col).toFixed(2)} row {Number(position.row).toFixed(2)}
                    </p>
                  </div>
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveTile(tile.id); }}
                      className="p-1.5 rounded-lg transition-all flex-shrink-0"
                      style={{ background: 'var(--f-bad-bg)', color: 'var(--f-bad)' }}
                      title="Remove tile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'var(--f-tint-color)' }} />
              )}

              {isSelected && (
                <div
                  onPointerDown={(e) => startDrag(e, tile, 'resize')}
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end"
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-3 h-3 border-r-2 border-b-2 rounded-br-md" style={{ borderColor: 'var(--f-tint-color)' }} />
                </div>
              )}

              {isSelected && (
                <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
                  style={{ background: 'var(--f-tint-color)', color: 'white' }}>
                  <Move className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
