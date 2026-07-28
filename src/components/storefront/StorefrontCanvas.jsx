// src/components/storefront/StorefrontCanvas.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AZAMAN Business Portal — True 2D Visual Storefront Builder
//
// Upgraded from a flat linear list to a real 2D grid canvas with:
//   • Drag-to-reposition tiles anywhere on the canvas
//   • Resize tiles by dragging corner handles
//   • Multi-column support (1-4 col span)
//   • Visual grid overlay (drag guides)
//   • Snap-to-grid positioning
//   • Click to select, double-click to configure
//
// Reference: Wix drag-and-drop, Webflow layout grid, Shopify theme editor,
//            Square Online visual builder
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState, useEffect } from 'react';
import { Trash2, Plus, Image, Info, ShoppingBag, Star, Phone, MapPin, MousePointerClick, Video, BadgePercent, Instagram, BarChart, Hash, Code, Sparkles, Layers, Maximize2, Move } from 'lucide-react';
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
const ROW_HEIGHT = 80; // px per row unit
const GAP = 12; // gap between tiles

export default function StorefrontCanvas({
  draft, theme, selectedTileId, onSelectTile, onUpdateTile, onRemoveTile, onReorderTiles,
}) {
  const tiles = draft?.layoutJson?.tiles ?? [];
  const canvasRef = useRef(null);
  const [dragState, setDragState] = useState(null); // { tileId, startX, startY, origCol, origRow, origColSpan, origRowSpan, mode: 'move' | 'resize' }
  const [canvasWidth, setCanvasWidth] = useState(600);

  // Track canvas width for grid calculations
  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.offsetWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const colWidth = (canvasWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;

  // Convert grid position to pixel position
  const gridToPx = (col, row, colSpan, rowSpan) => ({
    left: col * (colWidth + GAP),
    top: row * (ROW_HEIGHT + GAP),
    width: colSpan * colWidth + (colSpan - 1) * GAP,
    height: rowSpan * ROW_HEIGHT + (rowSpan - 1) * GAP,
  });

  // Convert pixel to grid position
  const pxToGrid = (pxX, pxY) => {
    const col = Math.round(pxX / (colWidth + GAP));
    const row = Math.round(pxY / (ROW_HEIGHT + GAP));
    return {
      col: Math.max(0, Math.min(col, GRID_COLS - 1)),
      row: Math.max(0, row),
    };
  };

  // Start dragging a tile
  const startDrag = useCallback((e, tile, mode) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({
      tileId: tile.id,
      startX: e.clientX,
      startY: e.clientY,
      origCol: tile.position?.col ?? 0,
      origRow: tile.position?.row ?? 0,
      origColSpan: tile.position?.colSpan ?? 4,
      origRowSpan: tile.position?.rowSpan ?? 2,
      mode,
    });
    onSelectTile(tile.id);
  }, [onSelectTile]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      const tile = tiles.find(t => t.id === dragState.tileId);
      if (!tile) return;

      if (dragState.mode === 'move') {
        const newCol = Math.max(0, Math.min(
          dragState.origCol + Math.round(deltaX / (colWidth + GAP)),
          GRID_COLS - (dragState.origColSpan)
        ));
        const newRow = Math.max(0, dragState.origRow + Math.round(deltaY / (ROW_HEIGHT + GAP)));
        onUpdateTile(tile.id, {
          ...tile,
          position: { ...tile.position, col: newCol, row: newRow },
        });
      } else if (dragState.mode === 'resize') {
        const newColSpan = Math.max(1, Math.min(
          dragState.origColSpan + Math.round(deltaX / (colWidth + GAP)),
          GRID_COLS - (dragState.origCol) + 1
        ));
        const newRowSpan = Math.max(1, dragState.origRowSpan + Math.round(deltaY / (ROW_HEIGHT + GAP)));
        onUpdateTile(tile.id, {
          ...tile,
          position: { ...tile.position, colSpan: newColSpan, rowSpan: newRowSpan },
        });
      }
    };

    const handleUp = () => setDragState(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, tiles, colWidth, onUpdateTile]);

  // Calculate canvas height based on max row
  const maxRow = tiles.reduce((max, t) => {
    const rowEnd = (t.position?.row ?? 0) + (t.position?.rowSpan ?? 2);
    return Math.max(max, rowEnd);
  }, 0);
  const canvasHeight = Math.max(400, maxRow * (ROW_HEIGHT + GAP) + ROW_HEIGHT);

  if (!tiles.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed"
        style={{ borderColor: 'var(--az-border)', background: 'var(--az-surface)' }}>
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--az-accent-subtle)' }}>
          <Plus className="w-8 h-8" style={{ color: 'var(--az-accent)' }} />
        </div>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--az-text)' }}>Start Building</h3>
        <p className="text-sm" style={{ color: 'var(--az-text-muted)' }}>
          Add widgets from the left panel to build your storefront layout.
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--az-text-muted)' }}>
          Drag tiles to reposition • Drag corners to resize
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium" style={{ color: 'var(--az-text-muted)' }}>
          {tiles.length} tile{tiles.length !== 1 ? 's' : ''} — drag to move, drag corner to resize
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--az-bg-alt)', color: 'var(--az-text-muted)' }}>
            {GRID_COLS} cols
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative rounded-2xl border-2 overflow-hidden"
        style={{
          background: 'var(--az-bg-alt)',
          borderColor: 'var(--az-border)',
          height: canvasHeight,
          backgroundImage: `
            linear-gradient(to right, var(--az-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--az-border) 1px, transparent 1px)
          `,
          backgroundSize: `${colWidth + GAP}px ${ROW_HEIGHT + GAP}px`,
          backgroundPosition: '0 0',
        }}
      >
        {/* Tiles */}
        {tiles.map((tile) => {
          const col = tile.position?.col ?? 0;
          const row = tile.position?.row ?? 0;
          const colSpan = tile.position?.colSpan ?? 4;
          const rowSpan = tile.position?.rowSpan ?? 2;
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
                "absolute rounded-xl border-2 transition-shadow cursor-move select-none overflow-hidden",
                isDragging && "opacity-80 shadow-2xl z-50",
                !isDragging && "transition-all duration-150"
              )}
              style={{
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                background: 'var(--az-surface)',
                borderColor: isSelected ? 'var(--az-accent)' : 'var(--az-border)',
                boxShadow: isSelected
                  ? '0 0 0 3px var(--az-accent-subtle), 0 4px 12px rgba(0,0,0,0.08)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            >
              {/* Tile content */}
              <div className="flex flex-col h-full p-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isSelected ? 'var(--az-accent-subtle)' : 'var(--az-bg-alt)' }}>
                    <Icon className="w-4 h-4" style={{ color: isSelected ? 'var(--az-accent)' : 'var(--az-text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--az-text)' }}>
                      {(tile.widgetType || '').replace(/_/g, ' ')}
                    </p>
                    {tile.props?.title && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--az-text-muted)' }}>
                        {tile.props.title}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--az-text-muted)', opacity: 0.7 }}>
                      {colSpan}×{rowSpan} · col {col} row {row}
                    </p>
                  </div>
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveTile(tile.id); }}
                      className="p-1.5 rounded-lg transition-all flex-shrink-0"
                      style={{ background: 'var(--az-danger-subtle)', color: 'var(--az-danger)' }}
                      title="Remove tile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected indicator bar */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'var(--az-accent)' }} />
              )}

              {/* Resize handle (bottom-right corner) */}
              {isSelected && (
                <div
                  onMouseDown={(e) => startDrag(e, tile, 'resize')}
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end"
                  style={{ touchAction: 'none' }}
                >
                  <div
                    className="w-3 h-3 border-r-2 border-b-2 rounded-br-md"
                    style={{ borderColor: 'var(--az-accent)' }}
                  />
                </div>
              )}

              {/* Move handle badge (top-left) */}
              {isSelected && (
                <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
                  style={{ background: 'var(--az-accent)', color: 'white' }}>
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
