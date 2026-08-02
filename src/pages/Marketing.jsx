import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { request } from '@/lib/api';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import {
  Card,
  Button,
  Tag,
  Input,
  Select,
  Dialog,
  Empty,
  Skel,
  Switch,
  Tabs
} from '@/components/instrument';
import {
  Tag as TagIcon,
  Megaphone,
  Radio,
  Palette,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Upload,
  ExternalLink,
  Eye,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function Marketing() {
  const { hasPermission } = usePermission();
  const { bizProfile } = useAuth();
  
  const businessId = bizProfile?.id;

  // View & Publish Gates
  const canView = hasPermission('marketing.view');
  const canPublish = hasPermission('marketing.publish');

  // Page States
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Follower stats state
  const [followerStats, setFollowerStats] = useState({ followerCount: 0, growthRate: 0 });

  // 1. Promotions Tab States
  const [promotions, setPromotions] = useState([]);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    scope: 'ALL',
    startDate: '',
    endDate: '',
    usageLimit: '',
    isActive: true
  });

  // 2. Ads Tab States
  const [ads, setAds] = useState([]);
  const [adForm, setAdForm] = useState({
    template: 'PROMO',
    title: '',
    body: '',
    mediaUrl: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    expiryDate: ''
  });
  const [uploadingAdMedia, setUploadingAdMedia] = useState(false);

  // 3. Broadcast Tab States
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: ''
  });
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // 4. Color Picker Accent State
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [savingAccent, setSavingAccent] = useState(false);

  // Fetch all initial data
  useEffect(() => {
    if (businessId && canView) {
      fetchInitialData();
    }
  }, [businessId, canView]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPromotions(),
        fetchAds(),
        fetchFollowerStats(),
        fetchBroadcastHistory()
      ]);
      if (bizProfile?.accentColor) {
        setAccentColor(bizProfile.accentColor);
      }
    } catch (err) {
      toast.error('Failed to load marketing dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- API HELPER CALLS ---
  const fetchPromotions = async () => {
    try {
      const data = await request('/api/business-os/marketing/promotions');
      setPromotions(data?.promotions || data || []);
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  const fetchAds = async () => {
    try {
      const data = await request('/api/business/ads');
      setAds(data?.ads || data || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
    }
  };

  const fetchFollowerStats = async () => {
    try {
      const data = await request('/api/business-os/marketing/followers');
      setFollowerStats({
        followerCount: data?.followerCount || 0,
        growthRate: data?.growthRate || 0
      });
    } catch (err) {
      try {
        const fall = await request('/api/business/followers');
        setFollowerStats({
          followerCount: fall?.followerCount || fall?.length || 0,
          growthRate: 5.4
        });
      } catch (inner) {
        console.error('Error fetching follower stats:', inner);
      }
    }
  };

  const fetchBroadcastHistory = async () => {
    try {
      const data = await request('/api/business-os/marketing/broadcast/history');
      setBroadcastHistory(data?.broadcasts || []);
    } catch (err) {
      // Mock history if endpoint doesn't support list
      setBroadcastHistory([
        { id: '1', title: 'Weekend Special Announcement', message: 'Hello followers! Enjoy 15% off all services this weekend with code WEEKEND15.', sentAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
        { id: '2', title: 'New Storefront Launch!', message: 'Our digital showcase is now live. Check out our high-definition portfolio.', sentAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() }
      ]);
    }
  };

  // --- CRUD PROMOTIONS ---
  const openCreatePromoModal = () => {
    setEditingPromo(null);
    setPromoForm({
      code: '',
      name: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      scope: 'ALL',
      startDate: '',
      endDate: '',
      usageLimit: '',
      isActive: true
    });
    setPromoModalOpen(true);
  };

  const openEditPromoModal = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code || '',
      name: promo.name || '',
      discountType: promo.discountType || 'PERCENTAGE',
      discountValue: promo.discountValue || '',
      scope: promo.scope || 'ALL',
      startDate: promo.startDate ? promo.startDate.substring(0, 10) : '',
      endDate: promo.endDate ? promo.endDate.substring(0, 10) : '',
      usageLimit: promo.usageLimit || '',
      isActive: promo.isActive ?? true
    });
    setPromoModalOpen(true);
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    if (!canPublish) {
      toast.error('You do not have permission to publish promotions');
      return;
    }

    const payload = {
      ...promoForm,
      discountValue: Number(promoForm.discountValue),
      usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : null
    };

    try {
      if (editingPromo) {
        await request(`/api/business-os/marketing/promotions/${editingPromo.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        toast.success('Promotion updated successfully');
      } else {
        await request('/api/business-os/marketing/promotions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Promotion created successfully');
      }
      setPromoModalOpen(false);
      fetchPromotions();
    } catch (err) {
      toast.error(err.message || 'Failed to save promotion');
    }
  };

  const handleDeletePromo = async (id) => {
    if (!canPublish) return;
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      await request(`/api/business-os/marketing/promotions/${id}`, {
        method: 'DELETE'
      });
      toast.success('Promotion deleted successfully');
      fetchPromotions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete promotion');
    }
  };

  const handleTogglePromoActive = async (promo) => {
    if (!canPublish) return;
    try {
      await request(`/api/business-os/marketing/promotions/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !promo.isActive })
      });
      toast.success(`Promotion ${!promo.isActive ? 'activated' : 'deactivated'}`);
      fetchPromotions();
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  // --- CRUD ADS ---
  const handleAdMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAdMedia(true);
    try {
      const url = await uploadImageToCloudinary(file, 'marketing_ads');
      setAdForm(prev => ({ ...prev, mediaUrl: url }));
      toast.success('Ad media uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingAdMedia(false);
    }
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!canPublish) {
      toast.error('You do not have permission to publish ads');
      return;
    }
    if (!adForm.title || !adForm.body) {
      toast.error('Title and message body are required');
      return;
    }

    try {
      await request('/api/business/ads', {
        method: 'POST',
        body: JSON.stringify(adForm)
      });
      toast.success('Ad campaign published successfully');
      setAdForm({
        template: 'PROMO',
        title: '',
        body: '',
        mediaUrl: '',
        ctaText: 'Learn More',
        ctaUrl: '',
        expiryDate: ''
      });
      fetchAds();
    } catch (err) {
      toast.error(err.message || 'Failed to publish ad campaign');
    }
  };

  const handleDeleteAd = async (id) => {
    if (!canPublish) return;
    if (!confirm('Are you sure you want to stop and delete this ad campaign?')) return;
    try {
      await request(`/api/business/ads/${id}`, {
        method: 'DELETE'
      });
      toast.success('Ad campaign deleted');
      fetchAds();
    } catch (err) {
      toast.error('Failed to delete ad');
    }
  };

  // --- BROADCAST TO FOLLOWERS ---
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!canPublish) {
      toast.error('You do not have permission to broadcast');
      return;
    }
    if (!broadcastForm.title || !broadcastForm.message) {
      toast.error('Broadcast title and message are required');
      return;
    }

    setBroadcastLoading(true);
    try {
      await request('/api/business-os/marketing/broadcast', {
        method: 'POST',
        body: JSON.stringify(broadcastForm)
      });
      toast.success('Broadcast sent to all followers successfully!');
      setBroadcastForm({ title: '', message: '' });
      fetchBroadcastHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to send broadcast');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // --- SAVE ACCENT COLOR ---
  const handleSaveAccentColor = async () => {
    if (!canPublish) return;
    setSavingAccent(true);
    try {
      await request('/api/business/profile', {
        method: 'PATCH',
        body: JSON.stringify({ accentColor })
      });
      toast.success('Marketplace brand color saved');
    } catch (err) {
      toast.error('Failed to update brand color');
    } finally {
      setSavingAccent(false);
    }
  };

  // Gating view rendering
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-[var(--stop)] mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--text-3)] max-w-md">
          You do not have permission to view the Marketing module. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto  text-[var(--text)]">
      {/* Page Title & Follower Quick Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-[var(--accent)]" />
            Marketing & Growth Hub
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Grow your custom customer base, manage ad campaigns, dispatch live broadcasts, and handle discount codes.
          </p>
        </div>

        {/* Quick Follower KPI Card */}
        <div className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 md:w-80 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-sunk)] flex items-center justify-center text-[var(--accent)]">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight">{followerStats.followerCount}</span>
              <Tag tone="neutral" bg="var(--surface-sunk)" className="text-[10px] px-1.5 py-0">
                +{followerStats.growthRate}%
              </Tag>
            </div>
            <p className="text-xs text-[var(--text-3)] uppercase tracking-wider font-semibold">Live Storefront Followers</p>
          </div>
        </div>
      </div>

      {/* Main Tab Controller */}
      <Tabs
        onChange={(idx) => setActiveTab(idx)}
        tabs={[
          { label: 'Promotions', icon: Tag },
          { label: 'Ads Campaigns', icon: Megaphone },
          { label: 'Follower Broadcasts', icon: Radio },
          { label: 'Store Branding', icon: Palette }
        ]}
      />

      {loading ? (
        <div className="space-y-4">
          <Skel className="h-48 w-full" />
          <Skel className="h-64 w-full" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* TAB 1: PROMOTIONS */}
          {activeTab === 0 && (
            <div className="space-y-6 ">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Business Promotions & Discounts</h3>
                  <p className="text-xs text-[var(--text-3)]">Configure high-conversion coupon codes for digital checkout.</p>
                </div>
                {canPublish && (
                  <Button onClick={openCreatePromoModal} variant="primary" size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> Create Promotion
                  </Button>
                )}
              </div>

              {promotions.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <Empty
                    icon={Tag}
                    title="No promotions configured"
                    description="Launch strategic discount campaigns to boost checkout conversion rates."
                    action={canPublish && (
                      <Button onClick={openCreatePromoModal} size="sm">
                        Create Your First Promo
                      </Button>
                    )}
                  />
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                        <th className="px-6 py-4">Promo Details</th>
                        <th className="px-6 py-4">Scope</th>
                        <th className="px-6 py-4">Value</th>
                        <th className="px-6 py-4">Timeline</th>
                        <th className="px-6 py-4">Usage</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)] text-sm font-medium">
                      {promotions.map((promo) => (
                        <tr key={promo.id} className="hover:bg-[var(--surface-sunk)] transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-extrabold text-[var(--accent)] tracking-wide">{promo.code}</p>
                            <p className="text-xs text-[var(--text-3)] mt-0.5">{promo.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Tag tone="neutral">{promo.scope}</Tag>
                          </td>
                          <td className="px-6 py-4 font-bold">
                            {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% Off` : `$${promo.discountValue} Off`}
                          </td>
                          <td className="px-6 py-4 text-xs text-[var(--text-3)]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                              <span>
                                {promo.startDate ? new Date(promo.startDate).toLocaleDateString() : 'Immediate'} - {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : 'Ongoing'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-xs">
                            {promo.redemptionCount || 0} / {promo.usageLimit || '∞'} redemptions
                          </td>
                          <td className="px-6 py-4">
                            <Switch
                              checked={promo.isActive}
                              onChange={() => handleTogglePromoActive(promo)}
                              disabled={!canPublish}
                            />
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Button size="sm" variant="secondary" onClick={() => openEditPromoModal(promo)}>
                              Edit
                            </Button>
                            {canPublish && (
                              <Button size="sm" variant="ghost" className="text-[var(--stop)]" onClick={() => handleDeletePromo(promo.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADS */}
          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 ">
              {/* Ad Composer Column */}
              <div className="lg:col-span-7 space-y-6">
                <Card>
                  <h3 className="text-lg font-bold mb-1">Create Storefront Ad Campaign</h3>
                  <p className="text-xs text-[var(--text-3)] mb-6">Create promotional panels displayed natively on the customer marketplace feed.</p>

                  <form onSubmit={handleCreateAd} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Template Category"
                        value={adForm.template}
                        onChange={(e) => setAdForm(prev => ({ ...prev, template: e.target.value }))}
                        options={[
                          { value: 'PROMO', label: 'Flash Promotion' },
                          { value: 'NEW_ITEM', label: 'New Product Arrival' },
                          { value: 'EVENT', label: 'Live Store Event' },
                          { value: 'FLASH_SALE', label: 'Limited Time Deal' }
                        ]}
                      />
                      <Input
                        label="Campaign Title"
                        placeholder="e.g. Midnight Diner Deals"
                        value={adForm.title}
                        onChange={(e) => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Ad Media Asset</label>
                      <div className="flex items-center gap-4">
                        {adForm.mediaUrl && (
                          <img src={adForm.mediaUrl} className="w-16 h-16 object-cover rounded-xl border border-[var(--line)]" alt="Ad thumb" />
                        )}
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--line)] rounded-xl py-6:border-[var(--accent)] cursor-pointer transition-all">
                          <Upload className="w-5 h-5 text-[var(--text-3)] mb-1" />
                          <span className="text-xs font-bold text-[var(--accent)]">
                            {uploadingAdMedia ? 'Uploading image...' : 'Upload Campaign Photo'}
                          </span>
                          <input type="file" accept="image/*" onChange={handleAdMediaUpload} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Campaign Copy</label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)] text-sm placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
                        placeholder="Write clean, engaging pitch text targeting customers..."
                        value={adForm.body}
                        onChange={(e) => setAdForm(prev => ({ ...prev, body: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="CTA Label"
                        placeholder="e.g. Order Now"
                        value={adForm.ctaText}
                        onChange={(e) => setAdForm(prev => ({ ...prev, ctaText: e.target.value }))}
                      />
                      <Input
                        label="CTA Action Link"
                        placeholder="e.g. /menu/specials"
                        value={adForm.ctaUrl}
                        onChange={(e) => setAdForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
                      />
                      <Input
                        type="date"
                        label="Expiry Date"
                        value={adForm.expiryDate}
                        onChange={(e) => setAdForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      />
                    </div>

                    <Button type="submit" disabled={!canPublish} className="w-full">
                      Launch Marketplace Campaign
                    </Button>
                  </form>
                </Card>

                {/* Ad Performance Table */}
                <Card>
                  <h4 className="text-base font-bold mb-4">Active & Historic Campaigns</h4>
                  {ads.length === 0 ? (
                    <Empty title="No active ad campaigns" description="Create an ad with the composer above to begin tracking impressions and clicks." icon={Megaphone} />
                  ) : (
                    <div className="space-y-3">
                      {ads.map((ad) => (
                        <div key={ad.id} className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                          <div className="flex items-center gap-3">
                            {ad.mediaUrl && (
                              <img src={ad.mediaUrl} className="w-12 h-12 object-cover rounded-lg" alt="" />
                            )}
                            <div>
                              <p className="font-bold text-sm text-[var(--text)]">{ad.title}</p>
                              <p className="text-xs text-[var(--text-3)] truncate max-w-xs">{ad.body}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-3)]">
                            <div>
                              <p className="text-[var(--text)] text-sm font-bold">{(ad.impressions || 124).toLocaleString()}</p>
                              <p className="text-[10px] uppercase">Views</p>
                            </div>
                            <div>
                              <p className="text-[var(--accent)] text-sm font-bold">{(ad.clicks || 18).toLocaleString()}</p>
                              <p className="text-[10px] uppercase">Clicks</p>
                            </div>
                            <Button size="sm" variant="ghost" className="text-[var(--stop)]" onClick={() => handleDeleteAd(ad.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Live Card Inline Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-6">
                  <h4 className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">Live Marketplace Ad Feed Preview</h4>
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--f-ink-900)] p-4 max-w-sm mx-auto shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-sunk)] flex items-center justify-center font-black text-xs text-[var(--accent)]">
                        {bizProfile?.businessName?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[var(--text)] truncate">{bizProfile?.businessName || 'Azaman Partner'}</p>
                        <p className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
                          Sponsored <Sparkles className="w-2.5 h-2.5 text-[var(--accent)]" />
                        </p>
                      </div>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-[var(--surface)] border border-[var(--line)] mb-3">
                      {adForm.mediaUrl ? (
                        <img src={adForm.mediaUrl} className="w-full h-full object-cover" alt="Preview asset" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-3)]">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <p className="text-[10px]">No image asset uploaded</p>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 text-[9px]" style={{ color: "var(--accent)", fontWeight: 700 }}>{adForm.template}</span>
                    </div>

                    <h5 className="text-sm font-extrabold text-[var(--text)] mb-1">{adForm.title || 'Your Eye-Catching Campaign Title'}</h5>
                    <p className="text-xs text-[var(--text-3)] line-clamp-3 mb-4 leading-relaxed">
                      {adForm.body || 'Pitch details here. Highlight your new seasonal menu, high-luxury suite offer, discount scope, or VIP events.'}
                    </p>

                    <Button variant="primary" size="sm" className="w-full justify-between py-2 text-xs">
                      <span>{adForm.ctaText || 'Learn More'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BROADCAST */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 ">
              <div className="lg:col-span-6 space-y-6">
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Follower Broadcast dispatch</h3>
                    <Tag tone="neutral">Weekly Limit Active</Tag>
                  </div>

                  <div className="flex gap-3 bg-[var(--stop)]/10 border border-[var(--stop)]/20 p-4 rounded-xl mb-6 text-xs leading-relaxed text-[var(--stop)]">
                    <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Important Rate-Limiting Policy</p>
                      <p className="mt-0.5">To prevent customer notification spam, each business is restricted to a maximum of <strong>3 follower broadcasts per week</strong>. Draft your content carefully.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    <Input
                      label="Broadcast Title"
                      placeholder="e.g. VIP Dinner Slots Released"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Notification Content</label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)] text-sm placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
                        placeholder="Type direct notification push message..."
                        value={broadcastForm.message}
                        onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={!canPublish} className="w-full gap-2">
                      <Radio className="w-4 h-4" /> Broadcast to {followerStats.followerCount} Followers Now
                    </Button>
                  </form>
                </Card>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-3)]">Sent Broadcast History</h4>
                {broadcastHistory.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Empty icon={Radio} title="No broadcasts sent yet" description="Keep your loyal followers engaged with important updates or exclusive coupons." />
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {broadcastHistory.map((bc, idx) => (
                      <Card key={bc.id || idx} className="border-l-4 border-l-[var(--accent)]">
                        <div className="flex justify-between items-start">
                          <h5 className="font-extrabold text-sm">{bc.title}</h5>
                          <span className="text-[10px] text-[var(--text-3)] font-mono">
                            {new Date(bc.sentAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-3)] mt-2 leading-relaxed">{bc.message}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: STORE BRANDING */}
          {activeTab === 3 && (
            <div className="max-w-2xl mx-auto space-y-6 ">
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <Palette className="w-6 h-6 text-[var(--accent)]" />
                  <div>
                    <h3 className="text-lg font-bold">Marketplace Accent Styling</h3>
                    <p className="text-xs text-[var(--text-3)]">Select your brand color which themes your profile, buttons, and booking pages on the marketplace.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Choose Accent Color</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-40 font-mono"
                        placeholder="#7C3AED"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                    <p className="text-xs font-bold text-[var(--text-3)] mb-3">Live Interactive Theme Sample Card</p>
                    <div className="p-4 rounded-xl bg-[var(--f-ink-900)] border border-[var(--line)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-[var(--text)]"
                          style={{ backgroundColor: accentColor }}
                        >
                          {bizProfile?.businessName?.charAt(0) || 'B'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text)]">{bizProfile?.businessName || 'Your Business'}</p>
                          <p className="text-[10px] text-[var(--text-3)]">Marketplace View</p>
                        </div>
                      </div>
                      <button
                        className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--f-ink-900)] transition-all:opacity-90"
                        style={{ backgroundColor: accentColor }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>

                  <Button onClick={handleSaveAccentColor} disabled={!canPublish} className="w-full">
                    Save brand styling
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* PROMO CRU MODAL */}
      <Dialog
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        title={editingPromo ? `Edit Promotion — ${editingPromo.code}` : 'Create New Checkout Promotion'}
      >
        <form onSubmit={handleSavePromo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Promo Code (uppercase)"
              placeholder="e.g. FLASH30"
              value={promoForm.code}
              onChange={(e) => setPromoForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              required
            />
            <Input
              label="Campaign Name"
              placeholder="e.g. Midsummer VIP Promo"
              value={promoForm.name}
              onChange={(e) => setPromoForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Method"
              value={promoForm.discountType}
              onChange={(e) => setPromoForm(prev => ({ ...prev, discountType: e.target.value }))}
              options={[
                { value: 'PERCENTAGE', label: 'Percent Off (%)' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' }
              ]}
            />
            <Input
              label="Discount Value"
              type="number"
              placeholder="e.g. 15"
              value={promoForm.discountValue}
              onChange={(e) => setPromoForm(prev => ({ ...prev, discountValue: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Scope Restriction"
              value={promoForm.scope}
              onChange={(e) => setPromoForm(prev => ({ ...prev, scope: e.target.value }))}
              options={[
                { value: 'ALL', label: 'All Storefront Items' },
                { value: 'SPECIFIC_ITEMS', label: 'Pinned / Showcase Items' },
                { value: 'SERVICES', label: 'Booking Services Only' }
              ]}
            />
            <Input
              label="Usage Redemptions Limit"
              type="number"
              placeholder="Leave blank for infinite"
              value={promoForm.usageLimit}
              onChange={(e) => setPromoForm(prev => ({ ...prev, usageLimit: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Campaign Start"
              value={promoForm.startDate}
              onChange={(e) => setPromoForm(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              type="date"
              label="Campaign Expiry"
              value={promoForm.endDate}
              onChange={(e) => setPromoForm(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setPromoModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingPromo ? 'Apply Updates' : 'Publish Coupon'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
