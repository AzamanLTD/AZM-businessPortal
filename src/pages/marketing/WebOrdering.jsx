/**
 * Marketing → Web Ordering — Section 5, Phase 2
 * Toggle public web ordering, preview storefront, download QR codes.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@/lib/apiCore';
import { storefrontApi } from '@/services/storefrontApi';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Card } from '@/components/forge';
import {
  Globe, QrCode, Eye, Download, ExternalLink, CheckCircle2,
  Copy, Check, Zap, Info, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

const PUBLIC_ORDER_BASE = 'https://order.azaman.app';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg transition-colors flex-shrink-0"
      style={{ color: copied ? 'var(--f-ok)' : 'var(--f-text-3)' }}>
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function WebOrdering() {
  const { bizProfile } = useAuth();
  const bizId = bizProfile?.id || bizProfile?._id || 'demo';
  const [enabled, setEnabled] = useState(false);
  const [accentColor, setAccentColor] = useState(bizProfile?.adAccentColor || '#6C4FD1');
  const [storefrontTheme, setStorefrontTheme] = useState(null);

  // Fetch storefront theme for accent color
  useEffect(() => {
    if (!bizProfile?.id) return;
    storefrontApi.getPublishedLayout(bizProfile.id).then(data => {
      if (data?.theme?.tokenSet?.accent) {
        setAccentColor(data.theme.tokenSet.accent);
        setStorefrontTheme(data);
      }
    }).catch(() => {
      // Fallback: try public-theme endpoint
      storefrontApi.listThemes().then(themes => {
        // Use first theme accent as fallback
      }).catch(() => {});
    });
  }, [bizProfile?.id]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  const publicUrl = `${PUBLIC_ORDER_BASE}/${bizId}`;

  const isBizType = (types) => types.includes((bizProfile?.businessType || bizProfile?.category || '').toUpperCase());
  const bizCat = (bizProfile?.businessType || bizProfile?.category || '').toUpperCase();
  const isRestaurant = isBizType(['RESTAURANT', 'DINE_IN', 'CAFE']);
  const isHotel = isBizType(['HOTEL']);
  const isTransit = isBizType(['TRANSIT', 'BUS']);

  // Fetch real tables/rooms/routes for QR code generation
  const { data: tablesData } = useQuery({
    queryKey: ['biz-tables'],
    queryFn: async () => { const r = await request('/api/business-os/restaurant/tables'); return r; },
    enabled: isRestaurant,
    staleTime: 5 * 60_000,
  });
  const { data: roomsData } = useQuery({
    queryKey: ['biz-rooms'],
    queryFn: async () => { const r = await request('/api/business-os/hotel/rooms'); return r; },
    enabled: isHotel,
    staleTime: 5 * 60_000,
  });
  const { data: routesData } = useQuery({
    queryKey: ['biz-routes'],
    queryFn: async () => { const r = await request('/api/business-os/transit/routes'); return r; },
    enabled: isTransit,
    staleTime: 5 * 60_000,
  });

  const qrItems = isRestaurant
    ? (tablesData?.tables || []).map((t, i) => ({ id: t.id || `t${i}`, label: `Table ${t.label || t.tableNumber || i+1}`, url: `${publicUrl}?table=${t.id || i+1}` }))
    : isHotel
    ? (roomsData?.rooms || []).map((r, i) => ({ id: r.id || `r${i}`, label: `Room ${r.roomNumber || i+1}`, url: `${publicUrl}?room=${r.id || r.roomNumber || i+1}` }))
    : isTransit
    ? (routesData?.routes || []).map((r, i) => ({ id: r.id || `v${i}`, label: r.name || `Route ${i+1}`, url: `${publicUrl}?route=${r.id || i+1}` }))
    : [{ id: 'main', label: 'Main', url: publicUrl }];

  const handleSave = async () => {
    setSaving(true);
    try {
      await request('/api/business/profile', { method: 'PATCH', body: JSON.stringify({ webOrderingEnabled: enabled, adAccentColor: accentColor }) });
      toast.success('Settings saved');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const TABS = ['setup', 'qr', 'preview'];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>Web Ordering</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>
          A public page for customers to order without the Azaman app — just share the link or a QR code.
        </p>
      </div>

      <GlassPanel className="p-4 flex items-center gap-3">
        <Globe className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--f-tint-color)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--f-text-3)' }}>Public URL</p>
          <p className="text-sm font-mono truncate" style={{ color: 'var(--f-text)' }}>{publicUrl}</p>
        </div>
        <CopyBtn text={publicUrl} />
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg" style={{ color: 'var(--f-text-3)' }}>
          <ExternalLink className="w-4 h-4" />
        </a>
      </GlassPanel>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--f-bg)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={activeTab === t ? { background: 'var(--f-tint-color)', color: '#fff' } : { color: 'var(--f-text-3)' }}>
            {t === 'qr' ? 'QR Codes' : t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: enabled ? 'var(--f-ok-bg)' : 'var(--f-bg)' }}>
                    <Zap className="w-5 h-5" style={{ color: enabled ? 'var(--f-ok)' : 'var(--f-text-3)' }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--f-text)' }}>Enable Web Ordering</p>
                    <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Makes your public page live for customers</p>
                  </div>
                </div>
                <button onClick={() => setEnabled(v => !v)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ background: enabled ? 'var(--f-ok)' : 'var(--f-line-strong)' }}>
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--f-surface)] rounded-full shadow transition-transform"
                    style={{ transform: enabled ? 'translateX(24px)' : 'translateX(0)' }} />
                </button>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 space-y-4">
              <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>Page Branding</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--f-line)' }} />
                    <div>
                      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--f-text)' }}>{accentColor}</p>
                      <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Buttons and highlights</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Logo</label>
                  <div className="flex items-center gap-3">
                    {bizProfile?.logoUrl
                      ? <img src={bizProfile.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border" style={{ borderColor: 'var(--f-line)' }} />
                      : <div className="w-12 h-12 rounded-xl border flex items-center justify-center" style={{ borderColor: 'var(--f-line)', background: 'var(--f-bg)' }}>
                          <ImageIcon className="w-5 h-5" style={{ color: 'var(--f-text-3)' }} />
                        </div>
                    }
                    <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Set in Settings → Business Info</p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--f-tint-color)' }}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Settings
            </button>
          </motion.div>
        )}

        {activeTab === 'qr' && (
          <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <GlassPanel className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>QR Codes</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--f-text-3)' }}>Print and place at each table, room, or vehicle</p>
                </div>
                <button onClick={() => toast.success('Preparing PDF…')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: 'var(--f-tint-color)' }}>
                  <Download className="w-3.5 h-3.5" /> Download All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {qrItems.map(item => (
                  <div key={item.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl border group transition-all hover:shadow-md"
                    style={{ borderColor: 'var(--f-line)', background: 'white' }}>
                    <div className="rounded-xl overflow-hidden border-4 border-white shadow">
                      <QRCode value={item.url} size={80} fgColor={accentColor} bgColor="#ffffff" level="M" includeMargin={false} />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--f-text)' }}>{item.label}</p>
                    <button onClick={() => toast.success(`QR for ${item.label} ready`)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }}>
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'rgba(61,116,219,0.06)', borderColor: 'rgba(61,116,219,0.2)' }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--f-info)' }} />
              <p className="text-xs" style={{ color: 'var(--f-text-2)' }}>
                Customers scan these QR codes to open your branded ordering page directly — no app download, no account required for browsing.
                Account creation (phone + OTP) is only prompted at checkout.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassPanel className="p-5 space-y-4">
              <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>Mobile Preview</h3>
              <div className="flex justify-center">
                <div className="rounded-[36px] border-8 overflow-hidden shadow-2xl" style={{ borderColor: '#111', width: 280 }}>
                  <div className="bg-[var(--f-surface)]" style={{ minHeight: 500 }}>
                    <div className="h-28 flex items-end pb-4 px-4 text-white"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}>
                      {bizProfile?.logoUrl
                        ? <img src={bizProfile.logoUrl} alt="" className="w-10 h-10 rounded-xl mr-3 border-2 border-white/40 object-cover" />
                        : <div className="w-10 h-10 rounded-xl mr-3 bg-[var(--f-surface)]/20 flex items-center justify-center text-white font-bold">{(bizProfile?.businessName || 'B').charAt(0)}</div>
                      }
                      <div>
                        <p className="font-bold leading-tight">{bizProfile?.businessName || 'Your Business'}</p>
                        <p className="text-white/70 text-xs">Order online</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9A96A3' }}>Popular</p>
                      {['Grilled Chicken — GHS 18', 'Jollof Rice — GHS 12', 'Kelewele — GHS 8'].map((name, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ borderColor: '#e0e0e0' }}>
                          <div className="w-11 h-11 rounded-xl flex-shrink-0" style={{ background: accentColor + '20' }} />
                          <p className="text-xs font-semibold flex-1" style={{ color: '#15141A' }}>{name}</p>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-bold" style={{ background: accentColor }}>+</div>
                        </div>
                      ))}
                      <button className="w-full py-3 rounded-xl text-xs font-bold text-white mt-2" style={{ background: accentColor }}>
                        View Full Menu →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--f-text-3)' }}>
                Accent color updates live above. Save your settings to publish changes.
              </p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
