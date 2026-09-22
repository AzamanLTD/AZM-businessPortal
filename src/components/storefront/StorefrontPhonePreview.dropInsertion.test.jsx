import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StorefrontPhonePreview canvas insertion contract', () => {
  it('exposes a palette drop target callback and before/after indicator', () => {
    const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');
    expect(source).toContain('onDropTile');
    expect(source).toContain("event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'");
    expect(source).toContain('onDropTile(target.tileId, target.edge, target.type)');
  });
});
