import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

describe('Studio wave acceptance contracts', () => {
  it('requires tokenized phone-preview geometry and bounded scrolling', () => {
    const source = read('src/components/storefront/StorefrontPhonePreview.jsx');
    expect(source).toContain('toPreviewPx');
    expect(source).toContain('data-testid="studio-phone-frame"');
    expect(source).toContain("overflowY: 'auto'");
    expect(source).not.toMatch(/style=\{\{[^}]*\b\d+(?:\.\d+)?px\b/s);
    expect(source).toContain('retail_collection_box: RetailCollectionBoxPreview');
  });

  it('requires pointer palette insertion on Studio V2 surfaces', () => {
    const source = read('src/components/storefront/StorefrontStudioV2.jsx');
    expect(source).toContain('onPointerDown');
    expect(source).toContain('pointermove');
    expect(source).toContain('pointerup');
    expect(source).toContain('insertPaletteNode');
    expect(source).not.toContain('draggable');
  });
});
