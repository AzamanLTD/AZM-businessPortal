import { describe, expect, it } from 'vitest';
import { sanitizeStorefrontPreviewHtml } from './storefrontPreviewSanitizer';

describe('sanitizeStorefrontPreviewHtml', () => {
  it('removes executable elements and inline event handlers', () => {
    const result = sanitizeStorefrontPreviewHtml(
      '<div onclick="alert(1)"><script>alert(2)</script><img src="https://example.com/a.png" onerror="alert(3)"></div>',
    );

    expect(result).toContain('<div>');
    expect(result).toContain('<img src="https://example.com/a.png">');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
  });

  it('rejects unsafe URL schemes while allowing web and tel/mail links', () => {
    const result = sanitizeStorefrontPreviewHtml(
      '<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a><a href="tel:+233000000000">call</a><a href="mailto:test@example.com">mail</a>',
    );

    expect(result).not.toContain('javascript:');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('href="tel:+233000000000"');
    expect(result).toContain('href="mailto:test@example.com"');
  });

  it('preserves safe text structure but strips unsupported tags', () => {
    const result = sanitizeStorefrontPreviewHtml('<p>Hello <strong>world</strong></p><iframe src="https://evil.example"></iframe><span>!</span>');

    expect(result).toContain('<p>Hello <strong>world</strong></p>');
    expect(result).toContain('<span>!</span>');
    expect(result).not.toContain('<iframe');
  });
});
