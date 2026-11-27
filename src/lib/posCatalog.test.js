import { describe, expect, it, vi } from 'vitest';
import {
    ghsToPesewas, formatPesewas, toPosProduct, productsFromResponse, fetchAllProducts, subtotalPesewas,
} from './posCatalog';

describe('ghsToPesewas', () => {
    it('reads exact GHS text', () => {
        expect(ghsToPesewas('12.34')).toBe(1234);
        expect(ghsToPesewas('12.3')).toBe(1230);
        expect(ghsToPesewas('12')).toBe(1200);
        expect(ghsToPesewas('0.05')).toBe(5);
    });
    it('refuses anything that is not an exact 2dp amount', () => {
        for (const v of [null, undefined, 12.34, '', '1.234', '-1', '1e3', 'abc', ' ']) {
            expect(ghsToPesewas(v)).toBeNull();
        }
    });
});

describe('formatPesewas', () => {
    it('formats exactly', () => {
        expect(formatPesewas(1234)).toBe('GHS 12.34');
        expect(formatPesewas(5)).toBe('GHS 0.05');
        expect(formatPesewas(0)).toBe('GHS 0.00');
    });
});

describe('toPosProduct', () => {
    it('prices from priceGhs and reads the real image and stock fields', () => {
        const p = toPosProduct({ id: 'p1', name: 'Rice', priceGhs: '45.50', priceUsdc: '3.10', imageUrls: ['https://x/1.jpg', 'https://x/2.jpg'], stockQty: 3 });
        expect(p.pricePesewas).toBe(4550);
        expect(p.priceAvailable).toBe(true);
        expect(p.imageUrl).toBe('https://x/1.jpg');
        expect(p.stockQuantity).toBe(3);
    });
    it('never falls back to the USDC price', () => {
        const p = toPosProduct({ id: 'p2', name: 'Oil', priceGhs: null, priceUsdc: '9.99' });
        expect(p.priceAvailable).toBe(false);
        expect(p.pricePesewas).toBeNull();
        expect(p.price).toBeNull();
    });
    it('treats missing images and untracked stock as absent', () => {
        const p = toPosProduct({ id: 'p3', priceGhs: '1.00', imageUrls: null, stockQty: null });
        expect(p.imageUrl).toBeNull();
        expect(p.stockQuantity).toBeNull();
    });
});

describe('fetchAllProducts', () => {
    it('follows the cursor until hasMore is false', async () => {
        const list = vi.fn()
            .mockResolvedValueOnce({ products: [{ id: 'a' }, { id: 'b' }], hasMore: true, nextCursor: 'b' })
            .mockResolvedValueOnce({ products: [{ id: 'c' }], hasMore: false, nextCursor: null });
        const all = await fetchAllProducts(list);
        expect(all.map((p) => p.id)).toEqual(['a', 'b', 'c']);
        expect(list).toHaveBeenNthCalledWith(1, { limit: 50 });
        expect(list).toHaveBeenNthCalledWith(2, { limit: 50, cursor: 'b' });
    });
    it('stops on a cursor that does not advance', async () => {
        const list = vi.fn().mockResolvedValue({ products: [{ id: 'x' }], hasMore: true, nextCursor: 'same' });
        const all = await fetchAllProducts(list, { maxPages: 5 });
        expect(list).toHaveBeenCalledTimes(2);
        expect(all).toHaveLength(2);
    });
    it('is bounded', async () => {
        let n = 0;
        const list = vi.fn(async () => ({ products: [{ id: String(n) }], hasMore: true, nextCursor: `c${n++}` }));
        await fetchAllProducts(list, { maxPages: 3 });
        expect(list).toHaveBeenCalledTimes(3);
    });
});

describe('productsFromResponse / subtotalPesewas', () => {
    it('reads the documented envelope', () => {
        expect(productsFromResponse({ success: true, products: [{ id: 1 }] })).toEqual([{ id: 1 }]);
        expect(productsFromResponse(null)).toEqual([]);
    });
    it('sums exactly in pesewas', () => {
        expect(subtotalPesewas([{ pricePesewas: 1010, qty: 3 }, { pricePesewas: 1, qty: 7 }])).toBe(3037);
    });
});
