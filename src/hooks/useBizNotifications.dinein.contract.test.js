import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('business dine-in realtime projection contract', () => {
  it('invalidates both legacy and DineInV2 query roots for lifecycle events', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/useBizNotifications.js'),
      'utf8',
    );

    expect(source).toContain("'DINE_IN_TAB_OPENED'");
    expect(source).toContain("'DINE_IN_TAB_FINALIZED'");
    expect(source).toContain("'DINE_IN_TAB_PAID'");
    expect(source).toContain("invalidateRoots('dine-in', 'dine-in-tabs', 'openTabs', 'dineInTab')");
  });
});
