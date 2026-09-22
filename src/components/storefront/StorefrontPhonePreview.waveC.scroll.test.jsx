import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

function renderTallPreview() {
  return render(
    <StorefrontPhonePreview
      draft={{ layoutJson: { tiles: makeTiles(12) } }}
      theme={{ name: 'Test', tokenSet: {} }}
      widgets={[]}
      business={{ name: 'Test Business' }}
      businessType="GENERAL"
    />,
  );
}

describe('StorefrontPhonePreview Wave C rendered device-frame contract', () => {
  it('exposes the device frame through a stable semantic hook', () => {
    renderTallPreview();
    const frame = screen.getByTestId('studio-device-frame');
    expect(frame).toBeTruthy();
  });

  it('owns the scroll contract at the frame boundary instead of a global stylesheet', () => {
    renderTallPreview();
    const frame = screen.getByTestId('studio-device-frame');
    expect(frame.style.overflowY).toBe('auto');
    expect(frame.style.overflowX).toBe('hidden');
    expect(frame.style.overscrollBehavior).toBe('contain');
  });

  it('keeps the frame at deterministic device geometry while tall content renders inside it', () => {
    renderTallPreview();
    const frame = screen.getByTestId('studio-device-frame');
    expect(frame.style.width).not.toBe('');
    expect(frame.style.height).not.toBe('');

    // The tall fixture genuinely renders inside the frame — the frame is the
    // container whose fixed device height the rendered content exceeds.
    const sections = within(frame).getAllByText(/^Section \d+$/);
    expect(sections).toHaveLength(12);
  });

  it('keeps the widget viewport intrinsically tall and free of competing overflow ownership', () => {
    renderTallPreview();
    const frame = screen.getByTestId('studio-device-frame');
    const widgetViewport = Array.from(frame.querySelectorAll('div')).find((element) => element.style.minHeight);
    expect(widgetViewport).toBeTruthy();
    // Intrinsically tall: no accidental height cap on the content path.
    expect(widgetViewport.style.height).toBe('');
    expect(widgetViewport.style.maxHeight).toBe('');
    // The frame is the sole vertical scroll owner on the path.
    expect(widgetViewport.style.overflowY).toBe('');
    expect(widgetViewport.style.overflowX).toBe('');
    expect(widgetViewport.style.overscrollBehavior).toBe('');
  });

  it('preserves horizontal-scroll widget regions inside the frame', () => {
    render(
      <StorefrontPhonePreview
        draft={{ layoutJson: { tiles: [
          { id: 'showcase-1', widgetType: 'showcase_gallery', position: { row: 0, col: 0, colSpan: 4, rowSpan: 1 }, props: { title: 'Gallery' } },
        ] } }}
        theme={{ name: 'Test', tokenSet: {} }}
        widgets={[]}
        business={{ name: 'Test Business' }}
        businessType="GENERAL"
      />,
    );
    const frame = screen.getByTestId('studio-device-frame');
    const gallery = Array.from(frame.querySelectorAll('div')).find((element) => element.style.overflowX === 'auto');
    expect(gallery).toBeTruthy();
    // The gallery keeps its own vertical containment while scrolling horizontally.
    expect(gallery.style.overflowY).toBe('hidden');
  });
});
