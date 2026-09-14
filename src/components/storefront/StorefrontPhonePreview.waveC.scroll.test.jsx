import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import StorefrontPhonePreview from './StorefrontPhonePreview';

vi.mock('@/components/instrument', () => ({
  Card: ({ className, children }) => <div className={className}>{children}</div>,
}));

vi.mock('./RetailCollectionBoxPreview', () => ({ default: () => <div data-testid="retail-preview" /> }));

function makeTiles(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `tile-${index}`,
    widgetType: 'hero_header',
    position: { row: index, col: 0, colSpan: 4, rowSpan: 2 },
    props: { title: `Section ${index + 1}`, subtitle: 'Scrollable content' },
  }));
}

describe('StorefrontPhonePreview Wave C scroll contract', () => {
  it('renders a fixed-height phone frame around overflowing preview content', () => {
    const { container } = render(
      <StorefrontPhonePreview
        draft={{ layoutJson: { tiles: makeTiles(12) } }}
        theme={{ name: 'Test', tokenSet: {} }}
        widgets={[]}
        business={{ name: 'Test Business' }}
        businessType="GENERAL"
      />,
    );

    const frame = container.querySelector('.p-3 > .overflow-hidden.shadow-2xl.mx-auto');
    expect(frame).not.toBeNull();
    expect(frame.style.height).not.toBe('');
    expect(frame.querySelectorAll('[style*="height"]').length).toBeGreaterThan(1);
  });

  it('keeps the widget viewport intrinsically tall and moves overflow ownership to the frame', () => {
    const source = fs.readFileSync(path.resolve('src/styles/studioWaveC.css'), 'utf8');
    expect(source).toContain('overflow-y: auto !important;');
    expect(source).toContain('overflow-x: hidden !important;');
    expect(source).toContain('overscroll-behavior: contain;');

    const { container } = render(
      <StorefrontPhonePreview
        draft={{ layoutJson: { tiles: makeTiles(12) } }}
        theme={{ name: 'Test', tokenSet: {} }}
        widgets={[]}
        business={{ name: 'Test Business' }}
        businessType="GENERAL"
      />,
    );

    const frame = container.querySelector('.p-3 > .overflow-hidden.shadow-2xl.mx-auto');
    const widgetViewport = Array.from(frame.querySelectorAll('div')).find((element) => element.style.minHeight);
    expect(widgetViewport).toBeTruthy();
    expect(widgetViewport.style.height).toBe('');
    expect(widgetViewport.style.maxHeight).toBe('');
  });
});
