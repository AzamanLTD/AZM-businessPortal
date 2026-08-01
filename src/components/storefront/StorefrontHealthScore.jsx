// src/components/storefront/StorefrontHealthScore.jsx
// Live storefront scoring panel — evaluates completeness and suggests improvements.
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Check, X, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

// ── Scoring Rules ─────────────────────────────────────────────────────
// Each rule checks whether the storefront has an essential element.
// Weight determines how much each rule contributes to the total score.

const SCORING_RULES = [
  {
    id: 'has_hero',
    label: 'Has a hero banner',
    weight: 15,
    check: (tiles) => tiles.some(t => t.widgetType === 'hero_header' || t.widgetType === 'gradient_hero'),
    suggestion: 'Add a Hero Header to make a strong first impression.',
  },
  {
    id: 'has_info_bar',
    label: 'Has business info (hours, rating)',
    weight: 10,
    check: (tiles) => tiles.some(t => t.widgetType === 'quick_info_bar'),
    suggestion: 'Add a Quick Info Bar so customers see your hours and rating at a glance.',
  },
  {
    id: 'has_products',
    label: 'Has products/services listing',
    weight: 15,
    check: (tiles) => tiles.some(t => t.widgetType === 'product_grid'),
    suggestion: 'Add a Product Grid to showcase what you offer.',
  },
  {
    id: 'has_cta',
    label: 'Has action buttons (order/book)',
    weight: 12,
    check: (tiles) => tiles.some(t => t.widgetType === 'action_buttons'),
    suggestion: 'Add Action Buttons so customers can order or book directly.',
  },
  {
    id: 'has_reviews',
    label: 'Has customer reviews',
    weight: 10,
    check: (tiles) => tiles.some(t => t.widgetType === 'review_carousel'),
    suggestion: 'Add a Review Carousel — social proof drives 40% more engagement.',
  },
  {
    id: 'has_contact',
    label: 'Has contact information',
    weight: 10,
    check: (tiles) => tiles.some(t => t.widgetType === 'contact_card'),
    suggestion: 'Add a Contact Card so customers can reach you.',
  },
  {
    id: 'has_location',
    label: 'Has location/map',
    weight: 8,
    check: (tiles) => tiles.some(t => t.widgetType === 'location_map'),
    suggestion: 'Add a Location Map so customers can find you.',
  },
  {
    id: 'has_gallery',
    label: 'Has photo gallery',
    weight: 8,
    check: (tiles) => tiles.some(t => t.widgetType === 'showcase_gallery'),
    suggestion: 'Add a Showcase Gallery — visual content increases time on page.',
  },
  {
    id: 'has_4plus_widgets',
    label: 'Has 4+ widgets',
    weight: 7,
    check: (tiles) => tiles.length >= 4,
    suggestion: 'Add more widgets — successful storefronts typically have 6+ widgets.',
  },
  {
    id: 'has_promo',
    label: 'Has promotional content',
    weight: 5,
    check: (tiles) => tiles.some(t => t.widgetType === 'promo_banner'),
    suggestion: 'Add a Promo Banner to highlight special offers and drive conversions.',
  },
];

// Smart tips based on what's present (not just what's missing)
function getEnhancementTips(tiles, businessType) {
  const tips = [];
  const hasVideo = tiles.some(t => t.widgetType === 'video_player');
  const hasSocial = tiles.some(t => t.widgetType === 'social_feed');
  const hasStats = tiles.some(t => t.widgetType === 'live_stats' || t.widgetType === 'animated_counter');
  const widgetCount = tiles.length;

  if (!hasVideo && widgetCount >= 4) {
    tips.push({
      icon: TrendingUp,
      title: 'Add video content',
      desc: 'Storefronts with video see 2x more engagement. Try the Video Player widget.',
      tier: 'NITRO_BRONZE',
    });
  }
  if (!hasSocial && widgetCount >= 5) {
    tips.push({
      icon: TrendingUp,
      title: 'Connect your social feed',
      desc: 'Show your latest Instagram posts to keep your storefront fresh and active.',
      tier: 'NITRO_BRONZE',
    });
  }
  if (!hasStats && widgetCount >= 5) {
    tips.push({
      icon: TrendingUp,
      title: 'Show live stats',
      desc: 'Display follower count, orders, or rating to build trust at a glance.',
      tier: 'NITRO_SILVER',
    });
  }
  if (widgetCount >= 6 && businessType === 'RESTAURANT') {
    tips.push({
      icon: Lightbulb,
      title: 'Pro tip for restaurants',
      desc: 'Put your best-looking food photo in the Hero Header — it\'s the #1 driver of menu orders.',
      tier: null,
    });
  }
  if (widgetCount >= 6 && businessType === 'HOTEL') {
    tips.push({
      icon: Lightbulb,
      title: 'Pro tip for hotels',
      desc: 'Use the Showcase Gallery before the Product Grid — guests browse rooms visually first.',
      tier: null,
    });
  }
  return tips.slice(0, 3);
}

function getScoreColor(score) {
  if (score >= 80) return '#1FA37A'; // success green
  if (score >= 50) return '#E2A33D'; // warning amber
  return '#E15361'; // danger red
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  if (score >= 20) return 'Getting Started';
  return 'Empty';
}

export default function StorefrontHealthScore({ draft, businessType, onAddWidget }) {
  const tiles = draft?.layoutJson?.tiles || [];
  const totalWeight = SCORING_RULES.reduce((sum, r) => sum + r.weight, 0);
  const passedWeight = SCORING_RULES.reduce((sum, r) => sum + (r.check(tiles) ? r.weight : 0), 0);
  const score = Math.round((passedWeight / totalWeight) * 100);
  const scoreColor = getScoreColor(score);
  const failedRules = SCORING_RULES.filter(r => !r.check(tiles));
  const enhancementTips = getEnhancementTips(tiles, businessType);

  // Circular progress SVG
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <GlassPanel className="p-4 space-y-4">
      {/* Score Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 70, height: 70 }}>
          <svg width="70" height="70" className="transform -rotate-90">
            <circle cx="35" cy="35" r={radius} fill="none"
              stroke="var(--f-line)" strokeWidth="4" />
            <circle cx="35" cy="35" r={radius} fill="none"
              stroke={scoreColor} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-lg font-bold" style={{ color: scoreColor }}>{score}</span>
            <span className="text-[8px] font-medium" style={{ color: 'var(--f-text-3)' }}>/100</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>Storefront Score</h3>
          <p className="text-xs" style={{ color: scoreColor, fontWeight: 600 }}>{getScoreLabel(score)}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--f-text-3)' }}>
            {tiles.length} widget{tiles.length !== 1 ? 's' : ''} · {SCORING_RULES.length - failedRules.length}/{SCORING_RULES.length} checks passed
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {SCORING_RULES.map(rule => {
          const passed = rule.check(tiles);
          return (
            <div key={rule.id} className="flex items-center gap-2 text-xs">
              {passed ? (
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(31, 163, 122, 0.15)' }}>
                  <Check className="w-2.5 h-2.5" style={{ color: '#1FA37A' }} />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(225, 83, 97, 0.1)' }}>
                  <X className="w-2.5 h-2.5" style={{ color: 'var(--f-bad)' }} />
                </div>
              )}
              <span style={{
                color: passed ? 'var(--f-text-2)' : 'var(--f-text-3)',
                textDecoration: passed ? 'none' : 'none',
              }}>
                {rule.label}
              </span>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--f-text-3)' }}>
                {rule.weight}pts
              </span>
            </div>
          );
        })}
      </div>

      {/* Smart Suggestions */}
      {failedRules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--f-text-3)' }}>
            Suggested Actions
          </p>
          {failedRules.slice(0, 3).map(rule => (
            <div key={rule.id} className="flex items-start gap-2 p-2.5 rounded-lg"
              style={{ background: 'var(--f-surface-sunken)' }}>
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--f-tint-color)' }} />
              <div className="flex-1">
                <p className="text-xs" style={{ color: 'var(--f-text-2)' }}>{rule.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhancement Tips */}
      {enhancementTips.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--f-text-3)' }}>
            Enhancement Tips
          </p>
          {enhancementTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
              style={{ background: 'var(--f-surface)', border: '1px solid var(--f-line)' }}>
              <tip.icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--f-tint-color)' }} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold" style={{ color: 'var(--f-text)' }}>{tip.title}</p>
                  {tip.tier && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }}>
                      {tip.tier.replace('NITRO_', '')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--f-text-3)' }}>{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
