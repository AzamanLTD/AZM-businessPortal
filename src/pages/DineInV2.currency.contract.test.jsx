import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('dine-in currency display contract', () => {
  it('labels USDC-backed dine-in amounts as USDC, never GHS', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/DineInV2.jsx'),
      'utf8',
    );

    expect(source).toContain('USDC {money(tab.grandTotalUsdc || tab.subtotalUsdc)}');
    expect(source).toContain('USDC {money(product.priceUsdc)}');
    expect(source).toContain('USDC {money(item.unitPriceUsdc)}');
    expect(source).toContain('USDC {money(item.lineTotalUsdc)}');
    expect(source).toContain('Service Tip (USDC)');
    expect(source).toContain('USDC {money(activeTabDetails?.subtotalUsdc)}');
    expect(source).not.toContain('GHS ');
  });
});
