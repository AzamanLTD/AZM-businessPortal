import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from '@/lib/storefrontStudioTokens';

const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');

function functionBody(name) {
  const start = source.indexOf(`function ${name}`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

describe('Storefront Wave A token slice', () => {
  it('routes the first renderer slice through preview tokens and toPreviewPx', () => {
    expect(source).toContain('const px = (value) => toPreviewPx(value);');
    for (const renderer of ['HeroHeader', 'QuickInfoBar', 'ProductGrid', 'ReviewCarousel', 'ContactCard']) {
      expect(functionBody(renderer)).not.toMatch(/\b\d+(?:\.\d+)?px\b/);
    }
  });

  it('preserves Flutter-grounded foundation values', () => {
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.hero.heightDp).toEqual({ compact: 140, standard: 200, tall: 260 });
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.hero.sideInsetDp).toBe(20);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.hero.bottomInsetDp).toBe(16);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.hero.titleBottomGapDp).toBe(4);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.quickInfo.horizontalPaddingDp).toBe(16);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.quickInfo.verticalPaddingDp).toBe(10);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.quickInfo.itemGapDp).toBe(10);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.quickInfo.runGapDp).toBe(6);
    expect(toPreviewPx(412)).toBeCloseTo(220);
  });
});
