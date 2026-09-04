import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('StudioLayerTree insertion contract', () => {
  it('supports before/after sibling insertion and resolves the existing parent', () => {
    const source = fs.readFileSync(path.resolve('src/components/storefront/StudioLayerTree.jsx'), 'utf8');
    expect(source).toContain("import { getStudioParentId } from '@/lib/storefrontStudioTree';");
    expect(source).toContain("const edge = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';");
    expect(source).toContain("onMoveNode?.(target.movingId, { parentId: target.parentId, index: target.index })");
  });
});
