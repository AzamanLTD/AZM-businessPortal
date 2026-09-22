import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StorefrontPhonePreview button fidelity contract', () => {
  it('uses a semantic button customLabel in the shared action renderer', () => {
    const source = fs.readFileSync(path.resolve('src/components/storefront/StorefrontPhonePreview.jsx'), 'utf8');
    expect(source).toContain("const customLabel = typeof props.customLabel === 'string' && props.customLabel.trim() ? props.customLabel.trim() : null;");
    expect(source).toContain("label: customLabel || 'Order Now'");
  });
});
