/**
 * Settings → Messaging Channels — Section 4, Phase 2
 * Connect WhatsApp Business API and SMS gateway.
 * Configure per-notification-type delivery preference.
 * View monthly send cost.
 */
import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { request } from '@/lib/apiCore';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/lib/toast';
import { Card } from '@/components/instrument';
import {
  MessageSquare, Phone, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Send, Settings, Eye, EyeOff, Plus, Trash2,
  Bell, ShoppingBag, CalendarCheck, Star, DollarSign,
  ChevronRight, Info, Zap, Globe, Copy, Check
} from 'lucide-react';

// WhatsApp SVG icon (inline)
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const NOTIF_TYPES = [
  { id: 'booking_confirmed', label: 'Booking Confirmed', icon: CalendarCheck, desc: 'When a reservation/booking is confirmed' },
  { id: 'order_ready', label: 'Order Ready', icon: ShoppingBag, desc: 'When a customer order is ready for pickup' },
  { id: 'order_update', label: 'Order Update', icon: Bell, desc: 'Status changes on an order' },
  { id: 'review_received', label: 'New Review', icon: Star, desc: 'When a customer leaves a review' },
  { id: 'payment_received', label: 'Payment Received', icon: DollarSign, desc: 'When a payment is confirmed' },
];

const CHANNELS = ['app', 'whatsapp', 'sms'];
const CHANNEL_LABELS = { app: 'In-App', whatsapp: 'WhatsApp', sms: 'SMS' };

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded transition-colors" style={{ color: copied ? 'var(--f-ok)' : 'var(--f-text-3)' }}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function StatusBadge({ connected }) {
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={connected ? { background: 'var(--f-ok-bg)', color: 'var(--f-ok)' } : { background: 'var(--f-bad-bg)', color: 'var(--f-bad)' }}>
      {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

export default function MessagingChannels() {
  const { bizProfile } = useAuth();

  // WhatsApp state
  const [waNumber, setWaNumber] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [showWaKey, setShowWaKey] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waConnecting, setWaConnecting] = useState(false);

  // SMS state
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('');
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [smsConnected, setSmsConnected] = useState(false);
  const [smsConnecting, setSmsConnecting] = useState(false);

  // Test send
  const [testNumber, setTestNumber] = useState('');
  const [testing, setTesting] = useState(false);

  // Notification routing preferences (per type, per channel)
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const defaults = {};
    NOTIF_TYPES.forEach(t => { defaults[t.id] = { app: true, whatsapp: false, sms: false }; });
    return defaults;
  });

  // Monthly messaging cost — fetched from backend
  const { data: monthlyCost, isLoading: costLoading } = useQuery({
    queryKey: ['messaging-stats'],
    queryFn: async () => { const r = await request('/api/business-os/messaging-stats'); return r; },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Fetch existing messaging config on mount
  const { data: msgConfig } = useQuery({
    queryKey: ['messaging-config'],
    queryFn: async () => { const r = await request('/api/business-os/messaging-config'); return r; },
    staleTime: 60_000,
  });

  // Sync config from backend
  useEffect(() => {
    if (msgConfig) {
      setWaConnected(msgConfig.waConnected || false);
      setWaNumber(msgConfig.waPhoneNumber || '');
      setSmsConnected(msgConfig.smsConnected || false);
      setSmsSenderId(msgConfig.smsSenderId || '');
    }
  }, [msgConfig]);

  // Fetch notification routing preferences
  const { data: routingPrefs } = useQuery({
    queryKey: ['messaging-routing'],
    queryFn: async () => { const r = await request('/api/business-os/messaging-config/preferences'); return r; },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (routingPrefs?.preferences) {
      setNotifPrefs(prev => {
        const merged = {};
        NOTIF_TYPES.forEach(t => {
          merged[t.id] = { app: true, whatsapp: false, sms: false, ...prev[t.id], ...routingPrefs.preferences[t.id] };
        });
        return merged;
      });
    }
  }, [routingPrefs]);

  // Save routing preference changes
  const savePrefs = useMutation({
    mutationFn: async (prefs) => {
      return request('/api/business-os/messaging-config/preferences', 'PATCH', { preferences: prefs });
    },
    onSuccess: () => toast.go('Routing preferences saved'),
    onError: (e) => toast.stop(e.message || 'Failed to save preferences'),
  });

  const handleConnectWA = async () => {
    if (!waNumber || !waApiKey) { toast.stop('Enter phone number and API key'); return; }
    setWaConnecting(true);
    try {
      const r = await request('/api/business-os/messaging-config/whatsapp', 'POST', {
        action: 'connect', phoneNumber: waNumber, apiKey: waApiKey,
      });
      setWaConnected(true);
      toast.go('WhatsApp Business connected');
    } catch (e) {
      toast.stop(e.message || 'Failed to connect WhatsApp');
    } finally {
      setWaConnecting(false);
    }
  };

  const handleConnectSMS = async () => {
    if (!smsApiKey || !smsSenderId) { toast.stop('Enter API key and sender ID'); return; }
    setSmsConnecting(true);
    try {
      const r = await request('/api/business-os/messaging-config/sms', 'POST', {
        action: 'connect', apiKey: smsApiKey, senderId: smsSenderId, provider: 'africas_talking',
      });
      setSmsConnected(true);
      toast.go('SMS gateway connected');
    } catch (e) {
      toast.stop(e.message || 'Failed to connect SMS gateway');
    } finally {
      setSmsConnecting(false);
    }
  };

  const handleTestSend = async () => {
    if (!testNumber) { toast.stop('Enter a phone number'); return; }
    setTesting(true);
    try {
      const channel = waConnected ? 'whatsapp' : 'sms';
      const r = await request('/api/business-os/messaging-config/test', 'POST', {
        phoneNumber: testNumber, channel,
      });
      toast.go(`Test message sent to ${testNumber}`);
    } catch (e) {
      toast.stop(e.message || 'Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  const togglePref = (type, channel) => {
    setNotifPrefs(prev => {
      const updated = { ...prev, [type]: { ...prev[type], [channel]: !prev[type][channel] } };
      // Persist to backend (debounced by React Query)
      savePrefs.mutate({ [type]: { ...updated[type] } });
      return updated;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>Messaging Channels</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>
          Connect WhatsApp Business and SMS to send automated confirmations, alerts, and broadcasts directly to customers.
        </p>
      </div>

      {/* ── WhatsApp ── */}
      <GlassPanel className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--f-line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#25D36620' }}>
              <WhatsAppIcon className="w-5 h-5" style={{ color: '#25D366' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--f-text)' }}>WhatsApp Business</h2>
              <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Send booking confirmations, order alerts, and broadcasts</p>
            </div>
          </div>
          <StatusBadge connected={waConnected} />
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>WhatsApp Business Number</label>
              <div className="flex items-center gap-2 bg-[var(--f-surface)] border rounded-xl px-4 py-3" style={{ borderColor: 'var(--f-line)' }}>
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--f-text-3)' }} />
                <input value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="+233 20 000 0000"
                  className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: 'var(--f-text)' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>API Key / Access Token</label>
              <div className="flex items-center gap-2 bg-[var(--f-surface)] border rounded-xl px-4 py-3" style={{ borderColor: 'var(--f-line)' }}>
                <input value={waApiKey} onChange={e => setWaApiKey(e.target.value)} type={showWaKey ? 'text' : 'password'} placeholder="••••••••••••••••"
                  className="flex-1 text-sm bg-transparent focus:outline-none font-mono" style={{ color: 'var(--f-text)' }} />
                <button onClick={() => setShowWaKey(v => !v)} style={{ color: 'var(--f-text-3)' }}>
                  {showWaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'rgba(61,116,219,0.06)', borderColor: 'rgba(61,116,219,0.2)' }}>
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--f-info)' }} />
            <p className="text-xs" style={{ color: 'var(--f-text-2)' }}>
              Requires a WhatsApp Business API account (Meta Cloud API or a provider like Twilio, Vonage, or WhatsTool). 
              WhatsApp charges per conversation — see your provider's pricing.
            </p>
          </div>

          <button onClick={waConnected ? async () => { await request('/api/business-os/messaging-config/whatsapp', 'POST', { action: 'disconnect' }); setWaConnected(false); toast.go('WhatsApp disconnected'); } : handleConnectWA}
            disabled={waConnecting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: waConnected ? 'var(--f-bad)' : '#25D366' }}>
            {waConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : waConnected ? <XCircle className="w-4 h-4" /> : <WhatsAppIcon className="w-4 h-4" />}
            {waConnected ? 'Disconnect' : waConnecting ? 'Connecting…' : 'Connect WhatsApp'}
          </button>
        </div>
      </GlassPanel>

      {/* ── SMS ── */}
      <GlassPanel className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--f-line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--f-info)', opacity: 0.9 }}>
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--f-text)' }}>SMS Gateway</h2>
              <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Reach customers who aren't on WhatsApp</p>
            </div>
          </div>
          <StatusBadge connected={smsConnected} />
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Sender ID / From Name</label>
              <input value={smsSenderId} onChange={e => setSmsSenderId(e.target.value)} placeholder="AzamanBiz"
                className="w-full bg-[var(--f-surface)] border rounded-xl px-4 py-3 text-sm focus:outline-none" style={{ borderColor: 'var(--f-line)', color: 'var(--f-text)' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>API Key</label>
              <div className="flex items-center gap-2 bg-[var(--f-surface)] border rounded-xl px-4 py-3" style={{ borderColor: 'var(--f-line)' }}>
                <input value={smsApiKey} onChange={e => setSmsApiKey(e.target.value)} type={showSmsKey ? 'text' : 'password'} placeholder="••••••••••••••••"
                  className="flex-1 text-sm bg-transparent focus:outline-none font-mono" style={{ color: 'var(--f-text)' }} />
                <button onClick={() => setShowSmsKey(v => !v)} style={{ color: 'var(--f-text-3)' }}>
                  {showSmsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={smsConnected ? async () => { await request('/api/business-os/messaging-config/sms', 'POST', { action: 'disconnect' }); setSmsConnected(false); toast.go('SMS gateway disconnected'); } : handleConnectSMS}
            disabled={smsConnecting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: smsConnected ? 'var(--f-bad)' : 'var(--f-info)' }}>
            {smsConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : smsConnected ? <XCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {smsConnected ? 'Disconnect' : smsConnecting ? 'Connecting…' : 'Connect SMS'}
          </button>
        </div>
      </GlassPanel>

      {/* ── Test send ── */}
      {(waConnected || smsConnected) && (
        <GlassPanel className="p-5 space-y-4">
          <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>Test Message</h3>
          <div className="flex gap-3">
            <input value={testNumber} onChange={e => setTestNumber(e.target.value)} placeholder="+233 20 000 0000"
              className="flex-1 bg-[var(--f-surface)] border rounded-xl px-4 py-2.5 text-sm focus:outline-none" style={{ borderColor: 'var(--f-line)', color: 'var(--f-text)' }} />
            <button onClick={handleTestSend} disabled={testing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--f-tint-color)' }}>
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>Sends a test "Hello from {bizProfile?.businessName || 'Azaman Business'}" message to verify your connection.</p>
        </GlassPanel>
      )}

      {/* ── Monthly cost ── */}
      {(waConnected || smsConnected) && (
        <GlassPanel className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>This Month's Messaging Cost</h3>
            <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--f-bg)', color: 'var(--f-text-3)', border: '1px solid var(--f-line)' }}>
              {new Date().toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          {costLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--f-text-3)' }}>
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading messaging stats…
            </div>
          ) : monthlyCost ? (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'WhatsApp', value: `GHS ${(monthlyCost.whatsapp || 0).toFixed(2)}`, color: '#25D366' },
                { label: 'SMS', value: `GHS ${(monthlyCost.sms || 0).toFixed(2)}`, color: 'var(--f-info)' },
                { label: 'Total Messages', value: (monthlyCost.messages || 0).toString(), color: 'var(--f-tint-color)' },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-xl border" style={{ borderColor: 'var(--f-line)', background: 'var(--f-bg)' }}>
                  <div className="text-xl font-bold tabular-nums" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>No messaging data yet this month.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--f-text-3)' }}>Stats will appear once you start sending messages.</p>
            </div>
          )}
        </GlassPanel>
      )}

      {/* ── Notification routing ── */}
      <GlassPanel className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
          <h3 className="font-bold" style={{ color: 'var(--f-text)' }}>Notification Routing</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--f-text-3)' }}>Choose which channel each notification type uses</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--f-line)' }}>
          {/* Header row */}
          <div className="grid grid-cols-4 px-6 py-2">
            <div className="text-xs font-bold uppercase tracking-wide col-span-1" style={{ color: 'var(--f-text-3)' }}>Notification</div>
            {CHANNELS.map(ch => (
              <div key={ch} className="text-xs font-bold uppercase tracking-wide text-center" style={{ color: 'var(--f-text-3)' }}>{CHANNEL_LABELS[ch]}</div>
            ))}
          </div>
          {NOTIF_TYPES.map(type => (
            <div key={type.id} className="grid grid-cols-4 items-center px-6 py-3.5 hover:bg-az-bg/40 transition-colors">
              <div className="flex items-center gap-2.5 col-span-1">
                <type.icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--f-tint-color)' }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--f-text)' }}>{type.label}</div>
                  <div className="text-xs" style={{ color: 'var(--f-text-3)' }}>{type.desc}</div>
                </div>
              </div>
              {CHANNELS.map(ch => (
                <div key={ch} className="flex justify-center">
                  <button
                    onClick={() => togglePref(type.id, ch)}
                    disabled={ch === 'app'} // app notifications always on
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all disabled:cursor-default"
                    style={notifPrefs[type.id]?.[ch]
                      ? { background: 'var(--f-tint-color)', borderColor: 'var(--f-tint-color)' }
                      : { background: 'white', borderColor: 'var(--f-line)' }}>
                    {notifPrefs[type.id]?.[ch] && <Check className="w-3 h-3 text-white" />}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'var(--f-line)' }}>
          <button onClick={() => toast.go('Notification preferences saved')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--f-tint-color)' }}>
            <CheckCircle2 className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
