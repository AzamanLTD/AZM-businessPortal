// src/pages/Settings.jsx
// =============================================================================
// Settings — Main hub with tabs for all governance sub-screens
//
// Tabs: Business Profile | Roles & Permissions | Notifications | Activity Log | Danger Zone
// The existing Business Profile form (from the old Settings.jsx) lives in the
// first tab; new governance screens are the remaining tabs.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { business as businessApi, locations as locApi } from '@/lib/api';
import { marketplaceApi } from '@/lib/marketplaceApi';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Button, Input, Textarea, Badge, Switch, Tabs } from '@/components/ui';
import { KYB_STATUS_META } from '@/lib/utils';
import { Building2, Save, Eye, BadgeCheck, QrCode, Wallet, ImagePlus, Palette, Shield, Bell, History, AlertTriangle, CheckCircle2, Users, Code2 } from 'lucide-react';
import { uploadImageToCloudinary, isCloudinaryConfigured, validateImageFile } from '@/lib/cloudinary';
import { toast } from 'sonner';
import PublicProfilePreview from '@/components/PublicProfilePreview';
import QrCodePanel from '@/components/QrCodePanel';
import RolesPermissions from '@/pages/settings/RolesPermissions';
import NotificationPrefs from '@/pages/settings/NotificationPrefs';
import ActivityLog from '@/pages/settings/ActivityLog';
import DangerZone from '@/pages/settings/DangerZone';
import TeamAccess from '@/pages/settings/TeamAccess';
import BusinessMeta from '@/pages/settings/BusinessMeta';
import Developer from '@/pages/settings/Developer';

const CATEGORIES = [
  { value: 'LOGISTICS',          label: 'Transit & Transport' },
  { value: 'FOOD_BEVERAGE',      label: 'Restaurants' },
  { value: 'REAL_ESTATE',        label: 'Hotels & Stays' },
  { value: 'RETAIL',             label: 'Retail' },
  { value: 'HEALTH_WELLNESS',    label: 'Health & Wellness' },
  { value: 'EDUCATION',          label: 'Education' },
  { value: 'ENTERTAINMENT',      label: 'Entertainment' },
  { value: 'FREELANCE_SERVICES', label: 'Services' },
  { value: 'TECHNOLOGY',         label: 'Technology' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'OTHER',              label: 'Other' },
];

export default function Settings() {
  const { bizProfile, user, refreshProfile } = useAuth();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('settings.manage');
  const qc = useQueryClient();

  // ── Business Profile form state (from old Settings) ──────────────────────
  const [form, setForm] = useState({
    businessName: '', description: '', website: '', phoneNumber: '',
    contactEmail: '', address: '', country: '', category: '',
    logoUrl: '', coverPhotoUrl: '', adAccentColor: '',
    businessMeta: {},
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (bizProfile) {
      setForm({
        businessName: bizProfile.businessName || '',
        description:  bizProfile.description  || '',
        website:       bizProfile.website      || '',
        phoneNumber:   bizProfile.phoneNumber  || '',
        contactEmail:  bizProfile.contactEmail || '',
        address:       bizProfile.address      || '',
        country:       bizProfile.country      || '',
        category:      bizProfile.category     || '',
        logoUrl:       bizProfile.logoUrl      || '',
        coverPhotoUrl: bizProfile.coverPhotoUrl || '',
        adAccentColor: bizProfile.adAccentColor || '',
        businessMeta: bizProfile.businessMeta || {},
      });
    }
  }, [bizProfile]);

  const saveMutation = useMutation({
    mutationFn: (data) => businessApi.update(data),
    onSuccess: () => {
      toast.success('Settings saved');
      refreshProfile();
    },
    onError: (e) => toast.error('Save failed: ' + e.message),
  });

  const handleSave = () => {
    saveMutation.mutate({
      businessName: form.businessName,
      description:  form.description,
      website:      form.website,
      phoneNumber:  form.phoneNumber,
      contactEmail: form.contactEmail,
      address:      form.address,
      country:      form.country,
      category:     form.category,
      logoUrl:      form.logoUrl,
      coverPhotoUrl: form.coverPhotoUrl,
      adAccentColor: form.adAccentColor || null,
      businessMeta: form.businessMeta,
    });
  };

  const copyBizId = async () => {
    if (!bizProfile?.bizId) return;
    try {
      await navigator.clipboard.writeText(bizProfile.bizId);
      toast.success('BIZ ID copied');
    } catch { /* ignore */ }
  };

  // ── Business Profile tab content ────────────────────────────────────────
  const profileContent = (
    <div className="space-y-6">
      {/* Logo + Cover Photo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo */}
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--az-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--az-text)]">Business Logo</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[var(--az-border)] flex-shrink-0">
              {form.logoUrl
                ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center bg-[var(--az-accent-subtle)]">
                    <span className="text-2xl font-black text-[var(--az-accent)]">{(form.businessName || 'B').charAt(0)}</span>
                  </div>
              }
            </div>
            <Input
              placeholder="Logo URL"
              value={form.logoUrl}
              onChange={e => setForm({ ...form, logoUrl: e.target.value })}
              disabled={!canManage}
            />
          </div>
        </Card>

        {/* Cover Photo */}
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--az-text)]">Cover Photo</h3>
          {form.coverPhotoUrl
            ? <img src={form.coverPhotoUrl} alt="cover" className="w-full h-24 rounded-xl object-cover" />
            : <div className="w-full h-24 rounded-xl border-2 border-dashed border-[var(--az-border)] flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-[var(--az-text-muted)]" />
              </div>
          }
          <Input
            placeholder="Cover photo URL"
            value={form.coverPhotoUrl}
            onChange={e => setForm({ ...form, coverPhotoUrl: e.target.value })}
            disabled={!canManage}
          />
        </Card>
      </div>

      {/* Basic info */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--az-text)]">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Business Name" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} disabled={!canManage} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">Category</label>
            <select
              className="w-full px-4 py-3 rounded-xl bg-[var(--az-black)] border border-[var(--az-border)] text-[var(--az-text)] text-sm outline-none focus:border-[var(--az-accent)]"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              disabled={!canManage}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value} style={{ background: 'var(--az-surface)' }}>{c.label}</option>)}
            </select>
          </div>
          <Input label="Website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} disabled={!canManage} />
          <Input label="Phone" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} disabled={!canManage} />
          <Input label="Email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} disabled={!canManage} />
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} disabled={!canManage} />
        </div>
        <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={!canManage} rows={3} />
      </Card>

      {/* Accent color */}
      <Card className="flex items-center gap-4">
        <Palette className="w-5 h-5 text-[var(--az-accent)]" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--az-text)]">Marketplace Accent Color</h3>
          <p className="text-xs text-[var(--az-text-muted)]">Customize the color of your marketplace card.</p>
        </div>
        <input
          type="color"
          value={form.adAccentColor || '#6C5FC7'}
          onChange={e => setForm({ ...form, adAccentColor: e.target.value })}
          disabled={!canManage}
          className="w-12 h-10 rounded-lg border border-[var(--az-border)] cursor-pointer bg-transparent"
        />
      </Card>

      {/* KYB status + BIZ ID */}
      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5" style={{ color: KYB_STATUS_META[bizProfile?.kybStatus || 'UNVERIFIED']?.color }} />
          <div>
            <span className="text-xs text-[var(--az-text-muted)]">KYB Status</span>
            <p className="text-sm font-semibold text-[var(--az-text)]">{KYB_STATUS_META[bizProfile?.kybStatus || 'UNVERIFIED']?.label || bizProfile?.kybStatus}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Badge className="font-mono">{bizProfile?.bizId}</Badge>
          <Button size="sm" variant="ghost" onClick={copyBizId}>Copy BIZ ID</Button>
        </div>
      </Card>

      {/* Category-specific fields */}
      <BusinessMeta
        meta={form.businessMeta}
        setMeta={(m) => setForm({ ...form, businessMeta: m })}
        category={form.category}
        canManage={canManage}
      />

      {/* Save + Preview buttons */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="w-4 h-4 mr-1.5" /> {showPreview ? 'Hide Preview' : 'Preview'}
        </Button>
        <Button onClick={handleSave} disabled={!canManage || saveMutation.isPending} loading={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      {!canManage && (
        <p className="text-xs text-[var(--az-text-muted)] italic text-center">
          Only the owner or admins with "settings.manage" permission can edit these settings.
        </p>
      )}

      {showPreview && bizProfile && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[var(--az-text)] mb-3">Public Profile Preview</h3>
          <PublicProfilePreview bizProfile={{ ...bizProfile, ...form }} />
        </Card>
      )}

      {bizProfile?.isPausedByOwner && (
        <Card className="p-4 border-[var(--az-danger)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--az-danger)]" />
            <p className="text-sm font-semibold text-[var(--az-danger)]">
              Your business is currently paused. Go to the Danger Zone tab to resume.
            </p>
          </div>
        </Card>
      )}
    </div>
  );

  // ── Build tabs array ────────────────────────────────────────────────────
  const tabs = [
    { label: 'Profile', icon: Building2, content: profileContent },
    { label: 'Roles & Permissions', icon: Shield, content: <RolesPermissions /> },
    { label: "Team Access", icon: Users, content: <TeamAccess /> },
    { label: 'Notifications', icon: Bell, content: <NotificationPrefs /> },
    { label: 'Activity Log', icon: History, content: <ActivityLog /> },
    { label: 'Danger Zone', icon: AlertTriangle, content: <DangerZone /> },
    { label: 'Developer', icon: Code2, content: <Developer /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[var(--az-text)]">Settings</h1>
        {bizProfile?.isPausedByOwner && (
          <Badge color="var(--az-danger)" className="text-xs">Paused</Badge>
        )}
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}
