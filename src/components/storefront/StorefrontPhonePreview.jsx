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
const promoPx = (name) => px(previewTokens.promo[name]);
const socialPx = (name) => px(previewTokens.social[name]);
const liveStatsPx = (name) => px(previewTokens.liveStats[name]);
const counterPx = (name) => px(previewTokens.animatedCounter[name]);
const customHtmlPx = (name) => px(previewTokens.customHtml[name]);
const gradientHeroPx = (name) => px(previewTokens.gradientHero[name]);
const actionPx = (name) => px(previewTokens.actionButtons[name]);
const fallbackPx = (name) => px(previewTokens.fallback[name]);
const selectionPx = (name) => px(previewTokens.selection[name]);
const chromePx = (name) => px(previewTokens.chrome[name]);
const framePx = (name) => px(STOREFRONT_STUDIO_TOKENS.studio.frame[name]);

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
    <div style={{ paddingLeft: px(previewTokens.quickInfo.horizontalPaddingDp), paddingRight: px(previewTokens.quickInfo.horizontalPaddingDp), paddingTop: px(previewTokens.quickInfo.verticalPaddingDp), paddingBottom: px(previewTokens.quickInfo.verticalPaddingDp), display: 'flex', columnGap: px(previewTokens.quickInfo.itemGapDp), rowGap: px(previewTokens.quickInfo.runGapDp), alignItems: 'center', borderWidth: px(previewTokens.quickInfo.borderWidthDp), borderStyle: 'solid', borderColor: themeColor(tokens, 'border', '#eee'), borderRadius: px(previewTokens.quickInfo.radiusDp), flexWrap: 'wrap' }}>
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
            <div style={{ height: '55%', background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={px(previewTokens.productGrid.iconDp)} color={accent} /></div>
            <div style={{ padding: px(previewTokens.productGrid.cardPaddingDp) }}>
              <div style={{ height: typePx('micro'), background: `${accent}30`, borderRadius: px(previewTokens.productGrid.placeholderRadiusDp), marginBottom: px(previewTokens.productGrid.placeholderGapDp) }} />
              {props.showPrice && <div style={{ height: px(previewTokens.productGrid.priceBarHeightDp), width: '60%', background: `${accent}50`, borderRadius: px(previewTokens.productGrid.placeholderRadiusDp) }} />}
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
          <div key={i} style={{ width: px(previewTokens.review.cardWidthDp), flexShrink: 0, background: surface, borderRadius: px(previewTokens.review.cardRadiusDp), padding: px(previewTokens.review.cardPaddingDp), borderWidth: px(previewTokens.review.borderWidthDp), borderStyle: 'solid', borderColor: themeColor(tokens, 'border', '#eee') }}>
            <div style={{ display: 'flex', gap: px(previewTokens.review.starGapDp), marginBottom: px(previewTokens.review.bodyGapDp) }}>{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={px(previewTokens.review.starSizeDp)} fill={j < stars ? accent : 'none'} color={accent} />)}</div>
            <div style={{ height: typePx('caption'), background: '#ddd', borderRadius: px(previewTokens.review.skeletonRadiusDp), marginBottom: px(previewTokens.review.skeletonGapDp) }} />
            <div style={{ height: typePx('caption'), width: '70%', background: '#ddd', borderRadius: px(previewTokens.review.skeletonRadiusDp) }} />
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
        <div key={i} style={{ flex: 1, borderRadius: px(previewTokens.contact.cardRadiusDp), borderWidth: px(previewTokens.contact.borderWidthDp), borderStyle: 'solid', borderColor: `${color}40`, padding: px(previewTokens.contact.actionInnerGapDp * 2), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(previewTokens.contact.actionInnerGapDp) }}>
          <div style={{ width: px(previewTokens.contact.actionCircleDp), height: px(previewTokens.contact.actionCircleDp), borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={px(previewTokens.contact.iconDp)} color={color} /></div>
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
      <div style={{ display: 'flex', gap: showcasePx('itemGapDp'), height: showcasePx('viewportHeightDp'), overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ flex: `0 0 ${showcasePx('cardWidthDp')}`, height: '100%', borderRadius: showcasePx('radiusDp'), background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image size={showcasePx('iconDp')} color={accent} />
        </div>
        {[1, 2].map(i => (
          <div key={i} style={{ flex: `0 0 ${showcasePx('cardWidthDp')}`, height: '100%', borderRadius: showcasePx('radiusDp'), background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={showcasePx('secondaryIconDp')} color={accent} />
          </div>
        ))}
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
        <div style={{ zIndex: 1, width: locationPx('pinDp'), height: locationPx('pinDp'), borderRadius: '50% 50% 50% 0', background: accent, transform: 'rotate(-45deg)', boxShadow: `0 ${locationPx('shadowYDp')} ${locationPx('shadowBlurDp')} ${accent}80` }} />
        <div style={{ position: 'absolute', left: locationPx('badgeLeftDp'), bottom: locationPx('badgeBottomDp'), display: 'flex', alignItems: 'center', gap: locationPx('badgeGapDp'), paddingLeft: locationPx('badgePaddingHorizontalDp'), paddingRight: locationPx('badgePaddingHorizontalDp'), paddingTop: locationPx('badgePaddingVerticalDp'), paddingBottom: locationPx('badgePaddingVerticalDp'), borderRadius: locationPx('badgeRadiusDp'), background: '#fff', boxShadow: `0 ${locationPx('badgeShadowYDp')} ${locationPx('badgeShadowBlurDp')} rgba(0,0,0,0.12)` }}>
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
    <div style={{ paddingLeft: actionPx('horizontalPaddingDp'), paddingRight: actionPx('horizontalPaddingDp'), paddingTop: actionPx('topPaddingDp'), paddingBottom: actionPx('bottomPaddingDp'), display: 'flex', gap: actionPx('itemGapDp'), flexWrap: 'wrap' }}>
      {btns.map(({ label, bg, color }, i) => (
        <div key={i} style={{ flex: 1, minWidth: actionPx('minWidthDp'), borderRadius: actionPx('radiusDp'), paddingTop: actionPx('verticalPaddingDp'), paddingBottom: actionPx('verticalPaddingDp'), paddingLeft: actionPx('buttonHorizontalPaddingDp'), paddingRight: actionPx('buttonHorizontalPaddingDp'), background: bg, textAlign: 'center' }}>
          <span style={{ fontSize: typePx('micro'), color, fontWeight: 700 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── NITRO BRONZE renderers ──

function VideoPlayer({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  const hasMedia = Boolean(props.posterUrl || props.videoUrl);
  return (
    <div style={{ marginLeft: spacing('block'), marginRight: spacing('block'), marginBottom: spacing('tight'), borderRadius: videoPx('radiusDp'), height: videoPx('heightDp'), background: `${accent}15`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {props.posterUrl && (
        <img src={props.posterUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {props.videoUrl && (
        <video src={props.videoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} muted={props.muted} loop={props.loop} autoPlay={props.autoplay} />
      )}
      {hasMedia ? (
        <div style={{ position: 'relative', zIndex: 1, width: videoPx('playButtonDp'), height: videoPx('playButtonDp'), borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={typePx('body')} color="#fff" fill="#fff" />
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: videoPx('fallbackGapDp') }}>
          <Play size={videoPx('fallbackIconDp')} color={accent} />
          <span style={{ fontSize: videoPx('fallbackFontSizeDp'), color: tokens.textSecondary || '#888' }}>Video unavailable</span>
        </div>
      )}
    </div>
  );
}

function PromoBanner({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  const bg = props.backgroundColor || `${accent}15`;
  const border = props.backgroundColor ? `${props.backgroundColor}40` : `${accent}30`;
  return (
    <div style={{ marginLeft: spacing('block'), marginRight: spacing('block'), borderRadius: promoPx('radiusDp'), background: bg, borderWidth: promoPx('borderWidthDp'), borderStyle: 'solid', borderColor: border, paddingLeft: promoPx('horizontalPaddingDp'), paddingRight: promoPx('horizontalPaddingDp'), paddingTop: promoPx('verticalPaddingDp'), paddingBottom: promoPx('verticalPaddingDp') }}>
      {props.title && <p style={{ fontSize: promoPx('titleFontSizeDp'), fontWeight: 700, color: props.backgroundColor ? '#fff' : accent, marginBottom: promoPx('titleSubtitleGapDp') }}>{props.title}</p>}
      {props.subtitle && <p style={{ fontSize: promoPx('subtitleFontSizeDp'), color: props.backgroundColor ? 'rgba(255,255,255,0.85)' : (tokens.textSecondary || '#666'), lineHeight: 1.3 }}>{props.subtitle}</p>}
      {props.ctaText && (
        <div style={{ marginTop: promoPx('ctaGapDp'), display: 'inline-flex', alignItems: 'center', gap: px(previewTokens.type.nav), padding: `${promoPx('verticalPaddingDp')} ${promoPx('ctaGapDp')}`, borderRadius: promoPx('ctaRadiusDp'), background: props.backgroundColor ? 'rgba(255,255,255,0.2)' : accent }}>
          <span style={{ fontSize: typePx('micro'), fontWeight: 700, color: '#fff' }}>{props.ctaText}</span>
          <ChevronRight size={typePx('small')} color="#fff" />
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
    <div style={{ paddingLeft: spacing('block'), paddingRight: spacing('block'), paddingTop: spacing('block'), paddingBottom: spacing('tight') }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: socialPx('platformIconGapDp'), marginBottom: socialPx('titleBottomGapDp') }}>
        <PlatformIcon size={socialPx('platformIconDp')} color={accent} />
        <p style={{ fontSize: typePx('section'), fontWeight: 700, color: tokens.textPrimary || '#111' }}>
          {props.handle ? `@${props.handle}` : 'Latest Posts'}
        </p>
      </div>
      <div style={{ height: socialPx('viewportHeightDp'), display: 'grid', gridTemplateColumns: `repeat(${previewTokens.social.gridCrossAxisCount}, 1fr)`, gap: socialPx('gridSpacingDp'), overflow: 'hidden' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ width: socialPx('itemWidthDp'), height: '100%', borderRadius: socialPx('itemRadiusDp'), background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={socialPx('itemIconDp')} color={`${accent}80`} />
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
    <div style={{ paddingLeft: liveStatsPx('horizontalPaddingDp'), paddingRight: liveStatsPx('horizontalPaddingDp'), paddingTop: liveStatsPx('verticalPaddingDp'), paddingBottom: liveStatsPx('verticalPaddingDp'), borderRadius: liveStatsPx('radiusDp') }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: liveStatsPx('valueFontSizeDp'), fontWeight: 800, color: accent }}>{s.value}</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: liveStatsPx('iconLabelGapDp'), marginTop: liveStatsPx('valueLabelGapDp') }}>
            <BarChart size={liveStatsPx('iconDp')} color={tokens.textSecondary || '#888'} />
            <p style={{ fontSize: liveStatsPx('labelFontSizeDp'), color: tokens.textSecondary || '#888' }}>{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnimatedCounter({ props, tokens }) {
  const accent = tokens.accent || '#6C4FD1';
  return (
    <div style={{ paddingLeft: counterPx('horizontalPaddingDp'), paddingRight: counterPx('horizontalPaddingDp'), paddingTop: counterPx('verticalPaddingDp'), paddingBottom: counterPx('verticalPaddingDp'), borderRadius: counterPx('radiusDp'), textAlign: 'center' }}>
      <p style={{ fontSize: counterPx('valueFontSizeDp'), fontWeight: 900, color: accent }}>
        {props.prefix || ''}{props.value ?? 0}{props.suffix || ''}
      </p>
      {props.label && (
        <p style={{ fontSize: counterPx('labelFontSizeDp'), color: tokens.textSecondary || '#888', marginTop: counterPx('labelGapDp') }}>{props.label}</p>
      )}
    </div>
  );
}

// ── NITRO GOLD renderers ──

function CustomHtml({ props, tokens }) {
  // Preview the raw HTML in a constrained box (sanitization happens on render in Flutter)
  return (
    <div style={{ marginRight: customHtmlPx('marginHorizontalDp'), marginBottom: customHtmlPx('marginBottomDp'), marginLeft: customHtmlPx('marginHorizontalDp'), borderRadius: customHtmlPx('radiusDp'), borderWidth: customHtmlPx('borderWidthDp'), borderStyle: 'solid', borderColor: tokens.border || '#eee', padding: customHtmlPx('paddingDp'), overflow: 'hidden' }}>
      {props.html ? (
        <div style={{ fontSize: customHtmlPx('contentFontSizeDp'), color: tokens.textPrimary || '#111', lineHeight: previewTokens.customHtml.contentLineHeight, maxHeight: customHtmlPx('contentMaxHeightDp'), overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: props.html.substring(0, 500) }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: customHtmlPx('emptyGapDp'), opacity: 0.5 }}>
          <Code size={typePx('body')} color={tokens.textSecondary || '#888'} />
          <span style={{ fontSize: customHtmlPx('emptyFontSizeDp'), color: tokens.textSecondary || '#888' }}>Custom HTML block</span>
        </div>
      )}
    </div>
  );
}

function GradientHero({ props, tokens }) {
  const from = props.gradientFrom || '#6C4FD1';
  const to = props.gradientTo || '#E07B30';
  return (
    <div style={{ height: gradientHeroPx('heightDp'), background: `linear-gradient(135deg, ${from}, ${to})`, borderRadius: gradientHeroPx('radiusDp'), position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <Sparkles size={gradientHeroPx('iconDp')} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: gradientHeroPx('iconInsetDp'), right: gradientHeroPx('iconInsetDp') }} />
      <div style={{ position: 'absolute', left: gradientHeroPx('horizontalInsetDp'), right: gradientHeroPx('horizontalInsetDp'), bottom: gradientHeroPx('bottomInsetDp'), zIndex: 1 }}>
        {props.title && (
          <p style={{ color: '#fff', fontSize: gradientHeroPx('titleFontSizeDp'), fontWeight: 800, lineHeight: previewTokens.gradientHero.lineHeight, marginBottom: gradientHeroPx('titleSubtitleGapDp') }}>{props.title}</p>
        )}
        {props.subtitle && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: gradientHeroPx('subtitleFontSizeDp') }}>{props.subtitle}</p>}
      </div>
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
    <div style={{ marginTop: fallbackPx('marginVerticalDp'), marginRight: fallbackPx('marginHorizontalDp'), marginBottom: fallbackPx('marginVerticalDp'), marginLeft: fallbackPx('marginHorizontalDp'), borderRadius: fallbackPx('radiusDp'), borderWidth: fallbackPx('borderWidthDp'), borderStyle: 'dashed', borderColor: `${accent}40`, paddingTop: fallbackPx('paddingVerticalDp'), paddingRight: fallbackPx('paddingHorizontalDp'), paddingBottom: fallbackPx('paddingVerticalDp'), paddingLeft: fallbackPx('paddingHorizontalDp'), opacity: 0.7 }}>
      <p style={{ fontSize: fallbackPx('titleFontSizeDp'), fontWeight: 600, color: accent, textTransform: 'capitalize' }}>
        {(tile.widgetType || '').replace(/_/g, ' ')}
      </p>
      {tile.props?.title && (
        <p style={{ fontSize: fallbackPx('subtitleFontSizeDp'), color: tokens.textSecondary || '#888', marginTop: fallbackPx('titleSubtitleGapDp') }}>{tile.props.title}</p>
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
    <Card className="p-3">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center" style={{ gap: chromePx('panelGapDp') }}>
          <Smartphone style={{ width: typePx('nav'), height: typePx('nav'), color: 'var(--f-text-3)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--f-text-3)' }}>Live Preview</span>
        </div>
        {theme && (
          <span className="px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)', fontSize: typePx('micro') }}>
            {theme.name}
          </span>
        )}
      </div>

      {/* Phone frame */}
      <div
        className="overflow-hidden shadow-2xl mx-auto"
        style={{ borderColor: 'var(--f-surface-raised)', borderWidth: framePx('borderWidthDp'), borderStyle: 'solid', borderRadius: framePx('radiusDp'), width: framePx('widthDp'), height: framePx('heightDp'), background: bg }}
      >
        {/* Status bar */}
        <div className="flex justify-between items-center"
          style={{ paddingLeft: chromePx('statusBarHorizontalPaddingDp'), paddingRight: chromePx('statusBarHorizontalPaddingDp'), paddingTop: chromePx('statusBarVerticalPaddingDp'), paddingBottom: chromePx('statusBarVerticalPaddingDp'), fontSize: chromePx('statusBarFontSizeDp'), background: accent, color: '#fff' }}>
          <span className="font-semibold">9:41</span>
          <div style={{ display: 'flex', gap: chromePx('statusBarIconGapDp') }}>
            <span>●●●</span><span>WiFi</span><span>100%</span>
          </div>
        </div>

        {/* Business identity strip */}
        <div style={{ paddingTop: chromePx('identityVerticalPaddingTopDp'), paddingRight: chromePx('identityHorizontalPaddingDp'), paddingBottom: chromePx('identityVerticalPaddingBottomDp'), paddingLeft: chromePx('identityHorizontalPaddingDp'), textAlign: 'center', background: surface, borderBottom: `${chromePx('identityBorderWidthDp')} solid ${tokens.border || '#eee'}` }}>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="" style={{ width: chromePx('identityAvatarDp'), height: chromePx('identityAvatarDp'), borderRadius: '50%', objectFit: 'cover', margin: `0 auto ${chromePx('identityAvatarBottomGapDp')}` }} />
          ) : (
            <div style={{ width: chromePx('identityAvatarDp'), height: chromePx('identityAvatarDp'), borderRadius: '50%', background: accent, margin: `0 auto ${chromePx('identityAvatarBottomGapDp')}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: typePx('identity'), fontWeight: 900, color: '#fff' }}>
                {(businessInfo.name || 'B').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <p style={{ fontSize: chromePx('identityNameFontSizeDp'), fontWeight: 700, color: textPrimary }}>{businessInfo.name || 'Your Business'}</p>
          <p style={{ fontSize: chromePx('identityFollowFontSizeDp'), color: tokens.textSecondary || '#888', marginTop: chromePx('identityFollowTopGapDp') }}>Tap to follow</p>
        </div>

        {/* Widget tiles */}
        <div style={{ minHeight: chromePx('widgetViewportMinHeightDp'), overflowY: 'auto', overflowX: 'hidden', background: bg, overscrollBehavior: 'contain' }}>
          {sortedTiles.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: chromePx('emptyStateHeightDp') }}>
              <p style={{ fontSize: typePx('caption'), color: tokens.textSecondary || '#aaa', textAlign: 'center' }}>
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
                  {isBefore && <div style={{ height: selectionPx('dropMarkerHeightDp'), marginLeft: selectionPx('dropMarkerMarginHorizontalDp'), marginRight: selectionPx('dropMarkerMarginHorizontalDp'), borderRadius: selectionPx('dropMarkerRadiusDp'), background: accent }} aria-hidden="true" />}
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
                      borderBottom: `${selectionPx('borderWidthDp')} solid ${tokens.border || '#f0f0f0'}`,
                      outline: selected ? `${selectionPx('outlineWidthDp')} solid ${accent}` : 'none',
                      outlineOffset: selectionPx('outlineOffsetDp') * -1,
                      cursor: editorMode ? 'pointer' : undefined,
                    }}
                  >
                    {selected && (
                      <div style={{ position: 'absolute', top: selectionPx('badgeTopDp'), right: selectionPx('badgeRightDp'), zIndex: 5, fontSize: fallbackPx('titleFontSizeDp'), fontWeight: 800, color: '#fff', background: accent, borderRadius: selectionPx('badgeRadiusDp'), paddingTop: selectionPx('badgeVerticalPaddingDp'), paddingRight: selectionPx('badgeHorizontalPaddingDp'), paddingBottom: selectionPx('badgeVerticalPaddingDp'), paddingLeft: selectionPx('badgeHorizontalPaddingDp'), pointerEvents: 'none' }}>Editing</div>
                    )}
                    <Renderer props={tile.props || {}} business={businessInfo} tokens={tokens} />
                  </div>
                  {isAfter && <div style={{ height: selectionPx('dropMarkerHeightDp'), marginLeft: selectionPx('dropMarkerMarginHorizontalDp'), marginRight: selectionPx('dropMarkerMarginHorizontalDp'), borderRadius: selectionPx('dropMarkerRadiusDp'), background: accent }} aria-hidden="true" />}
                </div>
              );
            })
          )}
        </div>

        {/* Nav bar — adapts to business type */}
        <div style={{ height: chromePx('navHeightDp'), background: surface, borderTop: `${chromePx('identityBorderWidthDp')} solid ${tokens.border || '#eee'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingLeft: chromePx('navHorizontalPaddingDp'), paddingRight: chromePx('navHorizontalPaddingDp') }}>
          {navTabs.map((tab, i) => (
            <div key={tab} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: chromePx('navItemGapDp') }}>
              <div style={{ width: chromePx('navIndicatorDp'), height: chromePx('navIndicatorDp'), borderRadius: '50%', background: i === 0 ? accent : `${accent}20` }} />
              <span style={{ fontSize: chromePx('navLabelFontSizeDp'), color: i === 0 ? accent : tokens.textSecondary || '#aaa', fontWeight: i === 0 ? 700 : 400 }}>{tab}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
