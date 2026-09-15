import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StorefrontPhonePreview from './StorefrontPhonePreview';

vi.mock('@/components/instrument', () => ({
  Card: ({ className, children }) => <div className={className || ''} data-card="true">{children}</div>,
}));

// Real-Chromium evidence (Playwright, PR: browser Wave C suite) proved that a
// unitless length inside a CSS shorthand invalidates the WHOLE declaration in
// real browsers (JSDOM happily accepts it). These regressions lock the four
// shorthand families that were shipped unitless and silently dropped:
// gallery flex-basis, pin/badge box shadows, promo CTA padding, identity
// and tile borders — plus the editor-mode frame-chrome contract.
function makeTiles() {
  return [
    { id: 'gallery-1', widgetType: 'showcase_gallery', position: { row: 0, col: 0, colSpan: 4, rowSpan: 2 }, props: { title: 'Gallery' } },
    { id: 'location-1', widgetType: 'location_map', position: { row: 2, col: 0, colSpan: 4, rowSpan: 2 }, props: {} },
    { id: 'promo-1', widgetType: 'promo_banner', position: { row: 4, col: 0, colSpan: 4, rowSpan: 2 }, props: { title: 'Promo', subtitle: 'Sub', ctaText: 'Learn more' } },
  ];
}

function renderPreview({ editorMode = false } = {}) {
  return render(
    <StorefrontPhonePreview
      draft={{ layoutJson: { tiles: makeTiles() } }}
      theme={{ name: 'Test', tokenSet: {} }}
      widgets={[]}
      business={{ name: 'Test Business' }}
      businessType="GENERAL"
      editorMode={editorMode}
    />,
  );
}

const styled = (root, predicate) => Array.from(root.querySelectorAll('div')).filter(predicate);
const LENGTH = /^\d+(\.\d+)?px$/;

describe('StorefrontPhonePreview CSS shorthand units (real-browser regression)', () => {
  it('emits unit-suffixed flex-basis values on the showcase gallery cards', () => {
    const { container } = renderPreview();
    const frame = screen.getByTestId('studio-device-frame');
    const cards = styled(frame, (el) => el.style.flex && el.style.flex.startsWith('0 0 '));
    expect(cards.length).toBeGreaterThanOrEqual(3); // hero card + 2 secondary cards
    for (const card of cards) {
      const basis = card.style.flex.split(' ')[2];
      expect(basis).toMatch(LENGTH); // '74.75' (unitless) is invalid CSS in real browsers
    }
  });

  it('emits unit-suffixed box-shadow lengths on the location pin and badge', () => {
    const { container } = renderPreview();
    const frame = screen.getByTestId('studio-device-frame');
    const shadows = styled(frame, (el) => el.style.boxShadow !== '');
    expect(shadows.length).toBeGreaterThanOrEqual(2); // map pin + "View on Maps" badge
    for (const el of shadows) {
      // Every shadow component length must carry its unit, or the whole
      // declaration is dropped by real browsers.
      for (const token of el.style.boxShadow.split(/\s+/)) {
        // A bare `0` is a legal unitless length; any other bare number invalidates the declaration.
        if (/^\d/.test(token) && token !== '0') expect(token).toMatch(LENGTH);
      }
    }
  });

  it('emits unit-suffixed shorthand padding on the promo CTA chip', () => {
    renderPreview();
    const frame = screen.getByTestId('studio-device-frame');
    const cta = styled(frame, (el) => el.style.padding && el.style.padding.includes(' ')).at(-1);
    expect(cta).toBeTruthy();
    for (const token of cta.style.padding.split(/\s+/)) {
      expect(token).toMatch(LENGTH);
    }
  });

  it('emits unit-suffixed border-bottom widths on the identity strip and tiles', () => {
    renderPreview();
    const frame = screen.getByTestId('studio-device-frame');
    const borders = styled(frame, (el) => el.style.borderBottom !== '');
    expect(borders.length).toBeGreaterThanOrEqual(4); // identity strip + 3 tile borders
    for (const el of borders) {
      const width = el.style.borderBottom.split(' ')[0];
      expect(width).toMatch(LENGTH);
    }
  });
});

describe('StorefrontPhonePreview frame chrome contract', () => {
  it('mounts the device frame bare in editor mode so the frame is the clip/scroll owner', () => {
    const { container } = renderPreview({ editorMode: true });
    const frame = screen.getByTestId('studio-device-frame');
    // The frame itself is the rendered root — no Card padding chrome shifting
    // the clip layer off the bounded emulation viewport.
    expect(frame.parentElement).toBe(container.firstChild.parentElement ?? frame.parentElement);
    expect(frame.closest('[data-card]')).toBeNull();
  });

  it('keeps the Card chrome for the standalone preview panel outside editor mode', () => {
    renderPreview({ editorMode: false });
    const frame = screen.getByTestId('studio-device-frame');
    expect(frame.closest('[data-card]')).not.toBeNull();
  });
});
