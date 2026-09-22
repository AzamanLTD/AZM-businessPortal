/**
 * ErrorBoundary — Production-grade error boundary (Section 11, Phase 2)
 *
 * Two variants:
 *   1. <ErrorBoundary> — full-page boundary at the app root (existing usage)
 *   2. <SectionBoundary label="..."> — lightweight inline boundary for widgets/sections
 *      Shows a small inline card instead of blanking the whole page.
 */
import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

const clearPortalSession = () => {
  // Remove only the Business Portal's known session keys. Never clear the
  // entire origin storage: users may have unrelated preferences/cached state
  // shared by other modules on the same origin.
  localStorage.removeItem('biz_user');
  localStorage.removeItem('admin_selected_biz');
};

// ── Full-page boundary (app root) ─────────────────────────────────────────────

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{ padding: '48px 24px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--f-bg)', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
        >
          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(225,83,97,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle style={{ width: 32, height: 32, color: 'var(--f-bad)' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--f-text)', marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: 'var(--f-text-3)', marginBottom: 28, lineHeight: 1.6 }}>
              The portal hit an unexpected error. Reload the portal first; signing in again resets only the Business Portal session.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.href = '/'; }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--f-tint-color)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                <RefreshCw style={{ width: 16, height: 16 }} /> Reload Portal
              </button>
              <button
                type="button"
                onClick={() => { clearPortalSession(); window.location.href = '/login'; }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'white', color: 'var(--f-bad)', border: '1px solid rgba(225,83,97,0.3)', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                <RotateCcw style={{ width: 16, height: 16 }} /> Sign In Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: 32, textAlign: 'left', background: 'white', border: '1px solid rgba(17,17,17,0.08)', borderRadius: 12, padding: '16px' }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#9A96A3' }}>Dev: Error details</summary>
                <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--f-bad)', marginTop: 12 }}>
                  {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Section-level inline boundary ─────────────────────────────────────────────

export class SectionBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn(`[SectionBoundary: ${this.props.label}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.label || 'This section';
      return (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            background: 'rgba(225,83,97,0.06)', border: '1px solid rgba(225,83,97,0.18)',
            borderRadius: 12, margin: '4px 0',
          }}
        >
          <AlertTriangle style={{ width: 18, height: 18, color: 'var(--f-bad)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--f-bad)', margin: 0 }}>{label} couldn't load</p>
            <p style={{ fontSize: 12, color: '#9A96A3', margin: '2px 0 0' }}>There was an error rendering this content.</p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--f-bad)', background: 'rgba(225,83,97,0.10)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
