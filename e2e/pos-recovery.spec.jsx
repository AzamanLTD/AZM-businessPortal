// e2e/pos-recovery.spec.jsx
// =============================================================================
// WP-K closure — POS cashier recovery, in a REAL browser (headless Chromium via
// the Vite dev server). JSDOM cannot prove this: the contract is durability
// across a page reload and across a browser restart, plus explicit resolution.
//
//   1. A queued sale survives a RELOAD (new document, same localStorage).
//   2. A queued sale survives a full browser RESTART (new context backed by a
//      copied storage state — the closest headless equivalent of closing and
//      reopening the till browser).
//   3. Repeated sync failure parks the sale as NEEDS_ATTENTION, never drops it.
//   4. Resolution is explicit: only "Mark resolved" removes it, and only that
//      item.
// =============================================================================
import { test, expect } from '@playwright/test';

const HARNESS = 'http://localhost:5188/e2e/pos-recovery-harness.html';
const OUTBOX_KEY = 'az_pos_outbox';
const PANEL = 'text=/queued sale\\(s\\) Azaman did not record/';

test('a queued sale survives a page reload and stays resolvable', async ({ page }) => {
    await page.goto(HARNESS);
    await page.getByTestId('seed-sale').click();
    await expect(page.locator(PANEL)).toBeVisible();
    await expect(page.locator('text=Resolve…')).toBeVisible();

    // Reload: a new document reading the same durable store.
    await page.reload();
    await expect(page.locator(PANEL)).toBeVisible();
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), OUTBOX_KEY);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('sale-1');
});

test('a queued sale survives a full browser restart', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto(HARNESS);
    await page1.getByTestId('seed-sale').click();
    await expect(page1.locator(PANEL)).toBeVisible();
    const state = await context1.storageState();
    await context1.close();

    // Restart: brand-new context seeded with the previous storage state.
    const context2 = await browser.newContext({ storageState: state });
    const page2 = await context2.newPage();
    await page2.goto(HARNESS);
    await expect(page2.locator(PANEL)).toBeVisible();
    const stored = await page2.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), OUTBOX_KEY);
    expect(stored).toHaveLength(1);
    await context2.close();
});

test('repeated sync failure parks the sale for attention, never drops it', async ({ page }) => {
    await page.goto(HARNESS);
    await page.getByTestId('seed-sale').click();
    await page.getByTestId('fail-sync').click();
    await expect(page.locator(PANEL)).toBeVisible();
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), OUTBOX_KEY);
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('NEEDS_ATTENTION');
    expect(stored[0].retryCount).toBeGreaterThanOrEqual(3);
});

test('resolution archives the sale with its reason and keeps both records', async ({ page }) => {
    await page.goto(HARNESS);
    await page.evaluate((k) => {
        localStorage.setItem(k, JSON.stringify([
            { type: 'CREATE_ORDER', id: 'sale-a', ts: Date.now(), status: 'NEEDS_ATTENTION', retryCount: 3, payload: { items: [{ id: 'x', qty: 1 }] } },
            { type: 'CREATE_ORDER', id: 'sale-b', ts: Date.now(), status: 'NEEDS_ATTENTION', retryCount: 3, payload: { items: [] } },
        ]));
    }, OUTBOX_KEY);
    await page.reload();

    // Resolution is a recorded decision: the panel asks for a reason.
    page.once('dialog', (d) => d.accept('cash taken at the counter'));
    await expect(page.locator('text=Resolve…').first()).toBeVisible();
    await page.locator('text=Resolve…').first().click();

    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), OUTBOX_KEY);
    // NOTHING is deleted: both financial records survive.
    expect(stored).toHaveLength(2);
    const resolved = stored.find((i) => i.status === 'RESOLVED');
    const open = stored.find((i) => i.status === 'NEEDS_ATTENTION');
    expect(resolved).toBeTruthy();
    expect(open).toBeTruthy();
    expect(resolved.resolvedNote).toBe('cash taken at the counter');
    expect(resolved.resolution).toBe('CASHIER_RESOLVED_NO_AZAMAN_ORDER');
    expect(resolved.payload).toEqual({ items: [{ id: 'x', qty: 1 }] });
    expect(resolved.ts).toBeGreaterThan(0);

    // The resolved record stays inspectable in the history section.
    await expect(page.locator('text=/Resolved history \\(1\\)/')).toBeVisible();
});
