import { useQuery } from '@tanstack/react-query';
import { business as businessApi, products as productsApi } from '@/lib/api';
import { Modal, Skeleton, Badge } from '@/components/ui';
import { fmtUSDC, fmt } from '@/lib/utils';
import { BadgeCheck, Globe, Package, ShoppingBag, Star } from 'lucide-react';

/**
 * Renders the business storefront roughly as a customer sees it in the Flutter
 * app: dark theme, logo (with initials fallback), verified badge, stats, and a
 * mini product grid. Data comes from the PUBLIC GET /api/business/:bizId plus
 * the owner's product list.
 */
export default function PublicProfilePreview({ open, onClose, bizId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-business', bizId],
    queryFn: () => businessApi.getPublic(bizId),
    enabled: open && !!bizId,
    retry: false,
  });

  const { data: productData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
    enabled: open,
  });

  const biz = data?.business;
  const products = (productData?.products || []).filter(p => p.isActive).slice(0, 6);

  return (
    <Modal open={open} onClose={onClose} title="Public Profile Preview" className="max-w-md">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
          <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
        </div>
      ) : isError || !biz ? (
        <div className="py-10 text-center text-sm text-[var(--f-text-3)]">
          Could not load the public profile. Make sure your business is published.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Logo url={biz.logoUrl} name={biz.businessName} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-[var(--f-text)] truncate">{biz.businessName}</h3>
                {biz.isVerified && <BadgeCheck className="w-4 h-4 text-[var(--f-tint-color)] flex-shrink-0" />}
              </div>
              {biz.category && (
                <Badge color="var(--f-tint-color)" bg="var(--f-surface-sunken)" className="mt-1">{biz.category.replace(/_/g, ' ')}</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {biz.description && <p className="text-sm text-[var(--f-text-3)] leading-relaxed">{biz.description}</p>}

          {/* Website */}
          {biz.website && (
            <a
              href={biz.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-[var(--f-info)] hover:underline"
            >
              <Globe className="w-3.5 h-3.5" /> {biz.website}
            </a>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={ShoppingBag} label="Orders"    value={fmt(biz.totalEscrows || 0, 0)} />
            <Stat icon={Star}        label="Completed" value={fmt(biz.completedEscrows || 0, 0)} />
            <Stat icon={Package}     label="Volume"    value={fmtUSDC(biz.totalVolume || 0)} />
          </div>

          {/* Product mini-grid */}
          <div>
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2">Products</p>
            {products.length === 0 ? (
              <p className="text-xs text-[var(--f-text-3)]">No active products listed yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {products.map(p => (
                  <div key={p.id} className="rounded-xl overflow-hidden bg-[var(--f-ink-900)] border border-[var(--f-line)]">
                    <div className="aspect-square">
                      {Array.isArray(p.imageUrls) && p.imageUrls[0] ? (
                        <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-[var(--f-line)]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-[var(--f-text)] truncate">{p.name}</p>
                      <p className="text-[11px] font-bold text-[var(--f-tint-color)] f-mono">{fmtUSDC(p.priceUsdc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Logo({ url, name }) {
  const initials = (name || 'B').charAt(0).toUpperCase();
  return (
    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-[#00d97e1a] border border-[#00d97e30] flex items-center justify-center">
      {url ? (
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <span className="w-full h-full items-center justify-center text-lg font-bold text-[var(--f-tint-color)]" style={{ display: url ? 'none' : 'flex' }}>
        {initials}
      </span>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-[var(--f-ink-900)] rounded-xl p-3 text-center border border-[#1e1e2e]">
      <Icon className="w-4 h-4 text-[var(--f-text-3)] mx-auto mb-1" />
      <p className="text-sm font-bold text-[var(--f-text)] f-mono leading-tight">{value}</p>
      <p className="text-[10px] text-[var(--f-text-3)] mt-0.5">{label}</p>
    </div>
  );
}
