import { describe, expect, it } from 'vitest';
import { STOREFRONT_STUDIO_TOKENS } from '@/lib/storefrontStudioTokens';
import { normalizeStudioViewport } from '@/lib/storefrontStudioResponsive';

describe('Storefront Studio device emulation contract', () => {
  it('keeps measured Flutter geometry separate from Studio display presets', () => {
    const { device, studio, PREVIEW_SCALE } = STOREFRONT_STUDIO_TOKENS;
    expect(device.phone).toEqual({ widthDp: 412, heightDp: 892 });
    expect(studio.previewDevices.phone).toEqual({ widthDp: 412, heightDp: 892, displayWidthPx: 220 });
    expect(studio.previewDevices.tablet.displayWidthPx).toBeGreaterThan(studio.previewDevices.phone.displayWidthPx);
    expect(studio.previewDevices.desktop.displayWidthPx).toBeGreaterThan(studio.previewDevices.tablet.displayWidthPx);
    expect(Math.round(device.phone.heightDp * PREVIEW_SCALE)).toBe(476);
  });

  it('keeps unsupported viewport values on the safe phone fallback', () => {
    expect(normalizeStudioViewport('watch')).toBe('phone');
    expect(deviceViewportWidth('phone')).toBe(220);
  });
});

function deviceViewportWidth(viewport) {
  return STOREFRONT_STUDIO_TOKENS.studio.previewDevices[normalizeStudioViewport(viewport)].displayWidthPx;
}
