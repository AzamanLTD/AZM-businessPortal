import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StorefrontStudioV2 from './StorefrontStudioV2';
import { STOREFRONT_STUDIO_TOKENS } from '@/lib/storefrontStudioTokens';

vi.mock('@/components/instrument', () => ({
  Card: ({ className, children }) => <div className={className}>{children}</div>,
}));

vi.mock('./RetailCollectionBoxPreview', () => ({ default: () => <div data-testid="retail-preview" /> }));

// A persisted Studio v2 document whose product-grid has observably different
// responsive intent per breakpoint: 1 / 2 / 4 columns.
function makeResponsiveDraft() {
  return {
    themeName: 'Test theme',
    layoutJson: {
      experience: {
        schemaVersion: 2,
        pages: [{ id: 'home', name: 'Home', slug: '/', root: ['grid-1'] }],
        nodes: {
          'grid-1': {
            id: 'grid-1',
            type: 'product-grid',
            children: [],
            props: { title: 'Responsive grid', columns: 4, maxItems: 4, showPrice: true },
            style: {},
            responsive: {
              phone: { columnCount: 1 },
              tablet: { columnCount: 2 },
              desktop: { columnCount: 4 },
            },
            layout: {},
            actions: {},
          },
        },
        theme: { tokens: {} },
        navigation: {},
        assets: [],
      },
    },
  };
}

function renderStudio() {
  return render(
    <StorefrontStudioV2
      draft={makeResponsiveDraft()}
      saveDraft={() => {}}
      business={{ businessName: 'Test Business', name: 'Test Business' }}
      onClose={() => {}}
    />,
  );
}

function selectViewport(label) {
  fireEvent.click(screen.getByTitle(`${label} preview`));
}

function getEmulator() {
  return screen.getByTestId('studio-device-emulator');
}

function getRenderedGridColumns() {
  const frame = screen.getByTestId('studio-device-frame');
  const grid = frame.querySelector('[style*="grid-template-columns"]');
  expect(grid).toBeTruthy();
  return grid.style.gridTemplateColumns;
}

describe('Storefront Studio V2 rendered device-emulation contract', () => {
  const devices = STOREFRONT_STUDIO_TOKENS.studio.previewDevices;

  it.each([
    ['Phone', 'phone', 'phone'],
    ['Tablet', 'tablet', 'tablet'],
    ['Desktop', 'desktop', 'desktop'],
  ])('renders the %s stage through the real viewport control path', (label, viewportKey, expectedViewport) => {
    renderStudio();
    selectViewport(label);

    const emulator = getEmulator();
    expect(emulator.getAttribute('data-viewport')).toBe(expectedViewport);
    expect(emulator.getAttribute('aria-label')).toContain(expectedViewport);
    expect(emulator.getAttribute('aria-label')).toContain(`${devices[viewportKey].widthDp} by ${devices[viewportKey].heightDp}`);
    expect(emulator.style.width).toBe(`${devices[viewportKey].displayWidthPx}px`);
    expect(emulator.style.height).not.toBe('');
  });

  it('keeps the bounded emulator scroll window around the rendered stage', () => {
    renderStudio();
    const scrollViewport = screen.getByTestId('studio-device-scroll-viewport');
    expect(scrollViewport.style.overflowY).toBe('auto');
    expect(scrollViewport.style.overflowX).toBe('hidden');
    expect(scrollViewport.style.overscrollBehavior).toBe('contain');
  });

  it('renders the storefront device frame inside the emulator for every viewport', () => {
    renderStudio();
    for (const label of ['Phone', 'Tablet', 'Desktop']) {
      selectViewport(label);
      expect(screen.getByTestId('studio-device-frame')).toBeTruthy();
    }
  });
});

describe('Storefront Studio V2 rendered responsive relayout proof', () => {
  it('changes the rendered storefront structure when the viewport changes', () => {
    renderStudio();

    // phone intent -> 1 column
    expect(screen.getByTestId('studio-device-emulator').getAttribute('data-viewport')).toBe('phone');
    expect(getRenderedGridColumns()).toBe('repeat(1, 1fr)');

    // tablet inherits phone intent, then applies its own 2-column layer
    selectViewport('Tablet');
    expect(getRenderedGridColumns()).toBe('repeat(2, 1fr)');

    // desktop inherits the resolved tablet layer, then applies its own 4-column layer
    selectViewport('Desktop');
    expect(getRenderedGridColumns()).toBe('repeat(4, 1fr)');

    // The resolved intent never mutated the persisted document source.
    const sourceColumns = makeResponsiveDraft().layoutJson.experience.nodes['grid-1'].props.columns;
    expect(sourceColumns).toBe(4);
  });
});
