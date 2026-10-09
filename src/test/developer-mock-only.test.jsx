// src/test/developer-mock-only.test.jsx
// =============================================================================
// Developer screen honest-preview contract (Agent B Finding 2).
//
// The backend developer API (api-keys, webhooks) enforces only
// authentication — a security fix is pending — so the portal page must NOT
// be wired to it and must NOT let anything on it masquerade as a live
// credential operation. These tests lock that in:
//
//   • the preview status is unmistakable (banner + badge)
//   • every action control is disabled
//   • no request is ever issued
//   • no success feedback exists (no toasts)
//   • no fake secret material is generated or displayed
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const requestMock = vi.fn();
const toastGo = vi.fn();
const toastStop = vi.fn();

vi.mock('@/lib/apiCore', () => ({ request: (...a) => requestMock(...a) }));
vi.mock('@/lib/toast', () => ({ toast: { go: toastGo, stop: toastStop } }));
vi.mock('@/lib/api', () => ({
  request: (...a) => requestMock(...a),
  businessOSEmployees: { me: () => requestMock() },
  businessOS: {},
}));
vi.mock('@/lib/socket', () => ({
  disconnectSocket: vi.fn(),
  updateSocketToken: vi.fn(),
  getSocket: () => null,
  on: () => {},
  off: () => {},
  emit: () => {},
}));

import { AuthContext } from '@/lib/AuthContext';
import Developer from '@/pages/settings/Developer';

function renderPage() {
  return render(
    <AuthContext.Provider value={{ user: { id: 'u1' }, bizProfile: { id: 'b1', userId: 'u1' }, isAdmin: false }}>
      <Developer />
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  requestMock.mockReset();
  toastGo.mockReset();
  toastStop.mockReset();
});

describe('Developer page — mock-only honesty contract', () => {
  it('announces its preview status unmistakably at the top', () => {
    renderPage();
    expect(screen.getByTestId('preview-banner')).toBeTruthy();
    expect(screen.getByTestId('preview-badge')).toBeTruthy();
    expect(screen.getByText(/nothing here is live/i)).toBeTruthy();
  });

  it('states that no real credentials or webhooks are created or changed', () => {
    renderPage();
    expect(screen.getByText(/no real api keys, secrets, or webhooks/i)).toBeTruthy();
  });

  it('disables every action control — nothing can suggest an available operation', () => {
    renderPage();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect(b.disabled, `button "${b.textContent}" must be disabled`).toBe(true);
  });

  it('never issues a request to the developer API', () => {
    renderPage();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('shows no success feedback — no toast of any kind fires on render or click', () => {
    const { container } = renderPage();
    const buttons = screen.getAllByRole('button');
    for (const b of buttons) fireEvent.click(b);
    expect(toastGo).not.toHaveBeenCalled();
    expect(toastStop).not.toHaveBeenCalled();
    // No success-styled banner (the old fake "copy your new API key" flow).
    expect(screen.queryByText(/won'?t be shown again/i)).toBeNull();
    expect(screen.queryByText(/api key created/i)).toBeNull();
    expect(screen.queryByText(/webhook registered/i)).toBeNull();
  });

  it('renders no fabricated secret material (azk_live_ strings)', () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/azk_live_/i);
    // And the page never generates any: no crypto random key text anywhere.
    expect(container.textContent).not.toMatch(/[a-f0-9]{32,}/i);
  });
});
