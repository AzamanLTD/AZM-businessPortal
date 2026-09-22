import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontStudioV2.jsx'), 'utf8');

function scrollViewportBody() {
  const marker = 'data-testid="studio-device-scroll-viewport"';
  const start = source.indexOf(marker);
  const end = source.indexOf('</div>', start);
  return source.slice(start, end < 0 ? source.length : end);
}

describe('Studio V2 device scroll viewport', () => {
  it('keeps scrolling at the bounded emulator boundary', () => {
    const body = scrollViewportBody();
    expect(body).toContain('data-testid="studio-device-scroll-viewport"');
    expect(body).toContain("overflowY: 'auto'");
    expect(body).toContain("overflowX: 'hidden'");
    expect(body).toContain("overscrollBehavior: 'contain'");
    expect(body).toContain("WebkitOverflowScrolling: 'touch'");
  });

  it('preserves the transformed phone content inside the scroll viewport', () => {
    const marker = 'data-testid="studio-device-scroll-viewport"';
    const start = source.indexOf(marker);
    const contentStart = source.indexOf('transform: `scale(${scale})`', start);
    expect(contentStart).toBeGreaterThan(start);
    expect(source.slice(start, contentStart)).toContain('overflowY: \'auto\'');
  });
});
