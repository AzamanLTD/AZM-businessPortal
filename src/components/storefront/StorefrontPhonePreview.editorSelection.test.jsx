import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StorefrontPhonePreview editor selection contract', () => {
  it('exposes editor selection props and keyboard activation', () => {
    const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');
    expect(source).toContain('selectedTileId, onSelectTile, editorMode = false');
    expect(source).toContain("onSelectTile?.(tile.id)");
    expect(source).toContain("event.key === 'Enter'");
  });
});
