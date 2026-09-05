import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StorefrontPhonePreview canvas insertion contract', () => {
  it('exposes pointer-safe drop targets and preserves insertion callback wiring', () => {
    const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');
    expect(source).toContain('onDropTile');
    expect(source).toContain('data-studio-drop-target="true"');
    expect(source).toContain("event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'");
    expect(source).toContain('onDropTile(target.tileId, target.edge, target.type)');
  });
});
