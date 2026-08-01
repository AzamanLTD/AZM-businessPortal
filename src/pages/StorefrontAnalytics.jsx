// src/pages/StorefrontAnalytics.jsx
// Storefront analytics dashboard — shows views, engagement, CTA clicks,
// widget performance, and traffic sources.
import { useState, useEffect, useMemo } from 'react';
import { storefrontApi } from '@/services/storefrontApi';
import { AreaChartCard, BarChartCard, DonutChartCard, KpiCard } from '@/components/charts';
import { Card } from '@/components/forge';
import { Eye, MousePointerClick, Users, Target, BarChart3, TrendingUp, Loader2, AlertCircle, BarChart2, ShoppingBag, ExternalLink } from 'lucide-react';

const TIME_RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

// Human-readable widget type names
const WIDGET_NAMES = {
  hero_header: 'Hero Banner',
  quick_info_bar: 'Info Bar',
  product_grid: 'Product Grid',
  showcase_gallery: 'Gallery',
  review_carousel: 'Reviews',
  contact_card: 'Contact',
  location_map: 'Map',
  action_buttons: 'Action Buttons',
  video_player: 'Video',
  promo_banner: 'Promo Banner',
  social_feed: 'Social Feed',
  live_stats: 'Live Stats',
  animated_counter: 'Counter',
  custom_html: 'Custom HTML',
  gradient_hero: 'Gradient Hero',
};

// CTA action names
const CTA_NAMES = {
  order: 'Order',
  book: 'Book',
  follow: 'Follow',
  share: 'Share',
  call: 'Call',
  directions: 'Directions',
  message: 'Message',
};

export default function StorefrontAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await storefrontApi.getAnalytics(days);
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [days]);

  // Prepare chart data
  const timeSeriesData = useMemo(() => {
    if (!analytics?.timeSeries) return [];
    return analytics.timeSeries.map(d => ({
      date: d.date.split('-').slice(1).join('/'),
      views: d.views,
      clicks: d.clicks + d.interactions,
    }));
  }, [analytics]);

  const widgetEngagementData = useMemo(() => {
    if (!analytics?.widgetEngagement) return [];
    return analytics.widgetEngagement.map(w => ({
      widget: WIDGET_NAMES[w.widgetType] || w.widgetType,
      views: w.views,
      clicks: w.clicks + w.taps,
    }));
  }, [analytics]);

  const ctaData = useMemo(() => {
    if (!analytics?.ctaBreakdown) return [];
    return Object.entries(analytics.ctaBreakdown).map(([action, count]) => ({
      name: CTA_NAMES[action] || action,
      value: count,
    }));
  }, [analytics]);

  const trafficData = useMemo(() => {
    if (!analytics?.trafficSources) return [];
    return Object.entries(analytics.trafficSources).map(([source, count]) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      value: count,
    }));
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--f-tint-color)' }} />
          <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>Loading storefront analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--f-bad)' }} />
          <p className="font-semibold" style={{ color: 'var(--f-text)' }}>Failed to load analytics</p>
          <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>{error}</p>
          <button onClick={() => setDays(d => d)} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--f-tint-color)', color: '#fff' }}>
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const hasData = summary.totalEvents > 0;

  return (
    <div className="space-y-6" style={{ background: 'var(--f-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6" style={{ color: 'var(--f-tint-color)' }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--f-text)' }}>Storefront Analytics</h1>
            <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>
              Track views, engagement, and conversion from your published storefront
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-line)' }}>
          {TIME_RANGES.map(range => (
            <button key={range.value} onClick={() => setDays(range.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: days === range.value ? 'var(--f-tint-color)' : 'transparent',
                color: days === range.value ? '#fff' : 'var(--f-text-3)',
              }}>
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <Card className="p-12 text-center">
          <BarChart2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--f-text-3)' }} />
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--f-text)' }}>No analytics data yet</h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--f-text-3)' }}>
            Once customers view your published storefront, you'll see views, clicks, and engagement metrics here.
            Make sure your storefront is published and shared.
          </p>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Total Views"
              value={summary.totalViews + summary.totalWidgetViews}
              icon={Eye}
              color="var(--f-tint-color)"
            />
            <KpiCard
              label="CTA Clicks"
              value={summary.totalCTAClicks}
              icon={MousePointerClick}
              color="#E2A33D"
            />
            <KpiCard
              label="Unique Visitors"
              value={summary.uniqueVisitors}
              icon={Users}
              color="#1FA37A"
            />
            <KpiCard
              label="Click-Through Rate"
              value={`${summary.avgCTR}%`}
              icon={Target}
              color="#E15361"
            />
            <KpiCard
              label="Orders Placed"
              value={summary.totalOrders || 0}
              icon={ShoppingBag}
              color="#7C3AED"
            />
          </div>

          {/* Views & Clicks Over Time */}
          <AreaChartCard
            title="Views & Clicks Over Time"
            data={timeSeriesData}
            xKey="date"
            yKey="views"
            height={280}
          />

          {/* Widget Engagement + CTA Breakdown side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {widgetEngagementData.length > 0 && (
              <BarChartCard
                title="Widget Engagement"
                data={widgetEngagementData}
                xKey="widget"
                bars={[
                  { key: 'views', label: 'Views', color: 'var(--f-tint-color)' },
                  { key: 'clicks', label: 'Clicks', color: '#E2A33D' },
                ]}
                height={260}
                layout="vertical"
              />
            )}

            {ctaData.length > 0 && (
              <div className="bg-[var(--az-surface-1)] border border-line rounded-lg shadow-sm p-6">
                <h3 className="text-sm font-bold text-ink mb-4">CTA Action Breakdown</h3>
                <DonutChartCard
                  data={ctaData}
                  height={260}
                />
              </div>
            )}
          </div>

          {/* Traffic Sources + Summary Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trafficData.length > 0 && (
              <div className="bg-[var(--az-surface-1)] border border-line rounded-lg shadow-sm p-6">
                <h3 className="text-sm font-bold text-ink mb-4">Traffic Sources</h3>
                <div className="space-y-2">
                  {trafficData.map(source => {
                    const total = trafficData.reduce((sum, s) => sum + s.value, 0);
                    const pct = total > 0 ? (source.value / total * 100).toFixed(0) : 0;
                    return (
                      <div key={source.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium" style={{ color: 'var(--f-text)' }}>{source.name}</span>
                            <span className="text-xs" style={{ color: 'var(--f-text-3)' }}>{source.value} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--az-bg-alt)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--f-tint-color)' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-[var(--az-surface-1)] border border-line rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--f-tint-color)' }} />
                Event Summary
              </h3>
              <div className="space-y-2">
                {Object.entries(analytics?.byEventType || {}).sort(([,a],[,b]) => b - a).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-1.5 border-b last:border-0"
                    style={{ borderColor: 'var(--f-line)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--f-text-2)' }}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--f-text)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Taps Detail */}
          {summary.totalProductTaps > 0 && (
            <Card className="p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--f-text)' }}>
                <MousePointerClick className="w-4 h-4" style={{ color: 'var(--f-tint-color)' }} />
                Product Interactions
              </h3>
              <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>
                {summary.totalProductTaps} product tap{summary.totalProductTaps !== 1 ? 's' : ''} from your Product Grid widget.
                {summary.totalProductTaps > 0 && summary.totalViews > 0 && (
                  <span> That's a {(summary.totalProductTaps / summary.totalViews * 100).toFixed(1)}% product engagement rate.</span>
                )}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
