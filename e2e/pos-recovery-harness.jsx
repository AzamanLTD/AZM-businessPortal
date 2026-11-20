// e2e/pos-recovery-harness.jsx
// =============================================================================
// WP-K closure — REAL browser harness for the POS cashier recovery panel.
//
// Mounts the production PendingSalesPanel over the production localStorage
// outbox key, so a reload genuinely exercises the durability path a cashier
// hits after a crash or restart: the queued sale must still be there, still be
// listed, and still be resolvable — never silently dropped, never re-charged.
// =============================================================================
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PendingSalesPanel, OUTBOX_KEY } from '../src/pages/POS.jsx';
import { resolveOutboxItem, resolvedOutboxHistory } from '../src/lib/posSaleOutcome.js';
import { classifySyncFailure } from '../src/lib/posSaleOutcome.js';

const readOutbox = () => {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch { return []; }
};
const writeOutbox = (items) => localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));

function Harness() {
    const [items, setItems] = useState(() => readOutbox());

    // The panel reads from the same store a real reload reads from.
    useEffect(() => {
        const onStorage = () => setItems(readOutbox());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Resolution goes through the production helper: the record is archived
    // with its reason, never spliced out of storage.
    const resolve = (id, note) => {
        const next = resolveOutboxItem(readOutbox(), id, { note });
        writeOutbox(next);
        setItems(next);
    };

    const seed = () => {
        const box = readOutbox();
        box.push({
            type: 'CREATE_ORDER',
            id: 'sale-1',
            ts: Date.now(),
            status: 'NEEDS_ATTENTION',
            retryCount: 3,
            lastError: 'Azaman POS settlement is not enabled',
            payload: { items: [{ id: 'p1', qty: 2 }], paymentMethod: 'CASH' },
        });
        writeOutbox(box);
        setItems(box);
    };

    const failOnce = () => {
        const next = readOutbox().map((i) => ({ ...classifySyncFailure(i), lastError: 'network lost' }));
        writeOutbox(next);
        setItems(next);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#111' }}>
            <div style={{ padding: 16, display: 'flex', gap: 8 }}>
                <button data-testid="seed-sale" onClick={seed}>Seed queued sale</button>
                <button data-testid="fail-sync" onClick={failOnce}>Simulate failed sync</button>
            </div>
            <PendingSalesPanel
                items={items.filter((i) => i.status === 'NEEDS_ATTENTION')}
                history={resolvedOutboxHistory(items)}
                onResolve={resolve}
            />
        </div>
    );
}

createRoot(document.getElementById('root')).render(<Harness />);
