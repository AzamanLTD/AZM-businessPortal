import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('HotelFrontDesk walk-in customer identity contract', () => {
  it('uses the public Azaman customer identifier', async () => {
    const source = await readFile(join(process.cwd(), 'src/pages/HotelFrontDesk.jsx'), 'utf8');
    expect(source).toContain('customerAzamanId: walkInForm.customerAzamanId');
    expect(source).toContain('label="Customer Azaman ID *"');
    expect(source).not.toContain('guestName: walkInForm.guestName');
  });
});
