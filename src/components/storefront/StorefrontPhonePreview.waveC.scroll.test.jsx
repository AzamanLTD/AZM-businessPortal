import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StorefrontPhonePreview from './StorefrontPhonePreview';
import '../../styles/studioWaveC.css';

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
  it('makes the fixed phone frame an actual vertical scroll boundary', () => {
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
    expect(getComputedStyle(frame).overflowY).toBe('auto');
    expect(getComputedStyle(frame).overflowX).toBe('hidden');
    expect(frame.style.height).not.toBe('');
  });

  it('keeps widget content height unbounded so tall content can overflow the frame', () => {
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
