import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// §r40.4 — SERVER-OWNED RESTOCK INTENT LIFECYCLE (final-audit P1 redesign).
//
// The final audit rejected the client-derived restock identity model on four
// grounds, all resolved by moving the authority to the server:
//
//   1. (itemId, canonicalQuantity) → one UUID conflated two genuinely
//      distinct restocks of the same item and quantity. Each restock
//      operation is now REGISTERED on the server before its request is
//      sent; every operation has its own server-minted identity.
//   2. clear-by-(item, qty) let a LATE SUCCESS of an old request delete a
//      NEWER intent's key. Resolution here is keyed by intent id only:
//      ack/cancel name the exact operation they resolve, never a
//      (item, qty) pair.
//   3. The 24h TTL minted a fresh key for an operation that may have
//      committed 25h ago → duplicate execution. There is NO client TTL:
//      the server record is durable until there is AUTHORITATIVE evidence
//      of resolution (execution observed + acknowledged, or explicit
//      cancel while still pending).
//   4. localStorage-unavailable fallback silently proceeded without a
//      durable retry identity. The identity now lives in PostgreSQL —
//      browser storage is only a cache (the in-dialog retry pointer) and
//      is never the authority: after ANY browser/storage loss the
//      unresolved list recovers the exact prior operation, including its
//      stored execution result if it committed unseen.
//
// This hook is deliberately THIN: every durable decision is the server's
// (guarded state machine in the backend). The client only (a) registers a
// new operation per submit, (b) reuses the SAME server intent id while the
// dialog's operation is unresolved, and (c) drives the recovery banner
// from the server-owned unresolved list.
// =============================================================================

export function useRestockIntents(inventoryApi) {
    const [unresolved, setUnresolved] = useState([]);
    // The CURRENT dialog operation's server identity. This is a cache, not
    // the authority: lost on reload/termination by design — the recovery
    // banner re-derives the full state from the server.
    const [current, setCurrent] = useState(null);
    const currentRef = useRef(null);
    const _setCurrent = (v) => { currentRef.current = v; setCurrent(v); };

    const refresh = useCallback(async () => {
        try {
            const res = await inventoryApi.unresolvedRestockIntents();
            setUnresolved(res.intents ?? []);
        } catch {
            // Best-effort: if the recovery list cannot load, the restock
            // flow still works — the banner simply stays hidden until the
            // next refresh. Never block the page on recovery metadata.
        }
    }, [inventoryApi]);

    // Load the recovery list on mount: this is what makes the intent
    // survive page reloads, tab close and full browser termination.
    useEffect(() => { refresh(); }, [refresh]);

    // Register-or-reuse: a NEW submit registers a NEW server intent
    // (operation-level identity); a RETRY of the unresolved dialog
    // operation reuses the SAME server intent id, so the backend replays
    // the original operation instead of executing a duplicate.
    const intentFor = useCallback(async (itemId, qty) => {
        const cur = currentRef.current;
        if (cur && cur.intentId && cur.itemId === itemId && cur.qty === qty) {
            return cur.intentId;
        }
        const res = await inventoryApi.createRestockIntent(itemId, qty);
        const intentId = res.intent.id;
        _setCurrent({ intentId, itemId, qty });
        return intentId;
    }, [inventoryApi]);

    // The operation's outcome was OBSERVED (restock succeeded or replayed):
    // acknowledge exactly THIS intent — never a (item, qty) pair — so a late
    // success can never resolve a newer operation it does not own.
    const acknowledge = useCallback((intentId) => {
        if (currentRef.current?.intentId === intentId) _setCurrent(null);
        return inventoryApi.ackRestockIntent(intentId)
            .finally(() => { refresh(); });
    }, [inventoryApi, refresh]);

    // The operator abandoned the dialog operation: cancel exactly THIS
    // intent. The server REFUSES if the request actually executed (truth
    // wins) and the recovery banner then surfaces the committed operation —
    // the client never guesses.
    const abandon = useCallback((intentId) => {
        if (currentRef.current?.intentId === intentId) _setCurrent(null);
        return inventoryApi.cancelRestockIntent(intentId)
            .finally(() => { refresh(); });
    }, [inventoryApi, refresh]);

    // Retry a recovered PENDING intent verbatim: same item, same exact
    // quantity string, same server intent id → the backend replays it.
    const retry = useCallback((intent) =>
        inventoryApi.restock(intent.itemId, intent.quantity, intent.id)
            .then(() => inventoryApi.ackRestockIntent(intent.id))
            .then((res) => {
                // the retry RESOLVED the dialog operation: free the pointer
                // so the next submit registers a NEW operation.
                if (currentRef.current?.intentId === intent.id) _setCurrent(null);
                return res;
            })
            .finally(() => { refresh(); }), [inventoryApi, refresh]);

    return { unresolved, current, refresh, intentFor, acknowledge, abandon, retry };
}
