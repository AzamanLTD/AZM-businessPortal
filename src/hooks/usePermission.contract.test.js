import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('permission contract compatibility', () => {
  it('maps legacy dine-in permission names to the canonical backend key', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/usePermission.js'),
      'utf8',
    );

    expect(source).toContain("'dinein.manage': 'restaurant.dinein.manage'");
    expect(source).toContain("'dinein.view': 'restaurant.dinein.manage'");
    expect(source).toContain('const canonicalKey = PERMISSION_ALIASES[key] || key;');
  });
});
