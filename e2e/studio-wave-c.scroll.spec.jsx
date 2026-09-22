// e2e/studio-wave-c.scroll.spec.jsx
// =============================================================================
// Wave C rendered acceptance — REAL browser evidence (headless Chromium via
// the Vite dev server), scroll/clip/containment half. JSDOM has no layout
// engine, so every criterion here is established by real rendered geometry,
// real hit-testing and real wheel interactions:
//
//   A + B — device-frame scroll: the rendered stage content genuinely
//       overflows the frame; the frame starts at the top, scrolls on wheel,
//       content physically moves, and the outer Studio regions never own it.
//   C — horizontal clipping: content past the frame's horizontal boundary is
//       clipped at the frame (hit-test proves it), the page/stage does not
//       expand, and the inner widget scroller (showcase gallery) keeps
//       scrolling horizontally on its own.
//   D — overscroll containment: with the outer Studio main region
//       genuinely scrollable (desktop stage), wheeling at the frame's scroll
//       bottom neither scrolls the frame nor chains into the outer region.
//
// The responsive-relayout and token-geometry half lives in
// studio-wave-c.responsive.spec.jsx (follow-up PR).
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

test.describe('A + B — the device frame is the genuine vertical scroll owner', () => {
  test('overflowing rendered content scrolls inside the frame; outer regions never own it', async ({ page }) => {
    await openHarness(page);

    const geom = await measure(page, `(async () => {
      const { frame, scrollViewport, emulator, main, rectOf } = (${FRAME_HELPERS})();
      return {
        frameRect: rectOf(frame),
        frameScrollHeight: frame.scrollHeight,
        frameClientHeight: frame.clientHeight,
        frameScrollTop: frame.scrollTop,
        windowScrollY: window.scrollY,
        documentScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        emulatorRect: rectOf(emulator),
        scrollViewportStyle: { overflowY: getComputedStyle(frame).overflowY, overflowX: getComputedStyle(frame).overflowX, overscroll: getComputedStyle(frame).overscrollBehavior },
      };
    })`);
    const { frameRect } = geom;

    // A: the rendered fixture genuinely overflows the frame's fixed device geometry.
    expect(geom.frameScrollHeight).toBeGreaterThan(geom.frameClientHeight + 400);
    expect(geom.frameRect.width).toBeGreaterThan(200);

    // B1/B2: content overflows and the initial scroll position is the top.
    expect(geom.frameScrollTop).toBe(0);

    // F (frame contract as computed by the real cascade, not source strings).
    expect(geom.scrollViewportStyle.overflowY).toBe('auto');
    expect(geom.scrollViewportStyle.overflowX).toBe('hidden');
    expect(geom.scrollViewportStyle.overscroll).toBe('contain');

    // B5 precondition: the harness page itself is not scrollable (the Studio
    // is a fixed overlay), so any scroll must be owned inside it.
    expect(geom.windowScrollY).toBe(0);

    // B3: wheel over the frame scrolls the frame.
    const center = { x: frameRect.left + frameRect.width / 2, y: frameRect.top + frameRect.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, 300);
    await expect
      .poll(() => measure(page, `() => document.querySelector('${FRAME}').scrollTop`))
      .toBeGreaterThan(0);

    // B4: content physically moves inside the frame (sentinel was below the fold).
    const sentinel = () => measure(page, `() => {
      const frame = document.querySelector('${FRAME}');
      const sentinel = Array.from(frame.querySelectorAll('p'))
        .find((p) => p.textContent === 'Final sentinel hero');
      const r = sentinel.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }`);
    const before = await sentinel();
    expect(before.top).toBeGreaterThan(frameRect.bottom); // below the fold before scrolling
    await page.mouse.wheel(0, 400);
    await page.mouse.wheel(0, 400);
    const after = await sentinel();
    expect(after.top).toBeLessThan(before.top - 50); // content actually moved up inside the frame

    // B5: neither the window nor the outer Studio main region became the storefront scroll owner.
    const outer = await measure(page, `() => ({
      windowScrollY: window.scrollY,
      mainScrollTop: document.querySelector('main').scrollTop,
      frameScrollTop: document.querySelector('${FRAME}').scrollTop,
    })`);
    expect(outer.windowScrollY).toBe(0);
    expect(outer.mainScrollTop).toBe(0);
    expect(outer.frameScrollTop).toBeGreaterThan(0);
  });
});

test.describe('C — horizontal clipping at the device-frame boundary', () => {
  test('frame clips wide content and never scrolls horizontally; the inner gallery keeps scrolling', async ({ page }) => {
    await openHarness(page);

    // Bring the unbreakable wide text into the visible band of the frame.
    await page.evaluate(`(() => {
      const frame = document.querySelector('${FRAME}');
      const longText = window.__longUnbrokenText;
      const span = Array.from(frame.querySelectorAll('span')).find((s) => s.textContent === longText);
      const target = span.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop - 40;
      frame.scrollTop = target;
    })()`);

    const clip = await measure(page, `(async () => {
      const { frame, rectOf } = (${FRAME_HELPERS})();
      const span = Array.from(frame.querySelectorAll('span'))
        .find((s) => s.textContent === window.__longUnbrokenText);
      const frameRect = rectOf(frame);
      const spanRect = rectOf(span);
      const centerY = spanRect.top + (spanRect.bottom - spanRect.top) / 2;
      const insideHit = document.elementFromPoint(frameRect.right - 10, centerY);
      const outsideHit = document.elementFromPoint(frameRect.right + 30, centerY);
      return {
        frameRect, spanRect, centerY,
        visibleInBand: centerY > frameRect.top && centerY < frameRect.bottom,
        insideIsSpan: insideHit === span || (insideHit && span.contains(insideHit)),
        outsideIsSpan: outsideHit === span || (outsideHit && span.contains(outsideHit)),
        frameScrollWidth: frame.scrollWidth,
        frameClientWidth: frame.clientWidth,
        mainScrollWidth: document.querySelector('main').scrollWidth,
        mainClientWidth: document.querySelector('main').clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    })`);

    // The wide rendered tile genuinely extends past the frame boundary.
    expect(clip.visibleInBand).toBe(true);
    expect(clip.spanRect.right).toBeGreaterThan(clip.frameRect.right + 200);

    // Hit-testing proves visual clipping AT the frame: visible just inside
    // the boundary, absent just outside it.
    expect(clip.insideIsSpan).toBe(true);
    expect(clip.outsideIsSpan).toBe(false);

    // The stage never expanded: neither the Studio main region nor the page
    // gained horizontal overflow from the 1000px-wide rendered tile.
    expect(clip.mainScrollWidth).toBeLessThanOrEqual(clip.mainClientWidth + 1);
    expect(clip.documentScrollWidth).toBeLessThanOrEqual(clip.innerWidth);

    // Horizontal wheel over the frame cannot scroll it (clipping, not a
    // second horizontal scroller at the frame layer).
    const center = { x: clip.frameRect.left + clip.frameRect.width / 2, y: clip.centerY };
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(300, 0);
    await page.mouse.wheel(300, 0);
    await page.waitForTimeout(300); // Chromium scrolls wheels asynchronously — let it settle
    const frameH = await measure(page, `() => ({ left: document.querySelector('${FRAME}').scrollLeft })`);
    expect(frameH.left).toBe(0);

    // The legitimate inner horizontal scroller (image -> showcase gallery)
    // still scrolls horizontally inside the clipped frame.
    const gallery = await measure(page, `(async () => {
      const frame = document.querySelector('${FRAME}');
      const gallery = Array.from(frame.querySelectorAll('div'))
        .find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth);
      return gallery ? { rect: gallery.getBoundingClientRect().toJSON() } : null;
    })`);
    expect(gallery).not.toBeNull();
    // Make sure the gallery band is inside the frame's visible area first —
    // scrolling the frame moves the gallery, so its rect is only valid after.
    await page.evaluate(`(() => {
      const frame = document.querySelector('${FRAME}');
      const gallery = Array.from(frame.querySelectorAll('div'))
        .find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth);
      const target = gallery.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop - 60;
      frame.scrollTop = Math.min(frame.scrollHeight, target);
    })()`);
    const galleryNow = await measure(page, `(async () => {
      const frame = document.querySelector('${FRAME}');
      const gallery = Array.from(frame.querySelectorAll('div'))
        .find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth);
      return gallery ? { rect: gallery.getBoundingClientRect().toJSON() } : null;
    })`);
    expect(galleryNow).not.toBeNull();
    const g = { x: galleryNow.rect.x + Math.min(galleryNow.rect.width, 100) / 2, y: galleryNow.rect.y + galleryNow.rect.height / 2 };
    await page.mouse.move(g.x, g.y);
    await page.mouse.wheel(240, 0);
    await page.waitForTimeout(300); // let the animated wheel scroll settle before measuring
    const galleryAfter = await measure(page, `() => {
      const frame = document.querySelector('${FRAME}');
      const gallery = Array.from(frame.querySelectorAll('div'))
        .find((el) => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth);
      return { galleryScrollLeft: gallery.scrollLeft, frameScrollLeft: frame.scrollLeft };
    }`);
    expect(galleryAfter.galleryScrollLeft).toBeGreaterThan(0); // inner widget scroll preserved
    expect(galleryAfter.frameScrollLeft).toBe(0); // the frame still never scrolls horizontally
  });
});

test.describe('D — overscroll containment at the frame boundary', () => {
  test('wheeling at the frame bottom does not chain into the scrollable outer Studio region', async ({ page }) => {
    await openHarness(page);
    await page.click('[title="Desktop preview"]');

    // Precondition: at the desktop stage the outer Studio main region is
    // genuinely scrollable, which is what makes containment non-trivial.
    await expect
      .poll(() => measure(page, `() => document.querySelector('main').scrollHeight - document.querySelector('main').clientHeight`))
      .toBeGreaterThan(100);

    await page.evaluate(`(() => {
      const frame = document.querySelector('${FRAME}');
      frame.scrollTop = frame.scrollHeight; // scroll to the frame's bottom
    })()`);

    // The desktop frame is taller than the browser viewport, so aim the
    // wheels at the frame's VISIBLE bottom band — inside the viewport and
    // over the frame — otherwise the events never hit anything.
    const aim = await measure(page, `() => {
      const r = document.querySelector('${FRAME}').getBoundingClientRect();
      const vh = window.innerHeight;
      return {
        x: r.left + r.width / 2,
        y: Math.min(r.bottom - 40, vh - 40),
        insideFrame: Math.min(r.bottom - 40, vh - 40) > r.top,
      };
    }`);
    expect(aim.insideFrame).toBe(true);
    await page.mouse.move(aim.x, aim.y);
    for (let i = 0; i < 3; i += 1) await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300); // let the animated wheel scroll settle

    const containment = await measure(page, `() => {
      const frame = document.querySelector('${FRAME}');
      return {
        overscroll: getComputedStyle(frame).overscrollBehavior,
        frameAtBottom: frame.scrollTop >= frame.scrollHeight - frame.clientHeight - 1,
        mainScrollTop: document.querySelector('main').scrollTop,
        windowScrollY: window.scrollY,
      };
    }`);
    expect(containment.overscroll).toBe('contain');
    expect(containment.frameAtBottom).toBe(true);
    expect(containment.mainScrollTop).toBe(0); // no scroll chaining past the frame
    expect(containment.windowScrollY).toBe(0);

    // Behavioral control: the same wheel does scroll the outer Studio region
    // when the cursor is outside the frame — proving the null result above is
    // the frame's containment, not an inert page.
    const ctrl = await measure(page, `() => {
      const frame = document.querySelector('${FRAME}');
      const main = document.querySelector('main');
      const fr = frame.getBoundingClientRect();
      const mr = main.getBoundingClientRect();
      return {
        x: Math.min(Math.max(fr.left - 60, mr.left + 8), mr.right - 8),
        y: Math.min(fr.bottom - 40, window.innerHeight - 40),
      };
    }`);
    await page.mouse.move(ctrl.x, ctrl.y);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const control = await measure(page, `() => document.querySelector('main').scrollTop`);
    expect(control).toBeGreaterThan(0);
  });
});
