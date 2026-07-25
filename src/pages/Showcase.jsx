import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/ui/Toast';
import { request } from '@/lib/api';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { PhonePreview } from '@/components/PhonePreview';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Card, Button, Badge, Skeleton, Empty, Input } from '@/components/ui';
import {
  Image as ImageIcon,
  Smartphone,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  AlertTriangle,
  Award,
  Pin,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  History,
  GitCommit,
  X,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function Showcase() {
  const { hasPermission } = usePermission();
  const { bizProfile } = useAuth();
  const { toast } = useToast();

  const businessId = bizProfile?.id;

  const canView = hasPermission('marketing.view');
  const canPublish = hasPermission('marketing.publish');

  // Page States
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPhonePreview, setShowPhonePreview] = useState(true);

  // Version History
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');
  const [showPublishInput, setShowPublishInput] = useState(false);
  const [revertingId, setRevertingId] = useState(null);

  // Curated items & highlights (existing)
  const [curatedItems, setCuratedItems] = useState([]);
  const [pinItemForm, setPinItemForm] = useState({ name: '', price: '', category: 'Product' });
  const [highlights, setHighlights] = useState([]);
  const [highlightForm, setHighlightForm] = useState({ title: '', badge: 'Award' });

  useEffect(() => {
    if (businessId && canView) loadShowcaseData();
  }, [businessId, canView]);

  const loadShowcaseData = async () => {
    setLoading(true);
    try {
      const res = await request(`/api/showcases/${businessId}`);
      setSlides(res || []);
      setCuratedItems([
        { id: '1', name: 'VIP Oceanside Suite', price: '450', category: 'Room', pinned: true },
        { id: '2', name: 'Premium Chef Tasting Menu', price: '120', category: 'Product', pinned: true }
      ]);
      setHighlights([
        { id: '1', title: '5-Star Michelin Recommendation', badge: 'Award' },
        { id: '2', title: 'Eco-Friendly Luxury Certified', badge: 'Certificate' }
      ]);
    } catch (err) {
      toast.error('Failed to load showcase data');
    } finally {
      setLoading(false);
    }
  };

  // --- VERSION HISTORY ---
  const loadVersions = async () => {
    setVersionsLoading(true);
    try {
      const res = await request(`/api/showcases/${businessId}/versions`);
      setVersions(res?.versions || []);
    } catch (err) {
      toast.error('Failed to load version history');
    } finally {
      setVersionsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (slides.length === 0) {
      toast.error('No slides to publish');
      return;
    }
    setPublishing(true);
    try {
      await request(`/api/showcases/${businessId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ label: publishLabel || null }),
      });
      toast.success('Storefront version published');
      setPublishLabel('');
      setShowPublishInput(false);
      loadVersions();
    } catch (err) {
      toast.error(err.message || 'Failed to publish version');
    } finally {
      setPublishing(false);
    }
  };

  const handleRevert = async (versionId) => {
    if (!confirm('Reverting will replace ALL current slides with this saved version. Continue?')) return;
    setRevertingId(versionId);
    try {
      await request(`/api/showcases/${businessId}/revert/${versionId}`, {
        method: 'POST',
      });
      toast.success('Storefront reverted to previous version');
      loadShowcaseData();
      loadVersions();
    } catch (err) {
      toast.error(err.message || 'Failed to revert');
    } finally {
      setRevertingId(null);
    }
  };

  const openVersionModal = () => {
    setShowVersionModal(true);
    loadVersions();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // --- GALLERY ACTION HANDLERS ---
  const handleUploadSlide = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!canPublish) { toast.error('You do not have permission to publish changes'); return; }

    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'showcase');
      const payload = { businessProfileId: businessId, mediaUrl: url, caption: 'New Storefront Slide' };
      await request('/api/showcases', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Photo added to showcase gallery');
      loadShowcaseData();
    } catch (err) {
      toast.error(err.message || 'Gallery upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSlide = async (slideId) => {
    if (!canPublish) return;
    if (!confirm('Are you sure you want to remove this photo?')) return;
    try {
      await request(`/api/showcases/${slideId}`, { method: 'DELETE' });
      toast.success('Slide removed successfully');
      setSlides(prev => prev.filter(s => s.id !== slideId));
    } catch (err) {
      toast.error('Failed to delete showcase slide');
    }
  };

  const handleMoveSlide = async (idx, direction) => {
    if (!canPublish) return;
    const target = idx + direction;
    if (target < 0 || target >= slides.length) return;

    const updatedSlides = [...slides];
    [updatedSlides[idx], updatedSlides[target]] = [updatedSlides[target], updatedSlides[idx]];
    setSlides(updatedSlides);

    try {
      await request('/api/showcases/reorder', {
        method: 'POST',
        body: JSON.stringify({ slides: updatedSlides.map((s, i) => ({ id: s.id, sortOrder: i })) })
      });
      toast.success('Showcase layout reordered');
    } catch (err) {
      toast.error('Failed to save reorder position');
      loadShowcaseData();
    }
  };

  // --- CURATED ITEMS ---
  const handleAddPinItem = (e) => {
    e.preventDefault();
    if (!pinItemForm.name || !pinItemForm.price) return;
    setCuratedItems(prev => [...prev, { id: Math.random().toString(36).substring(2), ...pinItemForm, pinned: true }]);
    setPinItemForm({ name: '', price: '', category: 'Product' });
    toast.success('Pinned item curated');
  };

  const handleRemovePinItem = (id) => {
    setCuratedItems(prev => prev.filter(item => item.id !== id));
    toast.success('Pinned item uncurated');
  };

  // --- HIGHLIGHTS ---
  const handleAddHighlight = (e) => {
    e.preventDefault();
    if (!highlightForm.title) return;
    setHighlights(prev => [...prev, { id: Math.random().toString(36).substring(2), ...highlightForm }]);
    setHighlightForm({ title: '', badge: 'Award' });
    toast.success('Highlight curated successfully');
  };

  const handleRemoveHighlight = (id) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    toast.success('Highlight removed');
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-[var(--az-danger)] mb-4" />
        <h2 className="text-xl font-bold text-[var(--az-text)] mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--az-text-muted)] max-w-md">
          You do not have permission to view the Showcase Editor. Please consult your administrator.
        </p>
      </div>
    );
  }

  const previewBusinessObject = {
    ...bizProfile,
    slides: slides.length > 0 ? slides : [{ mediaUrl: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10?w=800' }],
    curatedItems, highlights,
    businessName: bizProfile?.businessName || 'Azaman Showcase Partner',
    category: bizProfile?.category || 'Luxury Services'
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-[var(--az-text)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Smartphone className="w-6 h-6" style={{ color: 'var(--az-accent)' }} />
            Digital Storefront Editor
          </h1>
          <p className="text-sm text-[var(--az-text-muted)] mt-1">
            Build high-conversion landing pages for the Azaman customer app. Upload slides, pin signature products, and highlight certificates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canPublish && (
            <>
              {showPublishInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Version label (optional)"
                    value={publishLabel}
                    onChange={(e) => setPublishLabel(e.target.value)}
                    className="w-44"
                    onKeyDown={(e) => e.key === 'Enter' && handlePublish()}
                  />
                  <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-1.5">
                    <GitCommit className="w-4 h-4" />
                    {publishing ? 'Publishing...' : 'Confirm Publish'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowPublishInput(false); setPublishLabel(''); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setShowPublishInput(true)} className="gap-1.5">
                  <GitCommit className="w-4 h-4" />
                  Publish Version
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="ghost" onClick={openVersionModal} className="gap-1.5">
            <History className="w-4 h-4" />
            Version History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPhonePreview(!showPhonePreview)}
            className="gap-1.5"
          >
            <Smartphone className="w-4 h-4" />
            {showPhonePreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Column */}
        <div className={showPhonePreview ? 'lg:col-span-7 space-y-6' : 'lg:col-span-12 space-y-6'}>
          {/* Section 1: Hero slideshow */}
          <GlassPanel solid className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: 'var(--az-accent)' }} /> Full-Bleed Profile Slideshow
                </h3>
                <p className="text-xs text-[var(--az-text-muted)] mt-0.5">High-definition cover slides shown as full bleed on your profile.</p>
              </div>
              <Badge>{slides.length} Photos</Badge>
            </div>

            {/* Upload area */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-az-border rounded-az-lg py-8 px-4 hover:border-az-accent cursor-pointer transition-all bg-az-bg-alt">
              <Upload className="w-8 h-8 text-[var(--az-text-muted)] mb-2" />
              <span className="text-sm font-semibold" style={{ color: 'var(--az-accent)' }}>
                {uploading ? 'Processing & uploading slide...' : 'Upload Showcase Slide Image'}
              </span>
              <p className="text-[10px] text-[var(--az-text-muted)] mt-1">Accepts high-resolution JPG, PNG, WebP up to 5MB.</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadSlide} disabled={!canPublish} />
            </label>

            {/* Slides list */}
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : slides.length === 0 ? (
              <Empty icon={ImageIcon} title="Your slideshow is empty" description="Upload images above to create a powerful hero slideshow carousel." />
            ) : (
              <div className="space-y-2">
                {slides.map((slide, idx) => (
                  <div key={slide.id || idx} className="flex items-center gap-3 p-2.5 rounded-az-md border border-az-border bg-az-surface-solid hover:shadow-az-card transition-all">
                    <img src={slide.mediaUrl} className="w-16 h-12 object-cover rounded-az-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">Slide {idx + 1}</p>
                      <p className="text-[10px] text-[var(--az-text-muted)] truncate">{slide.mediaUrl}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleMoveSlide(idx, -1)} disabled={idx === 0}
                        className="p-1.5 rounded-az-sm text-[var(--az-text-muted)] hover:bg-az-bg-alt disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleMoveSlide(idx, 1)} disabled={idx === slides.length - 1}
                        className="p-1.5 rounded-az-sm text-[var(--az-text-muted)] hover:bg-az-bg-alt disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {canPublish && (
                        <button onClick={() => handleRemoveSlide(slide.id)}
                          className="p-1.5 rounded-az-sm text-[var(--az-danger)] hover:bg-[var(--az-danger-subtle)]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>

          {/* Section 2: Pinned Items */}
          <GlassPanel solid className="space-y-4 p-6">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Pin className="w-5 h-5" style={{ color: 'var(--az-info)' }} /> Signature Curated Items
              </h3>
              <p className="text-xs text-[var(--az-text-muted)] mt-0.5">Pin exclusive rooms, hot menu options, or freight cargo routes to the storefront top-shelf.</p>
            </div>

            <form onSubmit={handleAddPinItem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Product/Service Title" value={pinItemForm.name}
                onChange={(e) => setPinItemForm(prev => ({ ...prev, name: e.target.value }))} required />
              <Input type="number" placeholder="Price (USD/USDC)" value={pinItemForm.price}
                onChange={(e) => setPinItemForm(prev => ({ ...prev, price: e.target.value }))} required />
              <select value={pinItemForm.category}
                onChange={(e) => setPinItemForm(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 rounded-az-sm bg-az-surface-solid border border-az-border text-sm text-[var(--az-text)]">
                <option value="Product">Product SKU</option>
                <option value="Room">Luxury Room</option>
                <option value="Service">Booking Service</option>
              </select>
              <Button type="submit" disabled={!canPublish} size="sm">Add Curated SKU</Button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {curatedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-az-md border border-az-border bg-az-surface-solid">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{item.name}</span>
                      <Badge>{item.category}</Badge>
                    </div>
                    <p className="text-xs text-[var(--az-text-muted)] mt-0.5">${item.price} USDC</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[var(--az-danger)] p-1" onClick={() => handleRemovePinItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Section 3: Highlights */}
          <GlassPanel solid className="space-y-4 p-6">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Award className="w-5 h-5" style={{ color: 'var(--az-warning)' }} /> Certifications & Trust Highlights
              </h3>
              <p className="text-xs text-[var(--az-text-muted)] mt-0.5">Exhibit Michelin badges, sustainable credentials, or verified transit safety awards.</p>
            </div>

            <form onSubmit={handleAddHighlight} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Highlight Label, e.g. Michelin 2025" value={highlightForm.title}
                onChange={(e) => setHighlightForm(prev => ({ ...prev, title: e.target.value }))} required />
              <select value={highlightForm.badge}
                onChange={(e) => setHighlightForm(prev => ({ ...prev, badge: e.target.value }))}
                className="px-3 py-2 rounded-az-sm bg-az-surface-solid border border-az-border text-sm text-[var(--az-text)]">
                <option value="Award">Trust Award</option>
                <option value="Certificate">Certificate</option>
                <option value="Specialty">Specialty Badge</option>
              </select>
              <Button type="submit" disabled={!canPublish} size="sm">Add Trust Highlight</Button>
            </form>

            <div className="flex flex-wrap gap-2 mt-4">
              {highlights.map((h) => (
                <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-az-border bg-az-surface-solid">
                  <Award className="w-3.5 h-3.5" style={{ color: 'var(--az-warning)' }} />
                  <span className="text-xs font-medium">{h.title}</span>
                  <span className="text-[10px] text-[var(--az-text-muted)] uppercase">{h.badge}</span>
                  <button onClick={() => handleRemoveHighlight(h.id)} className="ml-1 text-[var(--az-danger)] hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Phone Preview Column */}
        {showPhonePreview && (
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--az-text-secondary)]">Live Preview</h3>
                <Badge>Real-time</Badge>
              </div>
              <div className="flex justify-center">
                <PhonePreview business={previewBusinessObject} />
              </div>
              <p className="text-xs text-[var(--az-text-muted)] text-center mt-4 max-w-xs mx-auto">
                This is how customers see your storefront in the Azaman app. Changes appear instantly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <GlassPanel solid className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ borderRadius: '20px' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-az-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-az-sm" style={{ background: 'var(--az-accent-subtle)' }}>
                  <History className="w-5 h-5" style={{ color: 'var(--az-accent)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--az-text)]">Version History</h2>
                  <p className="text-xs text-[var(--az-text-muted)]">Publish snapshots and revert to any saved version</p>
                </div>
              </div>
              <button onClick={() => setShowVersionModal(false)} className="p-2 rounded-az-sm hover:bg-az-bg-alt text-[var(--az-text-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Versions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {versionsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 rounded-az-md animate-pulse bg-az-bg-alt" />)}
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GitCommit className="w-10 h-10 text-[var(--az-text-muted)] mb-3" />
                  <p className="text-sm font-medium text-[var(--az-text-secondary)]">No published versions yet</p>
                  <p className="text-xs text-[var(--az-text-muted)] mt-1">Click "Publish Version" to save a snapshot you can revert to later.</p>
                </div>
              ) : (
                versions.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 p-4 rounded-az-md border border-az-border bg-az-surface-solid hover:shadow-az-card transition-shadow"
                  >
                    {/* Version icon */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx === 0 ? 'text-white' : 'text-[var(--az-text-muted)]'}`}
                        style={{ background: idx === 0 ? 'var(--az-accent)' : 'var(--az-bg-alt)' }}>
                        {idx === 0 ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      {idx < versions.length - 1 && <div className="w-0.5 h-8 bg-az-border mt-1" />}
                    </div>

                    {/* Version info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--az-text)]">
                          {v.label || `Version ${versions.length - idx}`}
                        </span>
                        {idx === 0 && <Badge>Latest</Badge>}
                      </div>
                      <p className="text-xs text-[var(--az-text-muted)] mt-0.5">
                        {formatDate(v.createdAt)} · {v.slideCount} slides
                      </p>

                      {/* Revert button */}
                      {idx > 0 && canPublish && (
                        <button
                          onClick={() => handleRevert(v.id)}
                          disabled={revertingId === v.id}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-az-sm transition-colors"
                          style={{ background: 'var(--az-accent-subtle)', color: 'var(--az-accent)' }}
                        >
                          <RefreshCw className={`w-3 h-3 ${revertingId === v.id ? 'animate-spin' : ''}`} />
                          {revertingId === v.id ? 'Reverting...' : 'Revert to this version'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-az-border bg-az-bg-alt">
              <p className="text-xs text-[var(--az-text-muted)] text-center">
                Reverting replaces all current slides. A new version entry is created automatically.
              </p>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
