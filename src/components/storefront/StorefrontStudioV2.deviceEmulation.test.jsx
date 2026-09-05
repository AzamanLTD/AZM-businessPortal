import { describe, expect, it } from 'vitest';
import { STOREFRONT_STUDIO_TOKENS } from '@/lib/storefrontStudioTokens';
import { normalizeStudioViewport } from '@/lib/storefrontStudioResponsive';

describe('Storefront Studio device emulation contract', () => {
  it('keeps explicit phone/tablet/desktop presets grounded in the shared device tokens', () => {
    const { device, PREVIEW_SCALE } = STOREFRONT_STUDIO_TOKENS;
    expect(device.phone).toEqual(expect.objectContaining({ widthDp: 412, heightDp: 892, displayWidthPx: 220 }));
    expect(device.tablet.displayWidthPx).toBeGreaterThan(device.phone.displayWidthPx);
    expect(device.desktop.displayWidthPx).toBeGreaterThan(device.tablet.displayWidthPx);
    expect(Math.round(device.phone.heightDp * PREVIEW_SCALE)).toBe(476);
  });

  it('keeps unsupported viewport values on the safe phone fallback', () => {
    expect(normalizeStudioViewport('watch')).toBe('phone');
    expect(deviceViewportWidth('phone')).toBe(220);
  });
});

function deviceViewportWidth(viewport) {
  return STOREFRONT_STUDIO_TOKENS.device[normalizeStudioViewport(viewport)].displayWidthPx;
}
