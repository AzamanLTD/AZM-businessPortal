import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('RetailCollectionBoxPreview contract', () => {
  it('uses the shared measured token scale and mirrors retail product fields', () => {
    const source = fs.readFileSync(
      path.resolve('src/components/storefront/RetailCollectionBoxPreview.jsx'),
      'utf8',
    );

    expect(source).toContain("STOREFRONT_STUDIO_TOKENS.layout.retailCollection");
    expect(source).toContain('toPreviewPx(retailTokens.rowHeightDp)');
    expect(source).toContain('toPreviewPx(retailTokens.cardWidthDp)');
    expect(source).toContain('product?.priceUsdc');
    expect(source).toContain('product.imageUrls?.[0]');
    expect(source).toContain("product.available !== false && product.isActive !== false");
    expect(source).toContain('slice(0, 6)');
  });
});
