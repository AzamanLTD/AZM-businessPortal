import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from './useUndoRedo';

describe('useUndoRedo', () => {
  it('undo gives back the state before the edit; redo the one after', () => {
    const { result } = renderHook(() => useUndoRedo());
    const a = { layoutJson: { tiles: [] } };
    const b = { layoutJson: { tiles: [{ id: 't1' }] } };

    act(() => result.current.pushSnapshot(a)); // editing a -> b
    expect(result.current.canUndo).toBe(true);

    let restored;
    act(() => { restored = result.current.undo(b); });
    expect(restored).toBe(a);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => { restored = result.current.redo(a); });
    expect(restored).toBe(b);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('a new edit clears redo; empty stacks give null', () => {
    const { result } = renderHook(() => useUndoRedo());
    let out;
    act(() => { out = result.current.undo({}); });
    expect(out).toBeNull();
    act(() => result.current.pushSnapshot({ v: 1 }));
    act(() => { result.current.undo({ v: 2 }); });
    act(() => result.current.pushSnapshot({ v: 1 }));
    expect(result.current.canRedo).toBe(false);
  });
});
