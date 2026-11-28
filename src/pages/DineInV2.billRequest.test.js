import { describe, expect, it, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Dine-in floor screen: the open-tabs list.
// GET /api/dine-in/tabs answers { success, tabs }, each tab with
// billRequestedAt when its table asked for the bill (AZM-backend
// fix/staff-followups). The page kept the whole answer as its list, so with
// any open tab .map threw.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({ request: vi.fn() }));
vi.mock('@/lib/marketplaceApi', () => ({ marketplaceApi: {}, default: {} }));

const { openTabsFrom, byBillRequest } = await import('./DineInV2');

describe('open tabs', () => {
  it('reads the list out of { success, tabs }, and older shapes', () => {
    expect(openTabsFrom({ success: true, tabs: [{ id: 'a' }] })).toEqual([{ id: 'a' }]);
    expect(openTabsFrom({ data: [{ id: 'b' }] })).toEqual([{ id: 'b' }]);
    expect(openTabsFrom([{ id: 'c' }])).toEqual([{ id: 'c' }]);
    expect(openTabsFrom({ success: true })).toEqual([]);
    expect(openTabsFrom(null)).toEqual([]);
  });

  it('tables that asked for the bill come first, longest waiting first', () => {
    const tabs = [
      { id: 'quiet' },
      { id: 'asked-late', billRequestedAt: '2026-11-28T19:05:00Z' },
      { id: 'asked-early', billRequestedAt: '2026-11-28T19:01:00Z' },
      { id: 'quiet-2' },
    ];
    expect(byBillRequest(tabs).map((t) => t.id)).toEqual(['asked-early', 'asked-late', 'quiet', 'quiet-2']);
  });
});
