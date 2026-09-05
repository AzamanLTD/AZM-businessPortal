// src/components/storefront/StorefrontCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AZAMAN Business Portal — True 2D Visual Storefront Builder
//
// Layout mutation is intentionally limited to the tile.position patch domain.
// Content/configuration stays in tile.props. This boundary is important for
// Studio V2 because the visual stage will eventually sit on top of a shared
// storefront renderer rather than maintain an independent fake preview.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState, useEffect } from 'react';
import { Trash2, Plus, Image, Info, ShoppingBag, Star, Phone, MapPin, MousePointerClick, Video, BadgePercent, Instagram, BarChart, Hash, Code, Sparkles, Layers, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

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
};

const GRID_COLS = 4;
const ROW_HEIGHT = 80;
const GAP = 12;

export default function StorefrontCanvas({
  draft, theme, selectedTileId, onSelectTile, onUpdateTile, onRemoveTile, onReorderTiles,
}) {
  const tiles = draft?.layoutJson?.tiles ?? [];
  const canvasRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
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

  const gridToPx = (col, row, colSpan, rowSpan) => ({
    left: col * (colWidth + GAP),
    top: row * (ROW_HEIGHT + GAP),
    width: colSpan * colWidth + (colSpan - 1) * GAP,
    height: rowSpan * ROW_HEIGHT + (rowSpan - 1) * GAP,
  });

  const startDrag = useCallback((e, tile, mode) => {
    e.stopPropagation();
    e.preventDefault();
    const originalPosition = {
      ...(tile.position || {}),
      col: tile.position?.col ?? 0,
      row: tile.position?.row ?? 0,
      colSpan: tile.position?.colSpan ?? 4,
      rowSpan: tile.position?.rowSpan ?? 2,
    };
    setDragState({
      tileId: tile.id,
      startX: e.clientX,
      startY: e.clientY,
      origCol: originalPosition.col,
      origRow: originalPosition.row,
      origColSpan: originalPosition.colSpan,
      origRowSpan: originalPosition.rowSpan,
      origPosition: originalPosition,
      mode,
    });
    dragPreviewRef.current = originalPosition;
    setDragPreview(originalPosition);
    onSelectTile(tile.id);
  }, [onSelectTile]);

  useEffect(() => {
    if (!dragState) return;

    const calculatePreview = (e) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      if (dragState.mode === 'move') {
        const newCol = Math.max(0, Math.min(
          dragState.origCol + Math.round(deltaX / (colWidth + GAP)),
          GRID_COLS - dragState.origColSpan
        ));
        const newRow = Math.max(0, dragState.origRow + Math.round(deltaY / (ROW_HEIGHT + GAP)));
        return { ...dragState.origPosition, col: newCol, row: newRow };
      }

      const newColSpan = Math.max(1, Math.min(
        dragState.origColSpan + Math.round(deltaX / (colWidth + GAP)),
        GRID_COLS - dragState.origCol
      ));
      const newRowSpan = Math.max(1, dragState.origRowSpan + Math.round(deltaY / (ROW_HEIGHT + GAP)));
      return { ...dragState.origPosition, colSpan: newColSpan, rowSpan: newRowSpan };
    };

    const handleMove = (e) => {
      const nextPreview = calculatePreview(e);
      dragPreviewRef.current = nextPreview;
      setDragPreview(nextPreview);
    };

    const handleUp = () => {
      const preview = dragPreviewRef.current;
      if (preview && JSON.stringify(preview) !== JSON.stringify(dragState.origPosition)) {
        onUpdateTile(dragState.tileId, { position: preview });
      }
      dragPreviewRef.current = null;
      setDragPreview(null);
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, colWidth, onUpdateTile]);

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
    const current = tile.position || {};
    const colSpan = current.colSpan ?? 4;
    const rowSpan = current.rowSpan ?? 2;
    const col = Math.max(0, Math.min(
      (current.col ?? 0) + direction[0] * step,
      GRID_COLS - colSpan
    ));
    const row = Math.max(0, (current.row ?? 0) + direction[1] * step);

    if (col === (current.col ?? 0) && row === (current.row ?? 0)) return;
    onUpdateTile(tile.id, {
      position: {
        ...current,
        col,
        row,
        colSpan,
        rowSpan,
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
          const activePreview = dragState?.tileId === tile.id ? dragPreview : null;
          const position = activePreview || tile.position || {};
          const col = position.col ?? 0;
          const row = position.row ?? 0;
          const colSpan = position.colSpan ?? 4;
          const rowSpan = position.rowSpan ?? 2;
          const pos = gridToPx(col, row, colSpan, rowSpan);
          const isSelected = selectedTileId === tile.id;
          const Icon = WIDGET_ICONS[tile.widgetType] || Layers;
          const isDragging = dragState?.tileId === tile.id;

          return (
            <div
              key={tile.id}
              onMouseDown={(e) => startDrag(e, tile, 'move')}
              onClick={(e) => { e.stopPropagation(); onSelectTile(tile.id); }}
              className={cn(
                'absolute rounded-xl border-2 transition-shadow cursor-move select-none overflow-hidden',
                isDragging && 'opacity-80 shadow-2xl z-50',
                !isDragging && 'transition-all duration-150'
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
                      {colSpan}×{rowSpan} · col {col} row {row}
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
                  onMouseDown={(e) => startDrag(e, tile, 'resize')}
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
