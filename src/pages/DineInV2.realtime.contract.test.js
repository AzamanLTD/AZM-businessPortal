import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('dine-in realtime/location contract', () => {
  it('keeps selected-tab menu scope independent from the create-form location state', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/DineInV2.jsx'),
      'utf8',
    );

    expect(source).toContain("const [selectedTabLocationId, setSelectedTabLocationId] = useState('');");
    expect(source).toContain("const menuLocationId = selectedTabId");
    expect(source).toContain("(selectedTabLocationId || activeTabDetails?.locationId || selectedTabSummary?.locationId || '')");
    expect(source).toContain("setSelectedTabLocationId(createdTab.locationId || '')");
    expect(source).toContain("setSelectedTabLocationId(tab.locationId || '')");
    expect(source).not.toContain("setNewTabLocationId(activeTabDetails.locationId)");
  });

  it('keys the product query by the resolved selected-tab location', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/DineInV2.jsx'),
      'utf8',
    );

    expect(source).toContain("queryKey: ['dineInProducts', menuLocationId]");
    expect(source).toContain("...(menuLocationId ? { locationId: menuLocationId } : {})");
  });
});
