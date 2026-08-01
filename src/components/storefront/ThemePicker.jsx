// src/components/storefront/ThemePicker.jsx
import { Badge } from '@/components/ui';
import { Lock, Check, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map business types to theme categories for "Recommended" badges
const BUSINESS_TO_THEME_CATEGORY = {
  RESTAURANT: 'RESTAURANT',
  HOTEL: 'HOTEL',
  TRANSIT: 'UNIVERSAL', // no specific transit theme yet
  RETAIL: 'RETAIL',
  SERVICES: 'UNIVERSAL',
  GENERAL: 'UNIVERSAL',
};

export default function ThemePicker({ themes, currentThemeId, eligibility, onThemeChange, businessType = 'GENERAL' }) {
  if (!themes?.length) return null;
  const recommendedCategory = BUSINESS_TO_THEME_CATEGORY[businessType] || 'UNIVERSAL';

  // Sort themes: recommended first, then by displayOrder
  const sortedThemes = [...themes].sort((a, b) => {
    const aRec = a.category === recommendedCategory && a.category !== 'UNIVERSAL' ? 0 : 1;
    const bRec = b.category === recommendedCategory && b.category !== 'UNIVERSAL' ? 0 : 1;
    if (aRec !== bRec) return aRec - bRec;
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-4 h-4" style={{ color: 'var(--f-text-3)' }} />
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--f-text)' }}>Theme</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sortedThemes.map(theme => {
          const locked = theme.minAzmStake > (eligibility?.stakedBalance ?? 0);
          const isActive = theme.id === currentThemeId;
          const isRecommended = theme.category === recommendedCategory && theme.category !== 'UNIVERSAL';
          const tokens = theme.tokenSet || {};
          const accent = tokens.accent || 'var(--f-tint-color)';
          const bg = tokens.background || 'var(--f-bg)';
          return (
            <button key={theme.id} disabled={locked} onClick={() => onThemeChange(theme.id)}
              className={cn('relative rounded-xl border-2 p-3 transition-all text-left', locked && 'opacity-50 cursor-not-allowed')}
              style={{
                background: bg,
                borderColor: isActive ? 'var(--f-tint-color)' : 'var(--f-line)',
                boxShadow: isActive ? '0 0 0 3px var(--f-surface-sunken)' : 'none',
              }}>
              {isRecommended && !isActive && !locked && (
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                  style={{ background: 'var(--f-tint-color)', color: '#fff' }}>
                  <Sparkles size={8} />FOR YOU
                </div>
              )}
              <div className="flex gap-1 mb-2">
                <div className="w-5 h-5 rounded-md" style={{ background: accent }} />
                <div className="w-5 h-5 rounded-md border" style={{ background: tokens.surface || 'var(--f-surface)', borderColor: 'var(--f-line)' }} />
                <div className="w-5 h-5 rounded-md border" style={{ background: tokens.textPrimary || 'var(--f-text)', borderColor: 'var(--f-line)' }} />
              </div>
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--f-text)' }}>{theme.name}</p>
              {locked
                ? <div className="absolute top-2 right-2"><Lock className="w-3 h-3" style={{ color: 'var(--f-text-3)' }} /></div>
                : isActive
                  ? <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--f-tint-color)' }}>
                      <Check className="w-2.5 h-2.5 text-[var(--f-text)]" />
                    </div>
                  : null
              }
              {theme.minAzmStake > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>
                  {locked ? `Stake ${theme.minAzmStake} AZM` : (theme.tier || '').replace('NITRO_', '')}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
