import { describe, expect, it } from 'vitest';
import { normalizeStudioViewport, resolveResponsiveNode } from './storefrontStudioResponsive';

describe('storefrontStudioResponsive', () => {
  it('normalizes unknown viewport names to phone', () => {
    expect(normalizeStudioViewport('watch')).toBe('phone');
    expect(normalizeStudioViewport('tablet')).toBe('tablet');
  });

  it('applies semantic responsive overrides without mutating the source node', () => {
    const node = {
      id: 'products',
      type: 'product-grid',
      props: { title: 'Menu', columns: 4 },
      layout: { gap: 16, visibility: true },
      responsive: {
        phone: { columnCount: 2, gap: 8, visibility: true },
        tablet: { columnCount: 3, layout: { gap: 12 } },
      },
    };

    const phone = resolveResponsiveNode(node, 'phone');
    const tablet = resolveResponsiveNode(node, 'tablet');

    expect(phone.props.columns).toBe(2);
    expect(phone.layout.gap).toBe(8);
    expect(tablet.props.columns).toBe(3);
    expect(tablet.layout.gap).toBe(12);
    expect(node.props.columns).toBe(4);
    expect(node.layout.gap).toBe(16);
  });

  it('supports explicit layout/props responsive domains', () => {
    const node = {
      id: 'hero',
      type: 'hero',
      props: { title: 'Welcome' },
      layout: { widthMode: 'full' },
      responsive: {
        desktop: {
          layout: { widthMode: 'contained' },
          props: { textScale: 1.15 },
        },
      },
    };

    const desktop = resolveResponsiveNode(node, 'desktop');
    expect(desktop.layout.widthMode).toBe('contained');
    expect(desktop.props.textScale).toBe(1.15);
  });

  it('inherits lower-breakpoint intent when a larger breakpoint omits a key', () => {
    const node = {
      id: 'catalog',
      type: 'product-grid',
      props: { columns: 4, title: 'Catalog' },
      layout: { gap: 16 },
      responsive: {
        phone: { columnCount: 1, gap: 8, layout: { widthMode: 'full' } },
        tablet: { columnCount: 2 },
        desktop: { props: { textScale: 1.1 } },
      },
    };

    const desktop = resolveResponsiveNode(node, 'desktop');

    expect(desktop.props.columns).toBe(2);
    expect(desktop.props.textScale).toBe(1.1);
    expect(desktop.layout.gap).toBe(8);
    expect(desktop.layout.widthMode).toBe('full');
    expect(desktop.responsive).toEqual(node.responsive);
    expect(node.props.columns).toBe(4);
    expect(node.layout.gap).toBe(16);
  });
});
