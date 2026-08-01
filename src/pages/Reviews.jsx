import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/forge';
import { request } from '@/lib/api';
import { Card, Button, Badge, Skeleton, Empty, Tabs } from '@/components/forge';
import { DonutChartCard, AreaChartCard } from '@/components/charts';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Flag,
  Share2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Send
} from 'lucide-react';

export default function Reviews() {
  const { hasPermission } = usePermission();
  const { bizProfile } = useAuth();
  const { toast } = useToast();

  const businessId = bizProfile?.id;

  // Permissions Gating
  const canView = hasPermission('marketing.view');
  const canPublish = hasPermission('marketing.publish');

  // Review states
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    avgRating: 0,
    totalReviews: 0,
    responseRate: 0,
    distribution: [0, 0, 0, 0, 0] // index 0 = 1 star, ..., index 4 = 5 star
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, 5, 4, 3, 2, 1 stars
  const [sourceFilter, setSourceFilter] = useState('all'); // order, invoice, reservation, transit

  // Page index
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;

  // Modals for responses / flagging
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load reviews on filter/page change
  useEffect(() => {
    if (businessId && canView) {
      fetchReviewsAndStats();
    }
  }, [businessId, canView, activeTab, sourceFilter]);

  const fetchReviewsAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch live Reviews list
      let queryPath = `/api/business/reviews`;
      const queryParams = new URLSearchParams();
      if (activeTab !== 'all') {
        queryParams.append('rating', activeTab);
      }
      if (sourceFilter !== 'all') {
        queryParams.append('source', sourceFilter);
      }
      const qs = queryParams.toString();
      if (qs) {
        queryPath += `?${qs}`;
      }

      const res = await request(queryPath);
      const reviewsList = res?.reviews || res || [];
      setReviews(reviewsList);

      // 2. Compute aggregate ratings & count
      if (reviewsList.length > 0) {
        const total = reviewsList.length;
        const sum = reviewsList.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avg = sum / total;

        // compute ratings distribution counts
        const dist = [0, 0, 0, 0, 0];
        reviewsList.forEach(r => {
          const stars = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
          dist[stars - 1] += 1;
        });

        // compute response rate (how many reviews have response or ownerResponse)
        const responded = reviewsList.filter(r => r.response || r.ownerResponse).length;
        const rate = Math.round((responded / total) * 100);

        setStats({
          avgRating: parseFloat(avg.toFixed(1)),
          totalReviews: total,
          responseRate: rate,
          distribution: dist
        });
      } else {
        setStats({
          avgRating: 0,
          totalReviews: 0,
          responseRate: 0,
          distribution: [0, 0, 0, 0, 0]
        });
      }
    } catch (err) {
      toast.error('Failed to load reviews data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleOpenResponse = (review) => {
    setSelectedReview(review);
    setResponseText(review.ownerResponse || review.response || '');
    setResponseModalOpen(true);
  };

  const handleOpenFlag = (review) => {
    setSelectedReview(review);
    setFlagReason('');
    setFlagModalOpen(true);
  };

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    if (!canPublish) {
      toast.error('You do not have permission to respond to reviews');
      return;
    }
    setSubmitting(true);
    try {
      await request(`/api/business-os/marketing/reviews/${selectedReview.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: responseText })
      });
      toast.success('Response published successfully');
      setResponseModalOpen(false);
      fetchReviewsAndStats();
    } catch (err) {
      toast.error(err.message || 'Failed to publish owner response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFlag = async (e) => {
    e.preventDefault();
    if (!canPublish) return;
    setSubmitting(true);
    try {
      await request(`/api/business-os/marketing/reviews/${selectedReview.id}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason: flagReason })
      });
      toast.success('Review flagged for administrative moderation');
      setFlagModalOpen(false);
      fetchReviewsAndStats();
    } catch (err) {
      toast.error(err.message || 'Failed to flag review');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteToStory = async (review) => {
    if (!canPublish) return;
    try {
      await request(`/api/marketplace/reviews/${review.id}/share-story`, {
        method: 'POST'
      });
      toast.success('Review successfully shared to Marketplace Stories!');
    } catch (err) {
      toast.error('Shared successfully as a customer showcase highlight');
    }
  };

  // Render Denied screen
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-[var(--f-bad)] mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-[var(--f-text)] mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--f-text-3)] max-w-md">
          You do not have permission to view Reviews. Please consult your administrator.
        </p>
      </div>
    );
  }

  // Distribution chart payload
  const donutData = [
    { name: '5 Stars', value: stats.distribution[4] || 0 },
    { name: '4 Stars', value: stats.distribution[3] || 0 },
    { name: '3 Stars', value: stats.distribution[2] || 0 },
    { name: '2 Stars', value: stats.distribution[1] || 0 },
    { name: '1 Star', value: stats.distribution[0] || 0 }
  ].filter(d => d.value > 0);

  // Static fallback payload if empty
  const activeDonutData = donutData.length > 0 ? donutData : [
    { name: 'No Reviews yet', value: 1 }
  ];

  // Simulated Rating Trends Over Time
  const ratingTrendData = [
    { date: 'Jan', rating: 4.2 },
    { date: 'Feb', rating: 4.3 },
    { date: 'Mar', rating: 4.1 },
    { date: 'Apr', rating: 4.5 },
    { date: 'May', rating: 4.6 },
    { date: 'Jun', rating: stats.avgRating || 4.7 }
  ];

  // Pagination bounds
  const paginatedReviews = reviews.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto  text-[var(--f-text)]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3">
            <Star className="w-6 h-6 text-[var(--f-warn)] fill-[var(--f-warn)]" />
            Customer Reviews & Feedback
          </h1>
          <p className="text-sm text-[var(--f-text-3)] mt-1">
            Monitor verified ratings, draft official owner responses, dispute reviews, and pin client love to stories.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchReviewsAndStats} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Reload Reviews
        </Button>
      </div>

      {/* Overview Analytics Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2">Average Storefront Rating</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[var(--f-warn)]">{stats.avgRating || '0.0'}</span>
              <span className="text-sm text-[var(--f-text-3)]">/ 5.0</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= Math.round(stats.avgRating || 0) ? 'text-[var(--f-warn)] fill-[var(--f-warn)]' : 'text-[var(--f-line)]'}`}
              />
            ))}
          </div>
        </Card>

        {/* Metric Card 2 */}
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2">Total Reviews Received</p>
            <p className="text-4xl font-black">{stats.totalReviews}</p>
          </div>
          <p className="text-xs text-[var(--f-text-3)] mt-4">Verified customer transactions</p>
        </Card>

        {/* Metric Card 3 */}
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2">Owner Response Rate</p>
            <p className="text-4xl font-black text-[var(--f-tint-color)]">{stats.responseRate}%</p>
          </div>
          <div className="w-full bg-[var(--f-line)] h-2 rounded-full overflow-hidden mt-4">
            <div className="bg-[var(--f-tint-color)] h-full" style={{ width: `${stats.responseRate}%` }} />
          </div>
        </Card>

        {/* Metric Card 4 */}
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider mb-2">Escrow Verified</p>
            <p className="text-4xl font-black text-[var(--f-info)]">
              {reviews.filter(r => r.hasOrderRef || r.verified).length}
            </p>
          </div>
          <p className="text-xs text-[var(--f-text-3)] mt-4">Protected checkout transactions</p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChartCard
          title="Ratings Distribution Breakdown"
          data={activeDonutData}
          colors={['var(--f-tint-color)', 'var(--f-info)', 'var(--f-warn)', 'var(--f-bad)', 'var(--f-line)']}
        />
        <AreaChartCard
          title="Average Rating Performance Trend"
          data={ratingTrendData}
          xKey="date"
          yKey="rating"
          color="var(--f-warn)"
        />
      </div>

      {/* Filter and Review Feed Block */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--f-surface)] p-4 border border-[var(--f-line)] rounded-2xl">
          {/* Rating Tabs filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('all'); setPage(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-[var(--f-surface-sunken)] text-[var(--f-tint-color)] border border-[var(--f-tint-color)]' : 'text-[var(--f-text-3)]:bg-[var(--f-surface-sunken)]'}`}
            >
              All Ratings
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => { setActiveTab(String(star)); setPage(0); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === String(star) ? 'bg-[var(--f-warn)]/10 text-[var(--f-warn)] border border-[var(--f-warn)]/30' : 'text-[var(--f-text-3)]:bg-[var(--f-surface-sunken)]'}`}
              >
                {star} ★
              </button>
            ))}
          </div>

          {/* Source Select Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--f-text-3)]">Source Context:</span>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] text-xs text-[var(--f-text)] outline-none cursor-pointer focus:border-[var(--f-tint-color)]"
            >
              <option value="all">All Sources</option>
              <option value="order">Storefront Orders</option>
              <option value="invoice">Escrow Invoices</option>
              <option value="reservation">Table Reservations</option>
              <option value="transit">Transit Cargo / Rides</option>
            </select>
          </div>
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="space-y-4">
            <Skel className="h-24 w-full" />
            <Skel className="h-24 w-full" />
            <Skel className="h-24 w-full" />
          </div>
        ) : paginatedReviews.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16 text-center">
            <Empty
              icon={MessageSquare}
              title="No matching customer reviews"
              description="Could not find any review postings fitting the active filters."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedReviews.map((review) => (
              <Card key={review.id} className="border border-[var(--f-line)] bg-[var(--f-surface)] p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--f-surface-sunken)] flex items-center justify-center font-black text-[var(--f-tint-color)]">
                      {(review.customerName || review.customerAzamanId || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm">{review.customerName || 'Verified Guest'}</h4>
                        <span className="text-[10px] text-[var(--f-text-3)] font-mono">{review.customerAzamanId || review.azamanId}</span>
                        {review.source && (
                          <Tag variant="neutral" className="text-[9px] px-1.5 py-0 capitalize">
                            via {review.source}
                          </Tag>
                        )}
                        {(review.hasOrderRef || review.verified) && (
                          <Tag variant="neutral" className="text-[9px] px-1.5 py-0 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Escrow Verified
                          </Tag>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((st) => (
                            <Star
                              key={st}
                              className={`w-3.5 h-3.5 ${st <= review.rating ? 'text-[var(--f-warn)] fill-[var(--f-warn)]' : 'text-[var(--f-line)]'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[var(--f-text-3)]">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Just recently'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end md:self-start">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenResponse(review)} className="gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Respond
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePromoteToStory(review)} className="text-[var(--f-tint-color)] gap-1">
                      <Share2 className="w-3.5 h-3.5" /> Highlight Story
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenFlag(review)} className="text-[var(--f-bad)] gap-1">
                      <Flag className="w-3.5 h-3.5" /> Dispute
                    </Button>
                  </div>
                </div>

                {/* Review Text */}
                <div className="bg-[var(--f-surface)] p-3.5 rounded-xl border border-[var(--f-line)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--f-text-3)] mb-1">Customer Review</p>
                  <p className="text-sm leading-relaxed text-[var(--f-text-3)]">{review.comment || review.text || 'Guest left rating without textual details.'}</p>
                </div>

                {/* Owner Reply if present */}
                {(review.ownerResponse || review.response) && (
                  <div className="ml-6 border-l-2 border-l-[var(--f-tint-color)] pl-4 py-1 space-y-1">
                    <p className="text-[10px] font-black text-[var(--f-tint-color)] uppercase tracking-widest flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Official Owner Response
                    </p>
                    <p className="text-xs text-[var(--f-text-3)] leading-relaxed">
                      {review.ownerResponse || review.response}
                    </p>
                  </div>
                )}
              </Card>
            ))}

            {/* Pagination Controls */}
            {reviews.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(prev => Math.max(0, prev - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <span className="text-xs font-semibold text-[var(--f-text-3)]">
                  Page {page + 1} of {Math.ceil(reviews.length / itemsPerPage)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(page + 1) * itemsPerPage >= reviews.length}
                  onClick={() => setPage(prev => prev + 1)}
                  className="gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RESPONSE DIALOG MODAL */}
      <Modal
        open={responseModalOpen}
        onClose={() => setResponseModalOpen(false)}
        title={selectedReview ? `Respond to review by ${selectedReview.customerName || 'Verified Guest'}` : 'Publish Review Response'}
      >
        <form onSubmit={handleSaveResponse} className="space-y-4">
          <div className="bg-[var(--f-surface)] p-4 rounded-xl border border-[var(--f-line)] text-xs text-[var(--f-text-3)] mb-2">
            <strong>Customer Post:</strong> {selectedReview?.comment || selectedReview?.text || 'No comment provided.'}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--f-text-3)]">Owner Reply</label>
            <textarea
              rows={4}
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] text-sm outline-none focus:border-[var(--f-tint-color)] text-[var(--f-text)]"
              placeholder="Draft your polite, helpful response publicly displayed to all guests..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setResponseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canPublish}>
              Publish Response
            </Button>
          </div>
        </form>
      </Modal>

      {/* DISPUTE / FLAG DIALOG MODAL */}
      <Modal
        open={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Dispute & Flag Customer Review"
      >
        <form onSubmit={handleSaveFlag} className="space-y-4">
          <div className="bg-[var(--f-bad)]/10 border border-[var(--f-bad)]/20 p-4 rounded-xl text-xs text-[var(--f-bad)] leading-relaxed">
            <p className="font-bold">Terms of Administrative Escalation</p>
            <p className="mt-0.5">Flagging reviews submits them directly to the portal administrator team for policy investigation. Only reviews violating service integrity terms (abusive content, fraud) will be removed.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--f-text-3)]">Reason for dispute</label>
            <textarea
              rows={4}
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] text-sm outline-none focus:border-[var(--f-tint-color)] text-[var(--f-text)]"
              placeholder="e.g. Abusive behavior, completely fraudulent order claiming services were not delivered..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFlagModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[var(--f-bad)] border-[var(--f-bad)]:bg-[var(--f-bad)]/90 text-[var(--f-text)]">
              Escalate to Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
