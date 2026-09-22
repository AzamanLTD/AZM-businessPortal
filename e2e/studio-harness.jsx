// e2e/studio-harness.jsx
// =============================================================================
// Wave C rendered-acceptance harness.
//
// Boots the REAL StorefrontStudioV2 (layer tree + palette + inspector +
// StudioStage -> StorefrontPhonePreview) in a real Chromium page through the
// Vite dev server, with a persisted semantic document whose rendered content
// genuinely exceeds the device-frame geometry in both axes. This is test
// infrastructure only — it changes no production behavior and the Studio's
// own `fixed inset-0` overlay makes the harness page itself non-scrolling,
// so the studio main region stays the only outer scroll owner.
//
// The fixture flows through the exact production pipeline:
//   viewport selector -> semantic document -> resolveResponsiveNode
//   -> runtime adapter -> StorefrontPhonePreview -> rendered layout
// =============================================================================

import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/instrument.css';
import StorefrontStudioV2 from '../src/components/storefront/StorefrontStudioV2.jsx';

const LONG_UNBROKEN_TEXT = `OverlongToken_${'RenderedClippingProof'.repeat(12)}`;

// Same persisted-document schema as the JSDOM stageRender test, extended with
// nodes that produce (a) tall vertical content (hero stack + 1-column phone
// product grid), (b) a genuinely wide rendered tile (unbreakable text), and
// (c) a legitimate inner horizontal scroller (image -> showcase gallery).
function makeWaveCFixtureDraft() {
  const nodes = {};
  const root = [];
  const addNode = (id, type, props = {}, extra = {}) => {
    nodes[id] = {
      id, type, children: [], props, style: {}, layout: {}, actions: {},
      ...extra,
    };
    root.push(id);
  };

  addNode('hero-1', 'hero', { title: 'Rendered scroll proof', subtitle: 'Wave C rendered acceptance', height: 'standard' });
  addNode('hero-2', 'hero', { title: 'Second rendered hero', subtitle: 'Tall rendered content', height: 'standard' });
  addNode('grid-1', 'product-grid',
    { title: 'Responsive grid', columns: 4, maxItems: 4, showPrice: true },
    { responsive: { phone: { columnCount: 1 }, tablet: { columnCount: 2 }, desktop: { columnCount: 4 } } });
  addNode('image-1', 'image', { title: 'Showcase gallery', alt: 'Gallery', mediaUrl: '' });
  addNode('text-1', 'text', { value: 'Rendered content that extends past the frame' });
  addNode('text-long', 'text', { value: LONG_UNBROKEN_TEXT });
  addNode('hero-3', 'hero', { title: 'Third rendered hero', subtitle: 'Below the fold', height: 'standard' });
  addNode('promo-1', 'promo', { title: 'Rendered promo', subtitle: 'Clipped horizontally', ctaText: 'Learn more' });
  addNode('hero-4', 'hero', { title: 'Final sentinel hero', subtitle: 'Scroll target', height: 'standard' });

  return {
    themeName: 'Wave C rendered acceptance',
    layoutJson: {
      experience: {
        schemaVersion: 2,
        pages: [{ id: 'home', name: 'Home', slug: '/', root }],
        nodes,
        theme: { tokens: {} },
        navigation: {},
        assets: [],
      },
    },
  };
}

const draft = makeWaveCFixtureDraft();

// Exposed so the spec can prove the persisted document object is byte-stable
// across every viewport resolution — the same non-mutation contract as the
// JSDOM stageRender suite, checked against the live rendered session.
window.__studioFixtureDraft = draft;
// And a marker for the long unbreakable text, so the spec never depends on
// font metrics to locate the clipping target.
window.__longUnbrokenText = LONG_UNBROKEN_TEXT;

createRoot(document.getElementById('root')).render(
  <StorefrontStudioV2
    draft={draft}
    saveDraft={() => {}}
    business={{ businessName: 'Wave C Harness Business', name: 'Wave C Harness Business', businessType: 'GENERAL' }}
    onClose={() => {}}
  />,
);
