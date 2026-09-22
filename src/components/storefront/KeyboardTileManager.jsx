import { useEffect, useCallback, useRef } from 'react';

export default function KeyboardTileManager({
  tiles, selectedTileId, onSelectTile, onUpdateTile, onRemoveTile, onReorderTiles, onOpenConfig, children,
}) {
  const containerRef = useRef(null);

  const moveTile = useCallback((direction) => {
    if (!selectedTileId) return;
    const tile = tiles.find(t => t.id === selectedTileId);
    if (!tile) return;
    const idx = tiles.indexOf(tile);
    let newTiles = [...tiles];
    if (direction === 'up' && idx > 0) {
      [newTiles[idx - 1], newTiles[idx]] = [newTiles[idx], newTiles[idx - 1]];
    } else if (direction === 'down' && idx < tiles.length - 1) {
      [newTiles[idx + 1], newTiles[idx]] = [newTiles[idx], newTiles[idx + 1]];
    }
    newTiles = newTiles.map((t, i) => ({ ...t, position: { ...t.position, row: i } }));
    onReorderTiles(newTiles);
  }, [tiles, selectedTileId, onReorderTiles]);

  const resizeTile = useCallback((axis, delta) => {
    if (!selectedTileId) return;
    const tile = tiles.find(t => t.id === selectedTileId);
    if (!tile) return;
    const pos = tile.position;
    if (axis === 'height') {
      const newRowSpan = Math.max(1, Math.min(6, pos.rowSpan + delta));
      onUpdateTile(selectedTileId, { position: { ...pos, rowSpan: newRowSpan } });
    } else {
      const newColSpan = Math.max(1, Math.min(4, pos.colSpan + delta));
      onUpdateTile(selectedTileId, { position: { ...pos, colSpan: newColSpan } });
    }
  }, [tiles, selectedTileId, onUpdateTile]);

  const navigateTile = useCallback((direction) => {
    if (!selectedTileId) {
      if (tiles.length > 0) onSelectTile(tiles[0].id);
      return;
    }
    const idx = tiles.findIndex(t => t.id === selectedTileId);
    if (direction === 'next' && idx < tiles.length - 1) onSelectTile(tiles[idx + 1].id);
    else if (direction === 'prev' && idx > 0) onSelectTile(tiles[idx - 1].id);
  }, [tiles, selectedTileId, onSelectTile]);

  const handleKeyDown = useCallback((e) => {
    if (!containerRef.current?.contains(document.activeElement) && !selectedTileId) return;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        navigateTile(e.shiftKey ? 'prev' : 'next');
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) moveTile('up');
        else if (e.shiftKey) resizeTile('height', -1);
        else navigateTile('prev');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) moveTile('down');
        else if (e.shiftKey) resizeTile('height', 1);
        else navigateTile('next');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) resizeTile('width', -1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) resizeTile('width', 1);
        break;
      case 'Delete':
      case 'Backspace':
        if (selectedTileId) {
          e.preventDefault();
          onRemoveTile(selectedTileId);
        }
        break;
      case 'Enter':
        if (selectedTileId) {
          e.preventDefault();
          onOpenConfig();
        }
        break;
      case 'Escape':
        onSelectTile(null);
        break;
    }
  }, [selectedTileId, navigateTile, moveTile, resizeTile, onRemoveTile, onOpenConfig, onSelectTile]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('keydown', handleKeyDown);
    container.setAttribute('tabindex', '0');
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={containerRef} className="outline-none focus:ring-2 focus:ring-2 rounded-xl">
      {selectedTileId && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs flex items-center gap-2 flex-wrap"
          style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-2)' }}>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-raised text-ink font-mono text-xs">Tab</kbd>
          <span>navigate</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-raised text-ink font-mono text-xs">↑↓</kbd>
          <span>move</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-raised text-ink font-mono text-xs">Shift+←→</kbd>
          <span>resize</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-raised text-ink font-mono text-xs">Del</kbd>
          <span>remove</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-raised text-ink font-mono text-xs">Esc</kbd>
          <span>deselect</span>
        </div>
      )}
      {children}
    </div>
  );
}
