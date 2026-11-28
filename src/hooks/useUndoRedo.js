// src/hooks/useUndoRedo.js
// ─────────────────────────────────────────────────────────────────────────────
// Undo/Redo for the storefront editor: bounded stacks of draft snapshots.
//
//   const { pushSnapshot, undo, redo, canUndo, canRedo, clear } = useUndoRedo();
//   pushSnapshot(currentDraft);          // before a mutation
//   const previous = undo(currentDraft); // the snapshot to restore, or null
//   const next = redo(currentDraft);     // the snapshot to restore, or null
//
// undo/redo return the snapshot to apply and move the current state onto the
// other stack. (They used to only shuffle the stacks and return nothing, so
// the editor's Undo and Redo buttons changed nothing.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';

export const MAX_HISTORY = 50;

export function useUndoRedo() {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, setVersion] = useState(0);
  const changed = () => setVersion((v) => v + 1);

  const pushSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    pastRef.current = [...pastRef.current, snapshot].slice(-MAX_HISTORY);
    futureRef.current = []; // a new edit clears redo
    changed();
  }, []);

  const undo = useCallback((current) => {
    const past = pastRef.current;
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    if (current) futureRef.current = [current, ...futureRef.current].slice(0, MAX_HISTORY);
    changed();
    return previous;
  }, []);

  const redo = useCallback((current) => {
    const future = futureRef.current;
    if (future.length === 0) return null;
    const next = future[0];
    futureRef.current = future.slice(1);
    if (current) pastRef.current = [...pastRef.current, current].slice(-MAX_HISTORY);
    changed();
    return next;
  }, []);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    changed();
  }, []);

  return {
    past: pastRef.current,
    future: futureRef.current,
    pushSnapshot,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clear,
  };
}
