/**
 * Settings → Developer — API Keys & Webhooks (preview surface)
 *
 * MOCK-ONLY BY DESIGN. The backend developer API (GET/POST/DELETE
 * /api/developer/api-keys, /webhooks) currently enforces only
 * authentication — no business scoping — and is pending a backend security
 * fix. Until that fix lands, this page must NOT be wired to those endpoints
 * and must NOT let anything on it look like a live credential operation.
 *
 * Honest-refusal rules enforced here (and locked by
 * src/test/developer-mock-only.test.jsx):
 *   • every action control is disabled and says why
 *   • no secret strings are ever generated or displayed as real
 *   • no success feedback exists for actions that did not happen
 *   • the preview status is stated at the top of the page, unmistakably
 */
import {
  Key, Webhook, Shield, AlertTriangle, Clock, Lock,
} from 'lucide-react';

const PREVIEW_NOTE =
  'Preview only — the developer API is not connected yet. Nothing on this page creates, changes, or revokes real API keys, secrets, or webhooks.';

const KEY_SCOPES = [
  { id: 'read:orders', label: 'Read Orders' },
  { id: 'write:orders', label: 'Write Orders' },
  { id: 'read:products', label: 'Read Products' },
  { id: 'read:finance', label: 'Read Finance' },
];

const WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Order Created' },
  { id: 'order.completed', label: 'Order Completed' },
  { id: 'reservation.confirmed', label: 'Reservation Confirmed' },
  { id: 'invoice.paid', label: 'Invoice Paid' },
];

function PreviewBadge() {
  return (
    <span
      className="text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide"
      style={{ background: 'var(--f-warn-bg, #fef3c7)', color: 'var(--f-warn, #b45309)', border: '1px solid var(--f-warn, #b45309)' }}
      data-testid="preview-badge"
    >
      Preview — not live
    </span>
  );
}

/** A disabled control that explains itself instead of suggesting an available action. */
function UnavailableControl({ icon, label }) {
  return (
    <button
      type="button"
      disabled
      title={PREVIEW_NOTE}
      aria-label={`${label} — unavailable (preview only)`}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-not-allowed opacity-50"
      style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-3)', border: '1px solid var(--f-line)' }}
    >
      <Lock className="w-4 h-4" /> {label}
    </button>
  );
}

function SectionCard({ icon, title, blurb, children }) {
  return (
    <section className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)' }}>
      <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: 'var(--f-line)' }}>
        {icon}
        <h2 className="font-bold" style={{ color: 'var(--f-text)' }}>{title}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-3)' }}>preview</span>
      </div>
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>{blurb}</p>
        {children}
      </div>
    </section>
  );
}

export default function Developer() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header — preview status stated first */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--f-text)' }}>
            Developer <PreviewBadge />
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>
            API keys and webhooks for your integrations (planned surface)
          </p>
        </div>
      </div>

      {/* Unmistakable preview banner */}
      <div
        className="rounded-xl p-4 border flex items-start gap-3"
        style={{ background: 'var(--f-warn-bg, #fef3c7)', borderColor: 'var(--f-warn, #b45309)' }}
        data-testid="preview-banner"
      >
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--f-warn, #b45309)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--f-warn, #b45309)' }}>
            This page is a preview — nothing here is live
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--f-text-3)' }}>
            {PREVIEW_NOTE} A backend security fix is required before the developer API can be
            connected; until then this page performs no operations and stores no credentials.
          </p>
        </div>
      </div>

      {/* API Keys — what the surface will offer, nothing operable */}
      <SectionCard
        icon={<Key className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />}
        title="API Keys"
        blurb="Once connected, scoped API keys will let your integrations call the AZM API with exactly the permissions you grant. Key scopes will look like this:"
      >
        <div className="flex flex-wrap gap-1.5">
          {KEY_SCOPES.map(s => (
            <span key={s.id} className="text-xs px-2 py-1 rounded-md font-mono" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-3)', border: '1px solid var(--f-line)' }}>
              {s.id}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <UnavailableControl icon="key" label="Create API key" />
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--f-text-3)' }}>
            <Clock className="w-3.5 h-3.5" /> Available after the developer API security fix
          </span>
        </div>
      </SectionCard>

      {/* Webhooks — same treatment */}
      <SectionCard
        icon={<Webhook className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />}
        title="Webhooks"
        blurb="Once connected, AZM will POST signed event notifications to your HTTPS endpoints. The initial event set will look like this:"
      >
        <div className="flex flex-wrap gap-1.5">
          {WEBHOOK_EVENTS.map(ev => (
            <span key={ev.id} className="text-xs px-2 py-1 rounded-md font-mono" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-text-3)', border: '1px solid var(--f-line)' }}>
              {ev.id}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <UnavailableControl icon="webhook" label="Add webhook" />
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--f-text-3)' }}>
            <Shield className="w-3.5 h-3.5" /> Signing secrets will be issued by the backend — never on this page
          </span>
        </div>
      </SectionCard>

      <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>
        No real API keys, secrets, or webhooks have been created, changed, or revoked by this page.
      </p>
    </div>
  );
}
