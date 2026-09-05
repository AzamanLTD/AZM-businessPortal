import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontStudioV2.jsx'), 'utf8');

describe('Studio V2 palette pointer insertion contract', () => {
  it('uses pointer events and does not expose the legacy HTML5 draggable palette path', () => {
    expect(source).toContain('onPointerDown');
    expect(source).toContain("window.addEventListener('pointermove'");
    expect(source).toContain("window.addEventListener('pointerup'");
    expect(source).toContain("window.addEventListener('pointercancel'");
    expect(source).toContain('setPointerCapture');
    expect(source).toContain('document.elementFromPoint');
    expect(source).toContain('insertPaletteNode');
    expect(source).toContain('suppressClickRef');
    expect(source).not.toContain('draggable');
    expect(source).not.toContain('onDragStart');
  });
});
