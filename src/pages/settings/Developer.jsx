/**
 * Settings → Developer — API Keys & Webhooks (Section 10, Phase 2)
 * Generate/revoke scoped API keys, configure outbound webhooks,
 * view delivery logs, set signing secrets.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@/lib/apiCore';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import {
  Key, Plus, Trash2, Copy, Eye, EyeOff, Check, RefreshCw,
  Webhook, Globe, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, Clock, CheckCircle2, XCircle, Code2, Shield,
  Settings, Zap
} from 'lucide-react';

const WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Order Created', desc: 'Fires when a new order is placed' },
  { id: 'order.completed', label: 'Order Completed', desc: 'Fires when an order is marked complete' },
  { id: 'reservation.confirmed', label: 'Reservation Confirmed', desc: 'Fires when a booking is confirmed' },
  { id: 'reservation.cancelled', label: 'Reservation Cancelled', desc: 'Fires when a booking is cancelled' },
  { id: 'review.received', label: 'Review Received', desc: 'Fires when a new customer review arrives' },
  { id: 'payroll.disbursed', label: 'Payroll Disbursed', desc: 'Fires when payroll batch is sent' },
  { id: 'invoice.paid', label: 'Invoice Paid', desc: 'Fires when an invoice is marked paid' },
  { id: 'employee.clocked_in', label: 'Employee Clock In', desc: 'Fires when an employee clocks in' },
];

const KEY_SCOPES = [
  { id: 'read:orders', label: 'Read Orders' },
  { id: 'write:orders', label: 'Write Orders' },
  { id: 'read:products', label: 'Read Products' },
  { id: 'write:products', label: 'Write Products' },
  { id: 'read:employees', label: 'Read Employees' },
  { id: 'read:analytics', label: 'Read Analytics' },
  { id: 'read:finance', label: 'Read Finance' },
  { id: 'read:reservations', label: 'Read Reservations' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
      style={{ color: copied ? 'var(--f-ok)' : 'var(--f-text-3)' }}>
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CreateKeyModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('read');
  const [selectedScopes, setSelectedScopes] = useState(['read:orders', 'read:products']);
  const [loading, setLoading] = useState(false);

  const toggleScope = (scope) => setSelectedScopes(prev =>
    prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
  );

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Enter a key name'); return; }
    setLoading(true);
    try {
      await onCreate({ name: name.trim(), scopes: mode === 'read' ? selectedScopes.filter(s => s.startsWith('read:')) : selectedScopes });
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ background: 'var(--f-surface-sunken)', border: '1px solid var(--f-line)' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--f-text)' }}>Create API Key</h3>
          <button onClick={onClose} style={{ color: 'var(--f-text-3)' }}><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Key Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Integration"
              className="w-full bg-[var(--f-surface)] border rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ borderColor: 'var(--f-line)', color: 'var(--f-text)' }} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Access Mode</label>
            <div className="flex gap-2">
              {['read', 'read-write'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                  style={mode === m ? { background: 'var(--f-tint-color)', color: '#fff', borderColor: 'var(--f-tint-color)' } : { background: 'white', color: 'var(--f-text-3)', borderColor: 'var(--f-line)' }}>
                  {m === 'read' ? '🔍 Read-only' : '✏️ Read + Write'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Scopes</label>
            <div className="grid grid-cols-2 gap-2">
              {KEY_SCOPES.filter(s => mode === 'read' ? s.id.startsWith('read:') : true).map(scope => (
                <label key={scope.id} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors"
                  style={selectedScopes.includes(scope.id) ? { background: 'var(--f-surface-sunken)', borderColor: 'var(--f-line-strong)' } : { background: 'white', borderColor: 'var(--f-line)' }}>
                  <input type="checkbox" className="accent-[var(--f-tint-color)]" checked={selectedScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} />
                  <span className="text-xs font-medium" style={{ color: 'var(--f-text)' }}>{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'var(--f-tint-color)' }}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Generate Key
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateWebhookModal({ onClose, onCreate }) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState(['order.created']);
  const [loading, setLoading] = useState(false);
  const toggleEvent = (e) => setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const handleCreate = async () => {
    if (!url.trim() || !url.startsWith('https://')) { toast.error('Enter a valid HTTPS URL'); return; }
    if (events.length === 0) { toast.error('Select at least one event'); return; }
    setLoading(true);
    try {
      await onCreate({ url: url.trim(), events });
      onClose();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ background: 'var(--f-surface-sunken)', border: '1px solid var(--f-line)' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--f-text)' }}>Add Webhook</h3>
          <button onClick={onClose} style={{ color: 'var(--f-text-3)' }}><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Endpoint URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourapp.com/webhooks/azaman"
              className="w-full bg-[var(--f-surface)] border rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ borderColor: 'var(--f-line)', color: 'var(--f-text)' }} />
          </div>
          <div className="rounded-xl p-3 border flex items-start gap-2" style={{ background: 'var(--f-info-bg)', borderColor: 'var(--f-info)' }}>
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--f-info)' }} />
            <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>A signing secret will be auto-generated. Use this to verify webhook signatures in your server</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--f-text-3)' }}>Events</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all"
                  style={events.includes(ev.id) ? { background: 'var(--f-surface-sunken)', borderColor: 'var(--f-line-strong)' } : { background: 'white', borderColor: 'var(--f-line)' }}>
                  <input type="checkbox" className="mt-0.5 accent-[var(--f-tint-color)]" checked={events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--f-text)' }}>{ev.label}</div>
                    <div className="text-xs" style={{ color: 'var(--f-text-3)' }}>{ev.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'var(--f-tint-color)' }}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
            Create Webhook
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Developer() {
  const { hasPermission } = usePermission();
  const qc = useQueryClient();
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [newKey, setNewKey] = useState(null);

  // ── Mock local state (replace with real API when backend endpoint exists) ──
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Accounting Integration', scopes: ['read:orders', 'read:finance'], createdAt: '2026-06-01T10:00:00Z', lastUsed: '2026-07-16T08:30:00Z', keyPreview: 'azk_live_abc…xyz' },
  ]);
  const [webhooks, setWebhooks] = useState([
    { id: '1', url: 'https://example.com/webhooks', events: ['order.created', 'invoice.paid'], status: 'active', lastDelivery: '2026-07-17T02:10:00Z', successCount: 42, failCount: 1 },
  ]);

  const handleCreateKey = async (data) => {
    const key = 'azk_live_' + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join('');
    const newEntry = { id: crypto.randomUUID(), name: data.name, scopes: data.scopes, createdAt: new Date().toISOString(), lastUsed: null, keyPreview: key.slice(0, 16) + '…' + key.slice(-4), _fullKey: key };
    setApiKeys(prev => [...prev, newEntry]);
    setNewKey(key);
    toast.success('API key created — copy it now, it won\'t be shown again');
  };

  const handleCreateWebhook = async (data) => {
    setWebhooks(prev => [...prev, { id: crypto.randomUUID(), url: data.url, events: data.events, status: 'active', lastDelivery: null, successCount: 0, failCount: 0, _secret: data.secret }]);
    toast.success('Webhook registered');
  };

  const deleteKey = (id) => { setApiKeys(prev => prev.filter(k => k.id !== id)); toast.success('API key revoked'); };
  const deleteWebhook = (id) => { setWebhooks(prev => prev.filter(w => w.id !== id)); toast.success('Webhook deleted'); };

  const rel = (dt) => dt ? new Date(dt).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }) : 'Never';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>Developer</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>API keys and webhooks for your integrations</p>
      </div>

      {/* New key reveal banner */}
      <AnimatePresence>
        {newKey && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-4 border" style={{ background: 'var(--f-ok-bg)', borderColor: 'var(--f-ok)' }}>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--f-ok)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--f-ok)' }}>Copy your new API key — it won't be shown again</p>
                <div className="mt-2 flex items-center gap-2 bg-[var(--f-surface)] rounded-lg px-3 py-2 border" style={{ borderColor: 'var(--f-ok)' }}>
                  <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--f-text)' }}>{newKey}</code>
                  <CopyButton text={newKey} />
                </div>
              </div>
              <button onClick={() => setNewKey(null)} style={{ color: 'var(--f-text-3)' }}><XCircle className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Keys */}
      <section className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
            <h2 className="font-bold" style={{ color: 'var(--f-text)' }}>API Keys</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }}>{apiKeys.length}</span>
          </div>
          <button onClick={() => setShowCreateKey(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--f-tint-color)' }}>
            <Plus className="w-4 h-4" /> New Key
          </button>
        </div>
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--f-text-3)' }}>
            <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No API keys yet. Create one to start integrating.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--f-line)' }}>
            {apiKeys.map(key => (
              <div key={key.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--f-surface-sunken)' }}>
                  <Key className="w-4 h-4" style={{ color: 'var(--f-tint-color)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--f-text)' }}>{key.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: 'var(--f-bg)', color: 'var(--f-text-3)', border: '1px solid var(--f-line)' }}>{key.keyPreview}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--f-text-3)' }}>
                    <span>Created {rel(key.createdAt)}</span>
                    <span>Last used: {rel(key.lastUsed)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {key.scopes.map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded-md font-mono" style={{ background: 'var(--f-info)', color: '#fff', opacity: 0.8 }}>{s}</span>
                    ))}
                  </div>
                </div>
                <CopyButton text={key._fullKey || key.keyPreview} />
                <button onClick={() => deleteKey(key.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: 'var(--f-bad)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
            <h2 className="font-bold" style={{ color: 'var(--f-text)' }}>Webhooks</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }}>{webhooks.length}</span>
          </div>
          <button onClick={() => setShowCreateWebhook(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--f-tint-color)' }}>
            <Plus className="w-4 h-4" /> Add Webhook
          </button>
        </div>
        {webhooks.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--f-text-3)' }}>
            <Webhook className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No webhooks yet. Add one to receive real-time events.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--f-line)' }}>
            {webhooks.map(wh => {
              const deliveries = wh.deliveries || [];
              const successCount = deliveries.filter(d => d.status === 'DELIVERED').length;
              const failCount = deliveries.filter(d => d.status === 'FAILED').length;
              const lastDelivery = deliveries[0]?.createdAt;
              const isActive = wh.isActive !== false;
              return (
              <div key={wh.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isActive ? 'var(--f-ok-bg)' : 'var(--f-bad-bg)' }}>
                    <Globe className="w-4 h-4" style={{ color: isActive ? 'var(--f-ok)' : 'var(--f-bad)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a href={wh.url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-sm font-semibold truncate flex items-center gap-1 hover:underline" style={{ color: 'var(--f-text)' }}>
                        {wh.url}<ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={isActive ? { background: 'var(--f-ok-bg)', color: 'var(--f-ok)' } : { background: 'var(--f-bad-bg)', color: 'var(--f-bad)' }}>
                        {isActive ? 'active' : 'paused'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs mb-2" style={{ color: 'var(--f-text-3)' }}>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{successCount} delivered</span>
                      {failCount > 0 && <span className="flex items-center gap-1"><XCircle className="w-3 h-3" style={{ color: 'var(--f-bad)' }} />{failCount} failed</span>}
                      <span>Last: {lastDelivery ? new Date(lastDelivery).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {wh.events.map(ev => (
                        <span key={ev} className="text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: 'var(--f-bg)', border: '1px solid var(--f-line)', color: 'var(--f-text-2)' }}>{ev}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => testWhMutation.mutate(wh.id)} disabled={testWhMutation.isPending}
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all flex items-center gap-1"
                        style={{ borderColor: 'var(--f-line)', color: 'var(--f-text-2)' }}>
                        <Zap className="w-3 h-3" /> Send Test
                      </button>
                      <button onClick={() => rotateSecretMutation.mutate(wh.id)} disabled={rotateSecretMutation.isPending}
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all flex items-center gap-1"
                        style={{ borderColor: 'var(--f-line)', color: 'var(--f-text-2)' }}>
                        <RefreshCw className="w-3 h-3" /> Rotate Secret
                      </button>
                    </div>
                  </div>
                  <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-50 mt-0.5 flex-shrink-0" style={{ color: 'var(--f-bad)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Docs note */}
      <div className="rounded-xl p-4 border flex items-start gap-3" style={{ background: 'var(--f-info)', color: '#fff', borderColor: 'transparent', opacity: 0.85 }}>
        <Code2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold mb-0.5">API Documentation</p>
          <p className="opacity-80">Full REST API reference, SDK samples, and webhook signature verification guides are in the Azaman developer docs.</p>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateKey && <CreateKeyModal onClose={() => setShowCreateKey(false)} onCreate={handleCreateKey} />}
        {showCreateWebhook && <CreateWebhookModal onClose={() => setShowCreateWebhook(false)} onCreate={handleCreateWebhook} />}
      </AnimatePresence>
    </div>
  );
}
