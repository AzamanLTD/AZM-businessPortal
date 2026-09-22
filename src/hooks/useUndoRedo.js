// src/hooks/useUndoRedo.js
// ─────────────────────────────────────────────────────────────────────────────
// Undo/Redo system for the storefront editor.
//
// Maintains a bounded history stack of draft snapshots. Each mutation
// (addTile, updateTile, removeTile, reorderTiles, changeTheme, applyTemplate)
// pushes the previous state onto the undo stack and clears the redo stack.
//
// Usage:
//   const { past, future, undo, redo, canUndo, canRedo, clear } = useUndoRedo();
//   // Before a mutation:
//   pushSnapshot(currentDraft);
//
// Reference: Figma undo/redo, Linear history, VS Code undo stack
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const pushSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    setPast(prev => {
      const next = [...prev, snapshot];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    // Clear redo stack on new mutation
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast(prev => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture(f => [previous, ...f]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(prev => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast(p => [...p, next]);
      return prev.slice(1);
    });
  }, []);

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return {
    past,
    future,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}
