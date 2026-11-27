// src/lib/posCatalog.js
// =============================================================================
// POS catalogue contract — the shape GET /api/business/products actually returns.
//
// Backend (AZM-backend services/businessProductService.listProducts):
//   { success, products: [...], hasMore, nextCursor }   page size capped at 50
//   product.priceGhs   exact 2dp string from the merchant's confirmed
//                      BusinessPrice, or null when there is none
//   product.priceUsdc  the USDC listing price (NOT a GHS price)
//   product.imageUrls  string[] (Json)
//   product.stockQty   integer, or null when untracked
//
// The POS used to read product.price / imageUrl / stockQuantity, which the
// backend never sends, so every tile showed "GHS 0.00". GHS is the POS's
// currency: a product is priced ONLY from priceGhs, held exactly in integer
// pesewas, and a product with no confirmed GHS price cannot be sold here —
// never a converted or relabelled USDC price.
// =============================================================================

const GHS_TEXT = /^\d+(\.\d{1,2})?$/;

/** Exact GHS text → integer pesewas, or null when it is not an exact amount. */
export function ghsToPesewas(value) {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!GHS_TEXT.test(text)) return null;
    const [whole, frac = ''] = text.split('.');
    const pesewas = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
    return Number.isSafeInteger(pesewas) ? pesewas : null;
}

/** Integer pesewas → "GHS 12.34". */
export function formatPesewas(pesewas) {
    if (!Number.isSafeInteger(pesewas)) return 'GHS —';
    const sign = pesewas < 0 ? '-' : '';
    const abs = Math.abs(pesewas);
    return `GHS ${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** One backend product → the fields the POS renders. */
export function toPosProduct(raw) {
    const pricePesewas = ghsToPesewas(raw && raw.priceGhs);
    const images = Array.isArray(raw && raw.imageUrls) ? raw.imageUrls.filter((u) => typeof u === 'string' && u) : [];
    return {
        ...raw,
        pricePesewas,
        priceAvailable: pricePesewas !== null,
        // Display mirror only; totals are computed from pricePesewas.
        price: pricePesewas === null ? null : pricePesewas / 100,
        imageUrl: images[0] || null,
        stockQuantity: Number.isInteger(raw && raw.stockQty) ? raw.stockQty : null,
    };
}

/** Accept the documented envelope (and a bare array, defensively). */
export function productsFromResponse(response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.products)) return response.products;
    return [];
}

/**
 * Read the whole catalogue: the backend caps a page at 50 and returns a cursor.
 * Bounded so a misbehaving cursor can never loop forever.
 */
export async function fetchAllProducts(list, { pageSize = 50, maxPages = 40 } = {}) {
    const all = [];
    let cursor = null;
    for (let page = 0; page < maxPages; page += 1) {
        const params = cursor ? { limit: pageSize, cursor } : { limit: pageSize };
        const response = await list(params);
        all.push(...productsFromResponse(response));
        const next = response && response.hasMore ? response.nextCursor : null;
        if (!next || next === cursor) break;
        cursor = next;
    }
    return all;
}

/** Cart subtotal in integer pesewas. */
export function subtotalPesewas(cart) {
    return cart.reduce((sum, item) => sum + (Number.isSafeInteger(item.pricePesewas) ? item.pricePesewas * item.qty : 0), 0);
}
