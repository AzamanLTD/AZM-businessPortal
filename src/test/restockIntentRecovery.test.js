import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// =============================================================================
// §r40.4 — SERVER-OWNED RESTOCK INTENT LIFECYCLE (portal side).
//
// The final audit rejected the client-derived identity model
// (getOrCreateRestockIntentKey: UUID in localStorage, keyed by
// (itemId, canonicalQuantity), cleared by (item, qty), 24h TTL). The
// portal hook is now a thin adapter over the SERVER-owned identity:
//
//   1. Every submit REGISTERS the operation on the server first; each
//      operation gets its own identity (two restocks of the same item and
//      quantity after resolution are two operations — never conflated).
//   2. Resolution is keyed by intent id ONLY: acknowledging one request's
//      outcome can never resolve a different, newer intent with the same
//      (item, qty).
//   3. There is NO TTL and NO browser-storage dependency: the retry
//      identity lives in PostgreSQL; after any storage loss the recovery
//      list is re-derived from the server.
//   4. Abandoning names the exact intent; the server decides safely if the
//      operation actually committed (truth wins).
// =============================================================================

// A minimal in-memory stand-in for the backend intent surface, faithful to
// the server's guarded state machine (see AZM-backend r40.4 proofs).
const makeApi = () => {
    const state = { seq: 0, intents: [] };
    const clone = () => state.intents
        .filter((i) => !i.acknowledged && !i.cancelled)
        .map((i) => ({ ...i }));
    return {
        state,
        unresolvedRestockIntents: vi.fn(async () => ({ intents: clone() })),
        createRestockIntent: vi.fn(async (itemId, quantity) => {
            const intent = { id: `srv-intent-${++state.seq}`, itemId, quantity, status: 'PENDING', executionResult: null };
            state.intents.push(intent);
            return { intent };
        }),
        ackRestockIntent: vi.fn(async (id) => {
            const i = state.intents.find((x) => x.id === id);
            if (!i) throw Object.assign(new Error('not found'), { code: 'RESTOCK_INTENT_NOT_FOUND' });
            if (i.status !== 'EXECUTED') throw Object.assign(new Error('not executed'), { code: 'RESTOCK_INTENT_NOT_EXECUTED' });
            i.acknowledged = true;
            return { intent: i };
        }),
        cancelRestockIntent: vi.fn(async (id) => {
            const i = state.intents.find((x) => x.id === id);
            if (!i) throw Object.assign(new Error('not found'), { code: 'RESTOCK_INTENT_NOT_FOUND' });
            if (i.status === 'EXECUTED') throw Object.assign(new Error('already executed'), { code: 'RESTOCK_INTENT_ALREADY_EXECUTED' });
            i.cancelled = true;
            return { intent: i };
        }),
        restock: vi.fn(async (itemId, quantity, idempotencyKey) => {
            const i = state.intents.find((x) => x.id === idempotencyKey);
            if (i) { i.status = 'EXECUTED'; i.executionResult = { itemId, quantity, operationId: `op-${idempotencyKey}` }; }
            return { ok: true, itemId, quantity, operationId: `op-${idempotencyKey}` };
        }),
    };
};

const mount = async (api) => {
    const { useRestockIntents } = await import('@/hooks/useRestockIntents');
    const hook = renderHook(() => useRestockIntents(api));
    await waitFor(() => expect(api.unresolvedRestockIntents).toHaveBeenCalled());
    return hook;
};

describe('r40.4 — server-owned restock intent lifecycle (portal hook)', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('1. a retried dialog operation reuses the SAME server identity (exactly-one registration)', async () => {
        const api = makeApi();
        const { result } = await mount(api);
        const k1 = await act(() => result.current.intentFor('item-1', '5'));
        // same dialog operation, submitted again (timeout + retry):
        // SAME id, exactly ONE server registration
        const k1Again = await act(() => result.current.intentFor('item-1', '5'));
        expect(k1Again).toBe(k1);
        expect(api.createRestockIntent).toHaveBeenCalledTimes(1);
        expect(result.current.current.intentId).toBe(k1);
    });

    it('2. two distinct same-item/same-qty purchases are TWO intents (never conflated)', async () => {
        const api = makeApi();
        const { result, unmount } = await mount(api);
        // first operation: register, execute, observe (acknowledge via retry)
        const k1 = await act(() => result.current.intentFor('item-1', '5'));
        await act(() => result.current.retry({ id: k1, itemId: 'item-1', quantity: '5' }));
        await waitFor(() => expect(result.current.current).toBe(null));
        // a SECOND restock of the same item and quantity after resolution:
        // registers a NEW server intent — a separate backend operation
        const k2 = await act(() => result.current.intentFor('item-1', '5'));
        expect(k2).not.toBe(k1);
        expect(api.createRestockIntent).toHaveBeenCalledTimes(2);
        unmount();
    });

    it('3. K1 late success can only resolve K1 — the (item, qty) conflation race is closed', async () => {
        const api = makeApi();
        const { result, unmount } = await mount(api);
        // K1 fires; its response never arrives (network loss) but the
        // backend eventually commits it → intent marked EXECUTED server-side
        const k1 = await act(() => result.current.intentFor('item-1', '5'));
        await act(() => api.restock('item-1', '5', k1));
        // K2: a newer, distinct restock of the SAME item+quantity
        await act(async () => { api.state.intents.push({ id: 'srv-intent-x', itemId: 'item-1', quantity: '5', status: 'PENDING', executionResult: null }); });
        // the browser finally observes K1's success: acknowledge K1 BY ID
        await act(() => result.current.acknowledge(k1));
        // K2 is COMPLETELY UNTOUCHED — still unresolved, still resolvable
        await waitFor(() => expect(result.current.unresolved.some((i) => i.id === 'srv-intent-x')).toBe(true));
        expect(result.current.unresolved.some((i) => i.id === k1)).toBe(false);
        unmount();
    });

    it('4. recovery is server-owned: an intent committed unseen survives reloads and browser storage loss', async () => {
        const api = makeApi();
        const first = await mount(api);
        const k1 = await act(() => first.result.current.intentFor('item-1', '5'));
        await act(() => api.restock('item-1', '5', k1)); // committed unseen
        first.unmount();

        // a fresh browser (storage empty — irrelevant: the identity lives in
        // PostgreSQL) still recovers the EXACT prior operation + its result
        const second = await mount(api);
        await waitFor(() => expect(second.result.current.unresolved.length).toBe(1));
        const recovered = second.result.current.unresolved[0];
        expect(recovered.id).toBe(k1);
        expect(recovered.status).toBe('EXECUTED');
        expect(recovered.executionResult.operationId).toBe(`op-${k1}`);
        // observed outcome → acknowledged → gone from the recovery list
        await act(() => second.result.current.acknowledge(k1));
        await waitFor(() => expect(second.result.current.unresolved.length).toBe(0));
        second.unmount();
    });

    it('5. abandoning cancels exactly that intent; the dialog operation survives, an executed one refuses (truth wins)', async () => {
        const api = makeApi();
        const { result, unmount } = await mount(api);
        const k1 = await act(() => result.current.intentFor('item-1', '5'));
        const k2 = await act(() => result.current.intentFor('item-2', '9'));
        await act(() => result.current.abandon(k1));
        await waitFor(() => expect(result.current.unresolved.some((i) => i.id === k1)).toBe(false));
        // K2 remains resolvable, and remains the dialog's current operation
        expect(result.current.unresolved.some((i) => i.id === k2)).toBe(true);
        expect(result.current.current?.intentId).toBe(k2);
        unmount();
    });

    it('6. retrying a recovered PENDING intent resends it VERBATIM (same id, same exact quantity string)', async () => {
        const api = makeApi();
        const first = await mount(api);
        const k1 = await act(() => first.result.current.intentFor('item-1', '12.50'));
        first.unmount();

        // fresh browser: recover the pending intent from the server
        const second = await mount(api);
        await waitFor(() => expect(second.result.current.unresolved.length).toBe(1));
        const recovered = second.result.current.unresolved[0];
        expect(recovered.id).toBe(k1);
        expect(recovered.quantity).toBe('12.50'); // exact decimal string, verbatim
        await act(() => second.result.current.retry(recovered));
        expect(api.restock).toHaveBeenCalledWith('item-1', '12.50', k1);
        expect(api.ackRestockIntent).toHaveBeenCalledWith(k1); // observed → acknowledged
        await waitFor(() => expect(second.result.current.unresolved.length).toBe(0));
        second.unmount();
    });

    it('8. §r40.5 two rapid submits share ONE pending registration — exactly one intent (P1)', async () => {
        // final-audit P1: intentFor is async; two clicks before the first
        // registration resolves must NOT mint two server intents.
        const api = makeApi();
        let release;
        const gate = new Promise((res) => { release = res; });
        // hold the first (and only) registration in flight
        api.createRestockIntent.mockImplementationOnce(() => gate.then(() => ({ intent: { id: 'srv-intent-1', status: 'PENDING' } })));
        const { result, unmount } = await mount(api);
        let ids;
        await act(async () => {
            const a = result.current.intentFor('item-1', '5');
            const b = result.current.intentFor('item-1', '5');
            release();
            ids = await Promise.all([a, b]);
        });
        expect(api.createRestockIntent).toHaveBeenCalledTimes(1); // ONE registration
        expect(ids[0]).toBe(ids[1]); // both callers receive the SAME id
        expect(ids[0]).toBe('srv-intent-1');
        expect(result.current.current.intentId).toBe('srv-intent-1');
        // a THIRD submit after resolution? current is set — reuses the same
        // operation identity (the dialog operation is still unresolved)
        const c = await act(() => result.current.intentFor('item-1', '5'));
        expect(c).toBe('srv-intent-1');
        expect(api.createRestockIntent).toHaveBeenCalledTimes(1);
        unmount();
    });

    it('9. §r40.5 the lock is per-(item, qty): a DIFFERENT concurrent operation still registers its own intent', async () => {
        const api = makeApi();
        const gates = [];
        api.createRestockIntent.mockImplementation(() => new Promise((res) => gates.push(res)));
        const { result, unmount } = await mount(api);
        let ids;
        await act(async () => {
            const a = result.current.intentFor('item-1', '5');
            const b = result.current.intentFor('item-2', '9'); // genuinely separate operation
            gates[0]({ intent: { id: 'srv-intent-a' } });
            gates[1]({ intent: { id: 'srv-intent-b' } });
            ids = await Promise.all([a, b]);
        });
        expect(api.createRestockIntent).toHaveBeenCalledTimes(2); // never globally deduped
        expect(ids[0]).toBe('srv-intent-a');
        expect(ids[1]).toBe('srv-intent-b');
        unmount();
    });

    it('7. the hook NEVER touches browser storage and has NO client TTL — the identity is server-owned', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useRestockIntents.js'), 'utf8');
        // prove the CODE (not the audit-history comments) is storage-free
        const source = raw.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
        expect(source).not.toContain('localStorage');
        expect(source).not.toContain('sessionStorage');
        expect(source).not.toMatch(/\bttl\b/i);
        expect(source).not.toContain('Date.now()'); // no client-side expiry ever
    });
});
