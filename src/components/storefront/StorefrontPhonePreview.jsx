// src/components/storefront/StorefrontPhonePreview.jsx
// Real, per-widget preview that mirrors how Flutter renders each tile.
// Every widget type has its own mini-renderer that uses the tile's actual props.
// Widget types aligned with backend seedWidgetCatalog.js
import { Card } from '@/components/instrument';
import RetailCollectionBoxPreview from './RetailCollectionBoxPreview';
import { useState } from 'react';
import { Smartphone, Star, MapPin, Phone, MessageCircle, ShoppingBag, Image, Users, Clock, ChevronRight, Play, ExternalLink, Globe, BarChart, Hash, Code, Sparkles, Instagram, TrendingUp } from "lucide-react";
import { STOREFRONT_STUDIO_TOKENS, toPreviewPx } from '@/lib/storefrontStudioTokens';

const previewTokens = STOREFRONT_STUDIO_TOKENS.studio.preview;
const px = (value) => toPreviewPx(value);
const spacing = (name) => px(previewTokens.spacing[name]);
const typePx = (name) => px(previewTokens.type[name]);
const themeColor = (tokens, key, fallback) => tokens?.[key] || fallback;
const showcasePx = (name) => px(previewTokens.showcase[name]);
const locationPx = (name) => px(previewTokens.location[name]);
const videoPx = (name) => px(previewTokens.video[name]);

function HeroHeader({ props, business, tokens }) {
  const bg = props.mediaUrl ? `url(${props.mediaUrl}) center/cover no-repeat` : themeColor(tokens, 'accent', '#6C4FD1');
  const overlayAlpha = Math.round((props.overlayOpacity ?? 0.3) * 255).toString(16).padStart(2, '0');
  const height = previewTokens.hero.heightDp[props.height] || previewTokens.hero.heightDp.standard;

  return (
    <div style={{ height: px(height), background: bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: `#000000${overlayAlpha}` }} />
      {!props.mediaUrl && business?.coverPhotoUrl && (
        <img src={business.coverPhotoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'absolute', left: px(previewTokens.hero.sideInsetDp), right: px(previewTokens.hero.sideInsetDp), bottom: px(previewTokens.hero.bottomInsetDp), zIndex: 1 }}>
        {props.title && <p style={{ color: '#fff', fontSize: typePx('heroTitle'), fontWeight: 700, lineHeight: 1.3, marginBottom: px(previewTokens.hero.titleBottomGapDp) }}>{props.title}</p>}
        {props.subtitle && <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: typePx('heroSubtitle'), paddingTop: px(previewTokens.hero.titleBottomGapDp) }}>{props.subtitle}</p>}
      </div>
    </div>
  );
}

function QuickInfoBar({ props, business, tokens }) {
  const accent = themeColor(tokens, 'accent', '#6C4FD1');
  const textColor = themeColor(tokens, 'textSecondary', '#888');
  return (
    <div style={{ paddingLeft: px(previewTokens.quickInfo.horizontalPaddingDp), paddingRight: px(previewTokens.quickInfo.horizontalPaddingDp), paddingTop: px(previewTokens.quickInfo.verticalPaddingDp), paddingBottom: px(previewTokens.quickInfo.verticalPaddingDp), display: 'flex', columnGap: px(previewTokens.quickInfo.itemGapDp), rowGap: px(previewTokens.quickInfo.runGapDp), alignItems: 'center', borderWidth: px(1), borderStyle: 'solid', borderColor: themeColor(tokens, 'border', '#eee'), borderRadius: px(previewTokens.quickInfo.radiusDp), flexWrap: 'wrap' }}>
      {props.showRating && business?.averageRating && <div style={{ display: 'flex', alignItems: 'center', gap: px(previewTokens.quickInfo.iconLabelGapDp) }}><Star size={px(previewTokens.quickInfo.iconSizeDp)} fill={accent} color={accent} /><span style={{ fontSize: typePx('body'), color: accent, fontWeight: 700 }}>{Number(business.averageRating).toFixed(1)}</span></div>}
      {props.showCategory && business?.category && <span style={{ fontSize: typePx('body'), color: textColor, textTransform: 'capitalize' }}>{business.category.toLowerCase().replace(/_/g, ' ')}</span>}
      {props.showHours && <div style={{ display: 'flex', alignItems: 'center', gap: px(previewTokens.quickInfo.iconLabelGapDp) }}><Clock size={px(previewTokens.quickInfo.iconSizeDp)} color={textColor} /><span style={{ fontSize: typePx('body'), color: textColor }}>Open Now</span></div>}
      {props.customInfo && <span style={{ fontSize: typePx('body'), color: textColor }}>{props.customInfo}</span>}
    </div>
  );
}

function ProductGrid({ props, tokens }) {
  const accent = themeColor(tokens, 'accent', '#6C4FD1');
  const surface = themeColor(tokens, 'surface', '#f8f8f8');
  const cols = props.columns || 2;
  const count = Math.min(props.maxItems || 4, 4);
  const items = Array.from({ length: count });
  return (
    <div style={{ paddingLeft: spacing('block'), paddingRight: spacing('block'), paddingTop: spacing('block'), paddingBottom: spacing('tight') }}>
      {props.title && <p style={{ fontSize: typePx('section'), fontWeight: 700, color: themeColor(tokens, 'textPrimary', '#111'), marginBottom: px(previewTokens.productGrid.titleBottomGapDp) }}>{props.title}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, columnGap: px(previewTokens.productGrid.crossAxisSpacingDp), rowGap: px(previewTokens.productGrid.mainAxisSpacingDp) }}>
        {items.map((_, i) => (
          <div key={i} style={{ borderRadius: px(previewTokens.productGrid.cardRadiusDp), overflow: 'hidden', background: surface, aspectRatio: previewTokens.productGrid.childAspectRatio }}>
            <div style={{ height: '55%', background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={px(typePx('body') / previewTokens.type.body * 28)} color={accent} /></div>
            <div style={{ padding: px(previewTokens.productGrid.cardPaddingDp) }}>
              <div style={{ height: typePx('micro'), background: `${accent}30`, borderRadius: px(2), marginBottom: px(4) }} />
              {props.showPrice && <div style={{ height: px(8), width: '60%', background: `${accent}50`, borderRadius: px(2) }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCarousel({ props, tokens }) {
  const accent = themeColor(tokens, 'accent', '#6C4FD1');
  const surface = themeColor(tokens, 'surface', '#f8f8f8');
  return (
    <div style={{ paddingLeft: spacing('block'), paddingRight: spacing('block'), paddingTop: spacing('block'), paddingBottom: spacing('tight') }}>
      {props.title && <p style={{ fontSize: typePx('section'), fontWeight: 700, color: themeColor(tokens, 'textPrimary', '#111'), marginBottom: px(previewTokens.review.titleBottomGapDp) }}>{props.title}</p>}
      <div style={{ height: px(previewTokens.review.viewportHeightDp), display: 'flex', gap: px(previewTokens.review.cardGapDp), overflow: 'hidden' }}>
        {[5, 4].map((stars, i) => (
          <div key={i} style={{ width: px(previewTokens.review.cardWidthDp), flexShrink: 0, background: surface, borderRadius: px(previewTokens.review.cardRadiusDp), padding: px(previewTokens.review.cardPaddingDp), borderWidth: px(1), borderStyle: 'solid', borderColor: themeColor(tokens, 'border', '#eee') }}>
            <div style={{ display: 'flex', gap: px(2), marginBottom: px(previewTokens.review.bodyGapDp) }}>{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={px(previewTokens.review.starSizeDp)} fill={j < stars ? accent : 'none'} color={accent} />)}</div>
            <div style={{ height: typePx('caption'), background: '#ddd', borderRadius: px(2), marginBottom: px(2) }} />
            <div style={{ height: typePx('caption'), width: '70%', background: '#ddd', borderRadius: px(2) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactCard({ props, business, tokens }) {
  const accent = themeColor(tokens, 'accent', '#6C4FD1');
  const phone = business?.phoneNumber || null;
  const actions = [];
  if (props.showPhone && phone) actions.push({ icon: Phone, label: 'Call', color: accent });
  if (props.showWhatsApp && phone) actions.push({ icon: MessageCircle, label: 'WhatsApp', color: '#25D366' });
  if (props.showEmail) actions.push({ icon: ExternalLink, label: 'Email', color: '#EA4335' });
  if (props.showWebsite) actions.push({ icon: Globe, label: 'Website', color: '#3D74DB' });
  if (actions.length === 0) {
    actions.push({ icon: Phone, label: 'Call', color: accent });
    actions.push({ icon: MessageCircle, label: 'WhatsApp', color: '#25D366' });
  }
  return (
    <div style={{ padding: px(previewTokens.contact.cardPaddingDp), display: 'flex', gap: px(previewTokens.contact.itemGapDp), justifyContent: 'center', flexWrap: 'wrap' }}>
      {actions.map(({ icon: Icon, label, color }, i) => (
        <div key={i} style={{ flex: 1, borderRadius: px(previewTokens.contact.cardRadiusDp), borderWidth: px(1), borderStyle: 'solid', borderColor: `${color}40`, padding: px(8), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(4) }}>
          <div style={{ width: px(40), height: px(40), borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={px(previewTokens.contact.iconDp)} color={color} /></div>
          <span style={{ fontSize: typePx('body'), color, fontWeight: 600 }}>{label}</span>
          {label === 'Call' && phone && <span style={{ fontSize: typePx('caption'), color: themeColor(tokens, 'textSecondary', '#aaa') }}>{phone.substring(0, 10)}</span>}
        </div>
      ))}
    </div>
  );
}

function ShowcaseGallery({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  return (
    <div style={{ paddingLeft: spacing('block'), paddingRight: spacing('block'), paddingTop: spacing('block'), paddingBottom: spacing('tight') }}>
      {props.title && (
        <p style={{ fontSize: typePx('section'), fontWeight: 700, color: tokens.textPrimary || '#111', marginBottom: showcasePx('titleBottomGapDp') }}>{props.title}</p>
      )}
      <div style={{ display: 'flex', gap: showcasePx('itemGapDp'), height: showcasePx('viewportHeightDp'), overflow: 'hidden' }}>
        <div style={{ flex: 2, height: '100%', borderRadius: showcasePx('radiusDp'), background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image size={showcasePx('iconDp')} color={accent} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: showcasePx('itemGapDp') }}>
          {[1, 2].map(i => (
            <div key={i} style={{ flex: 1, borderRadius: showcasePx('radiusDp'), background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image size={px(typePx('body') / previewTokens.type.body * 18)} color={accent} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationMap({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  return (
    <div style={{ paddingLeft: spacing('block'), paddingRight: spacing('block'), paddingTop: spacing('block'), paddingBottom: spacing('tight') }}>
      {props.title && (
        <p style={{ fontSize: typePx('section'), fontWeight: 700, color: tokens.textPrimary || '#111', marginBottom: locationPx('titleBottomGapDp') }}>{props.title}</p>
      )}
      <div style={{ height: locationPx('mapHeightDp'), borderRadius: locationPx('radiusDp'), background: '#e8f0e8', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
          {Array.from({ length: 5 }, (_, i) => <line key={`h-${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="#888" strokeWidth="0.5" />)}
          {Array.from({ length: 4 }, (_, i) => <line key={`v-${i}`} x1={`${(i + 1) * 20}%`} y1="0" x2={`${(i + 1) * 20}%`} y2="100%" stroke="#888" strokeWidth="0.5" />)}
        </svg>
        <div style={{ zIndex: 1, width: locationPx('pinDp'), height: locationPx('pinDp'), borderRadius: '50% 50% 50% 0', background: accent, transform: 'rotate(-45deg)', boxShadow: `0 ${px(2)} ${px(8)} ${accent}80` }} />
        <div style={{ position: 'absolute', left: locationPx('badgeLeftDp'), bottom: locationPx('badgeBottomDp'), display: 'flex', alignItems: 'center', gap: px(4), paddingLeft: locationPx('badgePaddingHorizontalDp'), paddingRight: locationPx('badgePaddingHorizontalDp'), paddingTop: locationPx('badgePaddingVerticalDp'), paddingBottom: locationPx('badgePaddingVerticalDp'), borderRadius: locationPx('badgeRadiusDp'), background: '#fff', boxShadow: `0 ${px(1)} ${px(4)} rgba(0,0,0,0.12)` }}>
          <MapPin size={typePx('caption')} color={accent} />
          <span style={{ fontSize: locationPx('badgeFontSizeDp'), color: tokens.textSecondary || '#888' }}>View on Maps</span>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  const customLabel = typeof props.customLabel === 'string' && props.customLabel.trim() ? props.customLabel.trim() : null;
  const btns = [];
  if (props.showOrder)  btns.push({ label: customLabel || 'Order Now', bg: accent, color: '#fff' });
  if (props.showBook)   btns.push({ label: 'Book', bg: accent, color: '#fff' });
  if (props.showFollow) btns.push({ label: 'Follow', bg: `${accent}20`, color: accent });
  if (props.showShare)  btns.push({ label: 'Share', bg: '#f0f0f0', color: '#555' });
  if (btns.length === 0) btns.push({ label: customLabel || 'Order Now', bg: accent, color: '#fff' });
  return (
    <div style={{ padding: '8px 8px 6px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {btns.map(({ label, bg, color }, i) => (
        <div key={i} style={{ flex: 1, minWidth: 40, borderRadius: 6, padding: '5px 6px', background: bg, textAlign: 'center' }}>
          <span style={{ fontSize: 8, color, fontWeight: 700 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── NITRO BRONZE renderers ──

function VideoPlayer({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  return (
    <div style={{ marginLeft: spacing('block'), marginRight: spacing('block'), marginBottom: spacing('tight'), borderRadius: videoPx('radiusDp'), height: videoPx('heightDp'), background: `${accent}15`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {props.posterUrl && (
        <img src={props.posterUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {props.videoUrl && (
        <video src={props.videoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} muted={props.muted} loop={props.loop} autoPlay={props.autoplay} />
      )}
      <div style={{ position: 'relative', zIndex: 1, width: videoPx('playButtonDp'), height: videoPx('playButtonDp'), borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Play size={typePx('body')} color="#fff" fill="#fff" />
      </div>
    </div>
  );
}

function PromoBanner({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  const bg = props.backgroundColor || `${accent}15`;
  const border = props.backgroundColor ? `${props.backgroundColor}40` : `${accent}30`;
  return (
    <div style={{ margin: '0 8px 4px', borderRadius: 8, background: bg, border: `1px solid ${border}`, padding: '8px 10px' }}>
      {props.title && <p style={{ fontSize: 9, fontWeight: 700, color: props.backgroundColor ? '#fff' : accent, marginBottom: 2 }}>{props.title}</p>}
      {props.subtitle && <p style={{ fontSize: 8, color: props.backgroundColor ? 'rgba(255,255,255,0.85)' : (tokens.textSecondary || '#666'), lineHeight: 1.3 }}>{props.subtitle}</p>}
      {props.ctaText && (
        <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 2, padding: '3px 8px', borderRadius: 4, background: props.backgroundColor ? 'rgba(255,255,255,0.2)' : accent }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: props.backgroundColor ? '#fff' : '#fff' }}>{props.ctaText}</span>
          <ChevronRight size={8} color={props.backgroundColor ? '#fff' : '#fff'} />
        </div>
      )}
    </div>
  );
}

function SocialFeed({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  const platform = props.platform || 'instagram';
  const platformIcons = { instagram: Instagram, tiktok: Sparkles, facebook: Users };
  const PlatformIcon = platformIcons[platform] || Instagram;
  const count = Math.min(props.maxPosts || 6, 3);
  return (
    <div style={{ padding: '8px 8px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
        <PlatformIcon size={12} color={accent} />
        <p style={{ fontSize: 9, fontWeight: 700, color: tokens.textPrimary || '#111' }}>
          {props.handle ? `@${props.handle}` : `Latest Posts`}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={12} color={`${accent}80`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NITRO SILVER renderers ──

function LiveStats({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  const stats = [];
  if (props.showFollowers) stats.push({ label: 'Followers', value: '1.2K' });
  if (props.showReviews) stats.push({ label: 'Reviews', value: '340' });
  if (props.showOrders) stats.push({ label: 'Orders', value: '5.8K' });
  if (props.showRating) stats.push({ label: 'Rating', value: '4.8★' });
  if (stats.length === 0) stats.push({ label: 'Followers', value: '1.2K' }, { label: 'Reviews', value: '340' });
  return (
    <div style={{ padding: '8px 8px 6px', display: 'flex', justifyContent: 'space-around' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: accent }}>{s.value}</p>
          <p style={{ fontSize: 7, color: tokens.textSecondary || '#888', marginTop: 1 }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function AnimatedCounter({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  return (
    <div style={{ padding: '10px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: 22, fontWeight: 900, color: accent }}>
        {props.prefix || ''}{props.value ?? 0}{props.suffix || ''}
      </p>
      {props.label && (
        <p style={{ fontSize: 8, color: tokens.textSecondary || '#888', marginTop: 2 }}>{props.label}</p>
      )}
    </div>
  );
}

// ── NITRO GOLD renderers ──

function CustomHtml({ props, tokens }) {
  // Preview the raw HTML in a constrained box (sanitization happens on render in Flutter)
  return (
    <div style={{ margin: '0 8px 4px', borderRadius: 8, border: `1px solid ${tokens.border || '#eee'}`, padding: '6px 8px', overflow: 'hidden' }}>
      {props.html ? (
        <div style={{ fontSize: 8, color: tokens.textPrimary || '#111', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: props.html.substring(0, 500) }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.5 }}>
          <Code size={12} color={tokens.textSecondary || '#888'} />
          <span style={{ fontSize: 8, color: tokens.textSecondary || '#888' }}>Custom HTML block</span>
        </div>
      )}
    </div>
  );
}

function GradientHero({ props, tokens }) {
  const from = props.gradientFrom || '#6C4FD1';
  const to = props.gradientTo || '#E07B30';
  return (
    <div style={{ height: 90, background: `linear-gradient(135deg, ${from}, ${to})`, position: 'relative', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 12px' }}>
      <Sparkles size={14} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: 8, right: 8 }} />
      {props.title && (
        <p style={{ color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: 1.3, marginBottom: 2, position: 'relative', zIndex: 1 }}>{props.title}</p>
      )}
      {props.subtitle && (
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, position: 'relative', zIndex: 1 }}>{props.subtitle}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Widget registry — keys MUST match backend seedWidgetCatalog.js
// ─────────────────────────────────────────────────────────────

const WIDGET_RENDERERS = {
  // FREE
  hero_header:         HeroHeader,
  quick_info_bar:      QuickInfoBar,
  product_grid:        ProductGrid,
  showcase_gallery:    ShowcaseGallery,
  review_carousel:     ReviewCarousel,
  contact_card:        ContactCard,
  location_map:        LocationMap,
  action_buttons:      ActionButtons,
  retail_collection_box: RetailCollectionBoxPreview,
  // NITRO_BRONZE
  video_player:        VideoPlayer,
  promo_banner:        PromoBanner,
  social_feed:         SocialFeed,
  // NITRO_SILVER
  live_stats:          LiveStats,
  animated_counter:    AnimatedCounter,
  // NITRO_GOLD
  custom_html:         CustomHtml,
  gradient_hero:       GradientHero,
};

function FallbackTile({ tile, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  return (
    <div style={{ margin: '4px 8px', borderRadius: 8, border: `1px dashed ${accent}40`, padding: '8px 10px', opacity: 0.7 }}>
      <p style={{ fontSize: 9, fontWeight: 600, color: accent, textTransform: 'capitalize' }}>
        {(tile.widgetType || '').replace(/_/g, ' ')}
      </p>
      {tile.props?.title && (
        <p style={{ fontSize: 8, color: tokens.textSecondary || '#888', marginTop: 2 }}>{tile.props.title}</p>
      )}
    </div>
  );
}

// Business-type-specific nav bar tabs
function getNavTabs(businessType) {
  const tabs = {
    RESTAURANT: ['Home', 'Menu', 'Orders', 'Profile'],
    HOTEL: ['Home', 'Rooms', 'Book', 'Profile'],
    TRANSIT: ['Home', 'Trips', 'Tickets', 'Profile'],
    RETAIL: ['Home', 'Shop', 'Orders', 'Profile'],
    SERVICES: ['Home', 'Services', 'Book', 'Profile'],
    GENERAL: ['Home', 'About', 'Contact', 'Profile'],
  };
  return tabs[businessType] || tabs.GENERAL;
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function StorefrontPhonePreview({ draft, theme, widgets, business, businessType, selectedTileId, onSelectTile, editorMode = false, onDropTile }) {
  const [dropTarget, setDropTarget] = useState(null);
  const tokens  = theme?.tokenSet || {};
  const accent  = tokens.accent    || 'var(--f-tint-color)';
  const bg      = tokens.background || '#ffffff';
  const surface = tokens.surface    || '#f8f8f8';
  const textPrimary = tokens.textPrimary || '#111111';
  const tiles   = draft?.layoutJson?.tiles || [];

  // Sort tiles by row position so they appear in layout order
  const sortedTiles = [...tiles].sort((a, b) => (a.position?.row ?? 0) - (b.position?.row ?? 0));

  const businessInfo = business || {
    name: draft?.businessName || 'Your Business',
    logoUrl: null,
    coverPhotoUrl: null,
    averageRating: null,
    phoneNumber: null,
    category: null,
  };

  const navTabs = getNavTabs(businessType);

  return (
    <GlassPanel solid className="p-3">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-3 h-3" style={{ color: 'var(--f-text-3)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--f-text-3)' }}>Live Preview</span>
        </div>
        {theme && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }}>
            {theme.name}
          </span>
        )}
      </div>

      {/* Phone frame */}
      <div
        className="rounded-[28px] border-4 overflow-hidden shadow-2xl mx-auto"
        style={{ borderColor: 'var(--f-surface-raised)', width: 220, background: bg }}
      >
        {/* Status bar */}
        <div className="flex justify-between items-center px-4 py-1.5 text-[10px]"
          style={{ background: accent, color: '#fff' }}>
          <span className="font-semibold">9:41</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <span>●●●</span><span>WiFi</span><span>100%</span>
          </div>
        </div>

        {/* Business identity strip */}
        <div style={{ padding: '10px 12px 8px', textAlign: 'center', background: surface, borderBottom: `1px solid ${tokens.border || '#eee'}` }}>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: accent, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>
                {(businessInfo.name || 'B').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <p style={{ fontSize: 10, fontWeight: 700, color: textPrimary }}>{businessInfo.name || 'Your Business'}</p>
          <p style={{ fontSize: 8, color: tokens.textSecondary || '#888', marginTop: 1 }}>Tap to follow</p>
        </div>

        {/* Widget tiles */}
        <div style={{ minHeight: 280, overflowY: 'auto', background: bg }}>
          {sortedTiles.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
              <p style={{ fontSize: 9, color: tokens.textSecondary || '#aaa', textAlign: 'center' }}>
                Add widgets from the left panel
              </p>
            </div>
          ) : (
            sortedTiles.map(tile => {
              const Renderer = WIDGET_RENDERERS[tile.widgetType];
              if (!Renderer) return <FallbackTile key={tile.id} tile={tile} tokens={tokens} />;
              const selected = editorMode && selectedTileId === tile.id;
              const isBefore = dropTarget?.tileId === tile.id && dropTarget.edge === 'before';
              const isAfter = dropTarget?.tileId === tile.id && dropTarget.edge === 'after';
              const resolveDrop = (event) => {
                event.preventDefault();
                const type = event.dataTransfer.getData('application/x-azm-studio-node');
                if (!type || !editorMode || !onDropTile) return null;
                const rect = event.currentTarget.getBoundingClientRect();
                return { tileId: tile.id, edge: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after', type };
              };
              return (
                <div key={tile.id}>
                  {isBefore && <div style={{ height: 3, margin: '0 8px', borderRadius: 999, background: accent }} aria-hidden="true" />}
                  <div
                    role={editorMode ? 'button' : undefined}
                    tabIndex={editorMode ? 0 : undefined}
                    onClick={editorMode ? (event) => { event.stopPropagation(); onSelectTile?.(tile.id); } : undefined}
                    onKeyDown={editorMode ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectTile?.(tile.id); } } : undefined}
                    onDragOver={editorMode && onDropTile ? (event) => { const target = resolveDrop(event); if (target) setDropTarget(target); } : undefined}
                    onDragLeave={editorMode ? () => setDropTarget((current) => current?.tileId === tile.id ? null : current) : undefined}
                    onDrop={editorMode && onDropTile ? (event) => { const target = resolveDrop(event); setDropTarget(null); if (target) { event.stopPropagation(); onDropTile(target.tileId, target.edge, target.type); } } : undefined}
                    style={{
                      position: 'relative',
                      borderBottom: `1px solid ${tokens.border || '#f0f0f0'}`,
                      outline: selected ? `2px solid ${accent}` : 'none',
                      outlineOffset: -2,
                      cursor: editorMode ? 'pointer' : undefined,
                    }}
                  >
                    {selected && (
                      <div style={{ position: 'absolute', top: 3, right: 4, zIndex: 5, fontSize: 7, fontWeight: 800, color: '#fff', background: accent, borderRadius: 4, padding: '2px 4px', pointerEvents: 'none' }}>Editing</div>
                    )}
                    <Renderer props={tile.props || {}} business={businessInfo} tokens={tokens} />
                  </div>
                  {isAfter && <div style={{ height: 3, margin: '0 8px', borderRadius: 999, background: accent }} aria-hidden="true" />}
                </div>
              );
            })
          )}
        </div>

        {/* Nav bar — adapts to business type */}
        <div style={{ height: 32, background: surface, borderTop: `1px solid ${tokens.border || '#eee'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 16px' }}>
          {navTabs.map((tab, i) => (
            <div key={tab} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? accent : `${accent}20` }} />
              <span style={{ fontSize: 5, color: i === 0 ? accent : tokens.textSecondary || '#aaa', fontWeight: i === 0 ? 700 : 400 }}>{tab}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
