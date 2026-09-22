import { describe, it, expect } from 'vitest';

const TIER_THRESHOLDS = { FREE: 0, NITRO_BRONZE: 500, NITRO_SILVER: 1500, NITRO_GOLD: 5000 };

function getTierForStake(staked) {
  if (staked >= TIER_THRESHOLDS.NITRO_GOLD) return 'NITRO_GOLD';
  if (staked >= TIER_THRESHOLDS.NITRO_SILVER) return 'NITRO_SILVER';
  if (staked >= TIER_THRESHOLDS.NITRO_BRONZE) return 'NITRO_BRONZE';
  return 'FREE';
}

const WIDGET_TIERS = {
  hero_header: 'FREE', category_grid: 'FREE', product_list: 'FREE',
  business_info: 'FREE', hours_card: 'FREE', contact_card: 'FREE',
  photo_gallery: 'FREE', reviews_carousel: 'FREE',
  video_header: 'NITRO_BRONZE', announcement_bar: 'NITRO_BRONZE', social_proof: 'NITRO_BRONZE',
  live_rate_ticker: 'NITRO_SILVER', glass_card: 'NITRO_SILVER',
  custom_embed: 'NITRO_GOLD', loyalty_program: 'NITRO_GOLD',
};

const TIER_RANK = { FREE: 0, NITRO_BRONZE: 1, NITRO_SILVER: 2, NITRO_GOLD: 3 };

function isWidgetLocked(widgetType, currentTier) {
  const required = WIDGET_TIERS[widgetType] || 'FREE';
  return TIER_RANK[required] > TIER_RANK[currentTier];
}

describe('Storefront Tier Logic', () => {
  it('correctly maps stake amounts to tiers', () => {
    expect(getTierForStake(0)).toBe('FREE');
    expect(getTierForStake(499)).toBe('FREE');
    expect(getTierForStake(500)).toBe('NITRO_BRONZE');
    expect(getTierForStake(1499)).toBe('NITRO_BRONZE');
    expect(getTierForStake(1500)).toBe('NITRO_SILVER');
    expect(getTierForStake(4999)).toBe('NITRO_SILVER');
    expect(getTierForStake(5000)).toBe('NITRO_GOLD');
  });

  it('locks premium widgets for FREE tier', () => {
    expect(isWidgetLocked('hero_header', 'FREE')).toBe(false);
    expect(isWidgetLocked('video_header', 'FREE')).toBe(true);
    expect(isWidgetLocked('glass_card', 'FREE')).toBe(true);
    expect(isWidgetLocked('loyalty_program', 'FREE')).toBe(true);
  });

  it('unlocks bronze widgets at BRONZE tier', () => {
    expect(isWidgetLocked('video_header', 'NITRO_BRONZE')).toBe(false);
    expect(isWidgetLocked('announcement_bar', 'NITRO_BRONZE')).toBe(false);
    expect(isWidgetLocked('glass_card', 'NITRO_BRONZE')).toBe(true);
  });

  it('unlocks everything at GOLD tier', () => {
    Object.keys(WIDGET_TIERS).forEach(widget => {
      expect(isWidgetLocked(widget, 'NITRO_GOLD')).toBe(false);
    });
  });
});
