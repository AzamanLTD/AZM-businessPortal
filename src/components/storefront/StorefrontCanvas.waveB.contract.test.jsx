import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StorefrontCanvas Wave B interaction contract', () => {
  it('uses pointer capture and deterministic drag primitives', () => {
    const source = fs.readFileSync(
      path.resolve('src/components/storefront/StorefrontCanvas.jsx'),
      'utf8',
    );

    expect(source).toContain('setPointerCapture?.(e.pointerId)');
    expect(source).toContain('onPointerMove={handlePointerMove}');
    expect(source).toContain('onPointerCancel={handlePointerCancel}');
    expect(source).toContain('connectedGroupIds(');
    expect(source).toContain('magneticSnap(');
    expect(source).toContain('settleDurationMs');
    expect(source).toContain('transition: isDragging ? \'none\'');
  });

  it('does not register global mousemove/mouseup listeners for editor dragging', () => {
    const source = fs.readFileSync(
      path.resolve('src/components/storefront/StorefrontCanvas.jsx'),
      'utf8',
    );

    expect(source).not.toContain("window.addEventListener('mousemove'");
    expect(source).not.toContain("window.addEventListener('mouseup'");
  });
});
