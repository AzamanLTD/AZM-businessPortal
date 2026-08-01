// src/components/storefront/NitroUpsellBanner.jsx
import { Card } from '@/components/forge';
import { useToast } from '@/components/forge';
import { Zap, TrendingUp } from 'lucide-react';

export default function NitroUpsellBanner({ eligibility, onStakeClick }) {
  const { toast } = useToast();

  if (!eligibility) return null;
  const staked = eligibility.stakedBalance ?? 0;
  const nextTier = staked < 500   ? { name: 'Bronze', needed: 500  - staked, min: 500 }
                 : staked < 1500  ? { name: 'Silver', needed: 1500 - staked, min: 2000 }
                 : staked < 5000  ? { name: 'Gold',   needed: 5000 - staked, min: 5000 }
                 : null;
  if (!nextTier) return null;

  const handleStake = () => {
    // Track the upsell click (passed from parent that has useStorefront)
    if (onStakeClick) onStakeClick(nextTier, staked);

    toast({
      title: `Stake AZM to unlock ${nextTier.name}`,
      description: `Stake ${nextTier.needed} more AZM (total ${nextTier.min}) via the AZM mobile app to unlock premium themes and widgets.`,
      variant: 'default',
    });
  };

  return (
    <GlassPanel className="p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--f-surface-sunken)' }}>
          <Zap className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>Unlock Nitro {nextTier.name}</h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--f-text-3)' }}>
            Stake {nextTier.needed} more AZM to unlock premium themes and widgets.
          </p>
          <button onClick={handleStake} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'var(--f-tint-color)', color: '#fff' }}>
            <TrendingUp className="w-3.5 h-3.5" />Stake AZM
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
