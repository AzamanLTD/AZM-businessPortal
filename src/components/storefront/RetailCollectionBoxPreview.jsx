import { Image as ImageIcon, ShoppingBag } from 'lucide-react';

import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from '@/lib/storefrontStudioTokens';

const retailTokens = STOREFRONT_STUDIO_TOKENS.layout.retailCollection;

function formatPrice(product) {
  const raw = product?.price ?? product?.priceUsdc;
  const price = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(price)) return product?.available === false ? 'Currently unavailable' : 'Price unavailable';

  const currency = String(product?.currency || '').toUpperCase();
  const symbol = {
    GHS: 'GH₵',
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }[currency] ?? (currency ? `${currency} ` : '');
  return `${symbol}${price.toFixed(2)}`;
}

function normalizeProducts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((product) => product && typeof product === 'object')
    .slice(0, 6)
    .map((product) => ({
      ...product,
      name: product.name ?? product.title ?? 'Product',
      image: product.imageUrls?.[0] ?? product.images?.[0] ?? null,
      available: product.available !== false && product.isActive !== false,
    }));
}

export default function RetailCollectionBoxPreview({ props = {}, tokens = {} }) {
  const collectionTitle = props.title || 'Collection';
  const subtitle = typeof props.subtitle === 'string' ? props.subtitle : '';
  const products = normalizeProducts(props.products);
  const accent = tokens.accent || '#6C4FD1';
  const surface = tokens.surface || '#ffffff';
  const border = tokens.border || '#e5e7eb';
  const textPrimary = tokens.textPrimary || '#111111';
  const textSecondary = tokens.textSecondary || '#888888';
  const countLabel = products.length > 1 ? `${products.length} items` : null;
  const rowHeight = toPreviewPx(retailTokens.rowHeightDp);
  const cardWidth = toPreviewPx(retailTokens.cardWidthDp);
  const itemGap = toPreviewPx(retailTokens.itemGapDp);
  const cardRadius = toPreviewPx(retailTokens.cardRadiusDp);
  const cardPadding = toPreviewPx(retailTokens.cardPaddingDp);
  const cardTopPadding = toPreviewPx(retailTokens.cardTopPaddingDp);
  const cardBottomPadding = toPreviewPx(retailTokens.cardBottomPaddingDp);
  const productTitleGap = toPreviewPx(retailTokens.productTitleGapDp);

  if (products.length === 0) {
    return (
      <div style={{ padding: `${toPreviewPx(8)}px ${toPreviewPx(8)}px`, color: textSecondary }}>
        <span style={{ fontSize: toPreviewPx(12) }}>{collectionTitle} is empty</span>
      </div>
    );
  }

  return (
    <div style={{ padding: `${toPreviewPx(8)}px ${toPreviewPx(8)}px ${toPreviewPx(6)}px` }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: toPreviewPx(8) }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            color: textPrimary,
            fontSize: toPreviewPx(16),
            lineHeight: 1.2,
            fontWeight: 800,
            margin: 0,
          }}>
            {collectionTitle}
          </p>
          {subtitle && (
            <p style={{
              color: textSecondary,
              fontSize: toPreviewPx(12),
              lineHeight: 1.25,
              margin: `${toPreviewPx(retailTokens.subtitleGapDp)}px 0 0`,
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {countLabel && (
          <span style={{ color: textSecondary, fontSize: toPreviewPx(10), lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {countLabel}
          </span>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: itemGap,
        height: rowHeight,
        overflowX: 'auto',
        overflowY: 'hidden',
        marginTop: toPreviewPx(retailTokens.titleBottomGapDp),
        scrollbarWidth: 'none',
      }}>
        {products.map((product) => (
          <div
            key={product.id || product.name}
            style={{
              flex: `0 0 ${cardWidth}px`,
              height: rowHeight,
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: cardRadius,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{
              height: `calc(100% - ${cardTopPadding + cardBottomPadding + toPreviewPx(34)}px)`,
              background: `${accent}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {product.image ? (
                <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ImageIcon size={toPreviewPx(22)} color={accent} />
              )}
            </div>
            <div style={{
              padding: `${cardTopPadding}px ${cardPadding}px ${cardBottomPadding}px`,
              boxSizing: 'border-box',
            }}>
              <p style={{
                margin: 0,
                color: textPrimary,
                fontSize: toPreviewPx(12),
                lineHeight: 1.2,
                fontWeight: 700,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                minHeight: toPreviewPx(29),
              }}>
                {product.name}
              </p>
              <p style={{
                margin: `${productTitleGap}px 0 0`,
                color: product.available ? accent : (tokens.error || '#b42318'),
                fontSize: toPreviewPx(11),
                lineHeight: 1.2,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {product.available ? formatPrice(product) : 'Currently unavailable'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: toPreviewPx(4), marginTop: toPreviewPx(4), color: textSecondary }} aria-hidden="true">
        <ShoppingBag size={toPreviewPx(10)} />
        <span style={{ fontSize: toPreviewPx(8) }}>Tap a product for details</span>
      </div>
    </div>
  );
}

export { formatPrice, normalizeProducts };
