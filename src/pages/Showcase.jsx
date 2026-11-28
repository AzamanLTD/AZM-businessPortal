import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { request } from '@/lib/api';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { Card, Button, Empty, Input, Skel, Tag } from '@/components/instrument';
import {
  Image as ImageIcon,
  Smartphone,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  History,
  GitCommit,
  X,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from '@/lib/toast';

export default function Showcase() {
  const { hasPermission } = usePermission();
  const { bizProfile } = useAuth();
  
  const businessId = bizProfile?.id;

  // Mirrors the backend (/api/showcases): the owner, or staff with
  // marketing.publish, showcase.manage or storefront.manage, change it.
  const canPublish = hasPermission(['marketing.publish', 'showcase.manage', 'storefront.manage']);
  const canView = canPublish || hasPermission('marketing.view');

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

  useEffect(() => {
    if (businessId && canView) loadShowcaseData();
  }, [businessId, canView]);

  const loadShowcaseData = async () => {
    setLoading(true);
    try {
      const res = await request(`/api/showcases/${businessId}`);
      setSlides(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      toast.stop('Failed to load showcase data');
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
      toast.stop('Failed to load version history');
    } finally {
      setVersionsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (slides.length === 0) {
      toast.stop('No slides to publish');
      return;
    }
    setPublishing(true);
    try {
      await request(`/api/showcases/${businessId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ label: publishLabel || null }),
      });
      toast.go('Storefront version published');
      setPublishLabel('');
      setShowPublishInput(false);
      loadVersions();
    } catch (err) {
      toast.stop(err.message || 'Failed to publish version');
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
      toast.go('Storefront reverted to previous version');
      loadShowcaseData();
      loadVersions();
    } catch (err) {
      toast.stop(err.message || 'Failed to revert');
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
    if (!canPublish) { toast.stop('You do not have permission to publish changes'); return; }

    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, 'showcase');
      // No placeholder caption: customers would see it on the slide.
      const payload = { businessProfileId: businessId, mediaUrl: url };
      await request('/api/showcases', { method: 'POST', body: JSON.stringify(payload) });
      toast.go('Photo added to showcase gallery');
      loadShowcaseData();
    } catch (err) {
      toast.stop(err.message || 'Gallery upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSlide = async (slideId) => {
    if (!canPublish) return;
    if (!confirm('Are you sure you want to remove this photo?')) return;
    try {
      await request(`/api/showcases/${slideId}`, { method: 'DELETE' });
      toast.go('Slide removed successfully');
      setSlides(prev => prev.filter(s => s.id !== slideId));
    } catch (err) {
      toast.stop('Failed to delete showcase slide');
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
      toast.go('Showcase layout reordered');
    } catch (err) {
      toast.stop('Failed to save reorder position');
      loadShowcaseData();
    }
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-[var(--stop)] mb-4" />
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--text-3)] max-w-md">
          You do not have permission to view the Showcase Editor. Please consult your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-[var(--text)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Smartphone className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            Showcase slideshow
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-1">
            The photos at the top of your business page in the Azaman app. Save a version before big changes so you can go back to it.
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
          <Card solid className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} /> Full-Bleed Profile Slideshow
                </h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">High-definition cover slides shown as full bleed on your profile.</p>
              </div>
              <Tag>{slides.length} Photos</Tag>
            </div>

            {/* Upload area */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-lg py-8 px-4:border-tint cursor-pointer transition-all bg-[var(--surface-sunk)]">
              <Upload className="w-8 h-8 text-[var(--text-3)] mb-2" />
              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {uploading ? 'Processing & uploading slide...' : 'Upload Showcase Slide Image'}
              </span>
              <p className="text-[10px] text-[var(--text-3)] mt-1">Accepts high-resolution JPG, PNG, WebP up to 5MB.</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadSlide} disabled={!canPublish} />
            </label>

            {/* Slides list */}
            {loading ? (
              <Skel className="h-40 w-full" />
            ) : slides.length === 0 ? (
              <Empty icon={ImageIcon} title="Your slideshow is empty" description="Upload images above to create a powerful hero slideshow carousel." />
            ) : (
              <div className="space-y-2">
                {slides.map((slide, idx) => (
                  <div key={slide.id || idx} className="flex items-center gap-3 p-2.5 rounded-md border border-line bg-[var(--surface-raise)]:shadow-sm transition-all">
                    <img src={slide.mediaUrl} className="w-16 h-12 object-cover rounded-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">Slide {idx + 1}</p>
                      <p className="text-[10px] text-[var(--text-3)] truncate">{slide.mediaUrl}</p>
                    </div>
                    {canPublish && <div className="flex items-center gap-1">
                      <button onClick={() => handleMoveSlide(idx, -1)} disabled={idx === 0}
                        className="p-1.5 rounded-sm text-[var(--text-3)]:bg-[var(--surface-sunk)] disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleMoveSlide(idx, 1)} disabled={idx === slides.length - 1}
                        className="p-1.5 rounded-sm text-[var(--text-3)]:bg-[var(--surface-sunk)] disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRemoveSlide(slide.id)}
                        className="p-1.5 rounded-sm text-[var(--stop)]:bg-[var(--f-bad-bg)]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Phone Preview Column */}
        {showPhonePreview && (
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-2)]">Slideshow preview</h3>
                <Tag>{slides.length} {slides.length === 1 ? 'slide' : 'slides'}</Tag>
              </div>
              <SlideshowPreview slides={slides} name={bizProfile?.businessName} />
              <p className="text-xs text-[var(--text-3)] text-center mt-4 max-w-xs mx-auto">
                Your saved slides, in order, as they lead your business page in the app.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <Card solid className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ borderRadius: '20px' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-sm" style={{ background: 'var(--surface-sunk)' }}>
                  <History className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)]">Version History</h2>
                  <p className="text-xs text-[var(--text-3)]">Publish snapshots and revert to any saved version</p>
                </div>
              </div>
              <button onClick={() => setShowVersionModal(false)} className="p-2 rounded-sm:bg-[var(--surface-sunk)] text-[var(--text-3)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Versions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {versionsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 rounded-md animate-pulse bg-[var(--surface-sunk)]" />)}
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GitCommit className="w-10 h-10 text-[var(--text-3)] mb-3" />
                  <p className="text-sm font-medium text-[var(--text-2)]">No published versions yet</p>
                  <p className="text-xs text-[var(--text-3)] mt-1">Click "Publish Version" to save a snapshot you can revert to later.</p>
                </div>
              ) : (
                versions.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 p-4 rounded-md border border-line bg-[var(--surface-raise)]:shadow-sm transition-shadow"
                  >
                    {/* Version icon */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx === 0 ? 'text-[var(--text)]' : 'text-[var(--text-3)]'}`}
                        style={{ background: idx === 0 ? 'var(--accent)' : 'var(--surface-sunk)' }}>
                        {idx === 0 ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      {idx < versions.length - 1 && <div className="w-0.5 h-8 bg-line mt-1" />}
                    </div>

                    {/* Version info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {v.label || `Version ${versions.length - idx}`}
                        </span>
                        {idx === 0 && <Tag>Latest</Tag>}
                      </div>
                      <p className="text-xs text-[var(--text-3)] mt-0.5">
                        {formatDate(v.createdAt)} · {v.slideCount} slides
                      </p>

                      {/* Revert button */}
                      {idx > 0 && canPublish && (
                        <button
                          onClick={() => handleRevert(v.id)}
                          disabled={revertingId === v.id}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-sm transition-colors"
                          style={{ background: 'var(--surface-sunk)', color: 'var(--accent)' }}
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
            <div className="p-4 border-t border-line bg-[var(--surface-sunk)]">
              <p className="text-xs text-[var(--text-3)] text-center">
                Reverting replaces all current slides. A new version entry is created automatically.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// The saved slides in a phone-width frame: the first one large, as it opens
// the business page, and the rest in order beneath it. Nothing invented: with
// no slides it says so.
function SlideshowPreview({ slides, name }) {
  const [active, setActive] = useState(0);
  const current = slides[Math.min(active, Math.max(slides.length - 1, 0))];
  return (
    <div className="mx-auto w-[300px] rounded-[28px] border border-line bg-[var(--surface-raise)] p-3 shadow-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-[var(--surface-sunk)]">
        {current ? (
          current.mediaType === 'VIDEO'
            ? <video src={current.mediaUrl} className="h-full w-full object-cover" muted playsInline controls />
            : <img src={current.mediaUrl} alt={current.caption || ''} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[var(--text-3)]">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">No slides yet. Your business page opens with your cover photo until you add some.</span>
          </div>
        )}
        {current?.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <p className="text-xs font-medium text-white">{current.caption}</p>
          </div>
        )}
      </div>
      {name && <p className="mt-3 px-1 text-sm font-bold truncate">{name}</p>}
      {slides.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {slides.map((slide, idx) => (
            <button key={slide.id || idx} onClick={() => setActive(idx)}
              aria-label={`Show slide ${idx + 1}`}
              className={`h-12 w-12 flex-none overflow-hidden rounded-md border ${idx === active ? 'border-[var(--accent)]' : 'border-line'}`}>
              <img src={slide.thumbnailUrl || slide.mediaUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
