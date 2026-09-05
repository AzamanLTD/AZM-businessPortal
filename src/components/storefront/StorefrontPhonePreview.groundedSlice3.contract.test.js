import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { STOREFRONT_STUDIO_TOKENS } from '@/lib/storefrontStudioTokens';

const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');

function functionBody(name) {
  const start = source.indexOf(`function ${name}`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

describe('Storefront Wave A grounded renderer slice 3', () => {
  it('routes Promo Banner, Social Feed and Live Stats geometry through shared helpers', () => {
    expect(source).toContain('const promoPx = (name) => px(previewTokens.promo[name]);');
    expect(source).toContain('const socialPx = (name) => px(previewTokens.social[name]);');
    expect(source).toContain('const liveStatsPx = (name) => px(previewTokens.liveStats[name]);');

    for (const renderer of ['PromoBanner', 'SocialFeed', 'LiveStats']) {
      const body = functionBody(renderer);
      expect(body).not.toMatch(/(?:height|width|fontSize|borderRadius|gap|margin(?:Top|Right|Bottom|Left)?|padding(?:Top|Right|Bottom|Left)?):\s*\d+(?:\.\d+)?\b/);
      expect(body).not.toMatch(/padding:\s*['"]\d/);
      expect(body).not.toMatch(/margin:\s*['"]\d/);
    }
  });

  it('uses the grounded token groups without scaling categorical counts', () => {
    expect(source).toContain('gridTemplateColumns: `repeat(${previewTokens.social.gridCrossAxisCount}, 1fr)`');
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.promo.titleFontSizeDp).toBe(18);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.social.gridCrossAxisCount).toBe(2);
    expect(STOREFRONT_STUDIO_TOKENS.studio.preview.liveStats.labelFontSizeDp).toBe(11);
  });
});
