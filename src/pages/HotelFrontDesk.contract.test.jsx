import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('./HotelFrontDesk.jsx', import.meta.url));

describe('HotelFrontDesk walk-in customer identity contract', () => {
  it('uses the public Azaman customer identifier', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('customerAzamanId: walkInForm.customerAzamanId');
    expect(source).toContain('label="Customer Azaman ID *"');
    expect(source).not.toContain('guestName: walkInForm.guestName');
  });
});
