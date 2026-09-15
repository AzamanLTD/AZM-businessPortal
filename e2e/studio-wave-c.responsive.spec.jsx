// e2e/studio-wave-c.responsive.spec.jsx
// =============================================================================
// Wave C rendered acceptance — REAL browser evidence (headless Chromium via
// the Vite dev server), responsive/token half:
//
//   E — responsive relayout: the real viewport buttons drive emulator/frame
//       geometry and the rendered product-grid column count; the persisted
//       document object stays byte-identical through the relayout.
//   F — device geometry is token-driven and the transform scaling layer
//       creates no unexpected scroll owner; clipping stays at the frame layer.
//
// The scroll/clipping/containment half lives in studio-wave-c.scroll.spec.jsx.
// =============================================================================

// =============================================================================

import { test, expect } from '@playwright/test';
import { STOREFRONT_STUDIO_TOKENS } from '../src/lib/storefrontStudioTokens.js';

const devices = STOREFRONT_STUDIO_TOKENS.studio.previewDevices;
const phoneFrameWidth = 220; // devices.phone.displayWidthPx
const phoneFrameHeight = devices.phone.heightDp * STOREFRONT_STUDIO_TOKENS.PREVIEW_SCALE;

const FRAME = '[data-testid="studio-device-frame"]';
const SCROLL_VIEWPORT = '[data-testid="studio-device-scroll-viewport"]';
const EMULATOR = '[data-testid="studio-device-emulator"]';

async function openHarness(page) {
  await page.goto('http://localhost:5188/e2e/studio-harness.html');
  await expect(page.locator(FRAME)).toBeVisible();
}

// All geometry is measured inside the live page so every assertion below is
// real rendered layout, never source strings.
const measure = (page, expression) => page.evaluate(`(${expression})()`);

const FRAME_HELPERS = `
  () => {
    const frame = document.querySelector('${FRAME}');
    const scrollViewport = document.querySelector('${SCROLL_VIEWPORT}');
    const emulator = document.querySelector('${EMULATOR}');
    const main = document.querySelector('main');
    const rectOf = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, x: r.x, y: r.y };
    };
    return { frame, scrollViewport, emulator, main, rectOf };
  }
`;

test.describe('E — responsive relayout through the real viewport control path', () => {
  test('the real viewport buttons change rendered geometry and grid columns; the persisted document is untouched', async ({ page }) => {
    await openHarness(page);

    const snapshot = await measure(page, `() => JSON.stringify(window.__studioFixtureDraft)`);
    const gridColumns = () => measure(page, `() => {
      const frame = document.querySelector('${FRAME}');
      const grid = frame.querySelector('[style*="grid-template-columns"]');
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    }`);

    // Phone: responsive intent 1 column.
    await expect.poll(gridColumns).toBe(1);
    let emulator = await measure(page, `() => {
      const r = document.querySelector('${EMULATOR}').getBoundingClientRect();
      const e = document.querySelector('${EMULATOR}');
      return { viewport: e.getAttribute('data-viewport'), width: r.width };
    }`);
    expect(emulator.viewport).toBe('phone');
    expect(emulator.width).toBeCloseTo(devices.phone.displayWidthPx, 0);

    // Tablet: rendered layout becomes 2 columns.
    await page.click('[title="Tablet preview"]');
    await expect.poll(gridColumns).toBe(2);
    emulator = await measure(page, `() => {
      const r = document.querySelector('${EMULATOR}').getBoundingClientRect();
      return { width: r.width };
    }`);
    expect(emulator.width).toBeCloseTo(devices.tablet.displayWidthPx, 0);

    // Desktop: rendered layout becomes 4 columns.
    await page.click('[title="Desktop preview"]');
    await expect.poll(gridColumns).toBe(4);
    emulator = await measure(page, `() => {
      const r = document.querySelector('${EMULATOR}').getBoundingClientRect();
      return { width: r.width };
    }`);
    expect(emulator.width).toBeCloseTo(devices.desktop.displayWidthPx, 0);

    // Back to phone: the rendered layout returns to the phone intent.
    await page.click('[title="Phone preview"]');
    await expect.poll(gridColumns).toBe(1);

    // Persisted document is byte-identical after resolving every breakpoint.
    const after = await measure(page, `() => JSON.stringify(window.__studioFixtureDraft)`);
    expect(after).toBe(snapshot);
  });
});

test.describe('F — token-driven geometry, scaling creates no second scroll owner', () => {
  test('frame geometry matches the frozen tokens and the scale transform layer stays scroll-free', async ({ page }) => {
    await openHarness(page);

    // Phone geometry is token-derived (PREVIEW_SCALE applied to the measured Flutter device).
    const phoneGeom = await measure(page, `() => {
      const frame = document.querySelector('${FRAME}');
      const r = frame.getBoundingClientRect();
      return { width: r.width, height: r.height };
    }`);
    expect(phoneGeom.width).toBeCloseTo(phoneFrameWidth, 1);
    expect(phoneGeom.height).toBeCloseTo(phoneFrameHeight, 1);

    // Desktop: the emulator and frame scale exactly by the token ratio, and
    // the scale transform lives on the wrapper that owns no scroll/clip.
    await page.click('[title="Desktop preview"]');
    await expect
      .poll(() => measure(page, `() => document.querySelector('${EMULATOR}').getAttribute('data-viewport')`))
      .toBe('desktop');

    const audit = await measure(page, `(async () => {
      const { frame, scrollViewport, emulator, main } = (${FRAME_HELPERS})();
      const expectedScale = ${devices.desktop.displayWidthPx} / ${phoneFrameWidth};
      const transformWrapper = scrollViewport.firstElementChild;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(transformWrapper).transform);
      const allowed = new Set([frame, scrollViewport, main]);
      const unexpectedOwners = [];
      let el = frame.parentElement;
      while (el && el !== document.documentElement) {
        const cs = getComputedStyle(el);
        const scrollableY = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1;
        const scrollableX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1;
        if (!allowed.has(el) && (scrollableY || scrollableX)) {
          unexpectedOwners.push({ tag: el.tagName, cls: el.className && String(el.className).slice(0, 40), testid: el.getAttribute('data-testid') });
        }
        el = el.parentElement;
      }
      const frameRect = frame.getBoundingClientRect();
      return {
        wrapperScaleX: matrix.a,
        expectedScale,
        wrapperOverflow: getComputedStyle(transformWrapper).overflow,
        unexpectedOwners,
        frameWidth: frameRect.width,
        scrollViewportOverflow: { x: getComputedStyle(scrollViewport).overflowX, y: getComputedStyle(scrollViewport).overflowY },
        mainOverflowY: getComputedStyle(main).overflowY,
      };
    })`);

    expect(audit.wrapperScaleX).toBeCloseTo(audit.expectedScale, 2); // scaling is token-driven at the transform layer
    expect(audit.wrapperOverflow).toBe('visible'); // the scaled wrapper neither clips nor scrolls
    expect(audit.frameWidth).toBeCloseTo(devices.desktop.displayWidthPx, 1);
    expect(audit.scrollViewportOverflow).toEqual({ x: 'hidden', y: 'auto' }); // bounded emulation window, by design
    expect(audit.mainOverflowY).toBe('auto'); // Studio's own outer region, by design
    expect(audit.unexpectedOwners).toEqual([]); // no second scroll owner anywhere between frame and page
  });
});
