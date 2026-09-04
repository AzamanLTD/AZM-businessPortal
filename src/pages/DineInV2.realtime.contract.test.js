import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('dine-in realtime/location/currency contract', () => {
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

  it('keeps USDC authoritative while exposing a live GHS display layer', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/DineInV2.jsx'),
      'utf8',
    );

    expect(source).toContain("import { useFxRate } from '../hooks/useFxRate';");
    expect(source).toContain("Settlement currency: <strong className=\"text-[var(--text-1)]\">USDC</strong> · Local display: <strong className=\"text-[var(--text-1)]\">GHS</strong>");
    expect(source).toContain('fx.isUsable ? `1 USDC ≈ GH₵ ${Number(fx.ghsPerUsdc).toFixed(2)} · ${fx.source} · refresh in ${fx.remainingSeconds}s`');
    expect(source).toContain("Live GHS rate temporarily unavailable · USDC remains authoritative");
    expect(source).toContain('return `${usdc} · GH₵ ${(Number(usdc) * currentGhsPerUsdc).toFixed(2)}`;');
  });
});
