import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const apiState = { order: null, markDelivered: vi.fn() };

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'ord_test' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('@/lib/api', () => ({
  orders: {
    get: vi.fn(async () => apiState.order),
    markDelivered: vi.fn((...args) => apiState.markDelivered(...args)),
  },
  escrow: { getForTicket: vi.fn().mockResolvedValue(null) },
}));

vi.mock('@/lib/marketplaceApi', () => ({
  bookingOpsApi: { refundOrder: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/lib/toast', () => ({ toast: { go: vi.fn(), stop: vi.fn() } }));

// Minimal honest instrument mocks: passthrough buttons/textarea with testids
// so the contract under test (affordances + double-submit guards) is asserted.
vi.mock('@/components/instrument', async () => {
  const React = await import('react');
  return {
    Card: ({ children }) => React.createElement('div', null, children),
    Tag: ({ children }) => React.createElement('span', null, children),
    Button: ({ children, onClick, disabled }) =>
      React.createElement('button', { onClick, disabled: !!disabled, 'data-testid': 'btn' }, children),
    Skel: () => React.createElement('div'),
    Textarea: ({ value, onChange, disabled, placeholder }) =>
      React.createElement('textarea', {
        value, onChange, disabled: !!disabled, placeholder,
        'data-testid': 'notes-textarea',
      }),
    Dialog: ({ children }) => React.createElement('div', null, children),
    Empty: () => React.createElement('div'),
  };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import OrderDetail from '@/pages/OrderDetail';
import { AuthContext } from '@/lib/AuthContext';

const baseOrder = {
  id: 'ord_test',
  orderRef: 'ORD-1',
  title: 'Test order',
  amount: 12.5,
  status: 'PAID',
  created_date: '2026-10-01T00:00:00.000Z',
  updated_date: '2026-10-01T00:00:00.000Z',
  deliveryNotes: 'original note',
  customer: { name: 'Ama', azamanId: 'AZM-1' },
  product: { title: 'Product X' },
  escrowStatus: 'PAID',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    createElement(QueryClientProvider, { client },
      createElement(AuthContext.Provider, { value: { isAdminView: false, bizProfile: { id: 'biz-1' } } },
        createElement(OrderDetail))),
  );
}

beforeEach(() => {
  apiState.markDelivered = vi.fn();
});

describe('OrderDetail — delivered/notes contract (backend: PATCH /orders/:id/delivered)', () => {
  it('PAID order: notes are editable and the save action is honestly labeled as the delivered transition', async () => {
    apiState.order = { ...baseOrder };
    renderPage();

    await waitFor(() => expect(screen.getByText('Product X')).toBeTruthy());

    // Editing is offered, and the save action names the real transition.
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByPlaceholderText('Enter courier, tracking link, dispatch timestamps, etc.').disabled).toBe(false);
    expect(screen.getByText('Save & Mark Delivered')).toBeTruthy();
    expect(screen.queryByText('Save')).toBeNull(); // no disguised save-only path
  });

  it('PAID order: saving notes calls markDelivered exactly once — repeated clicks cannot double-submit', async () => {
    let resolveMutation;
    apiState.markDelivered.mockImplementation(
      () => new Promise((resolve) => { resolveMutation = resolve; }),
    );
    apiState.order = { ...baseOrder };
    renderPage();

    await waitFor(() => expect(screen.getByText('Product X')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByPlaceholderText('Enter courier, tracking link, dispatch timestamps, etc.'), { target: { value: 'courier 1' } });

    const saveBtn = screen.getByText('Save & Mark Delivered').closest('button');
    fireEvent.click(saveBtn);
    // While the request is in flight the button is disabled — that disabled
    // DOM affordance is what blocks a second click in the browser. (jsdom
    // dispatches events even on disabled nodes, so firing another click here
    // would test jsdom, not the guard.)
    await waitFor(() => expect(saveBtn.disabled).toBe(true));
    expect(apiState.markDelivered).toHaveBeenCalledTimes(1);

    await act(async () => { resolveMutation({ success: true }); });
    await waitFor(() => expect(apiState.markDelivered).toHaveBeenCalledWith('ord_test', 'courier 1'));
  });

  it('DELIVERED order: notes are read-only — no edit affordance, no transition possible from the notes panel', async () => {
    apiState.order = { ...baseOrder, status: 'DELIVERED', deliveredAt: '2026-10-02T00:00:00.000Z' };
    renderPage();

    await waitFor(() => expect(screen.getByText('Product X')).toBeTruthy());

    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Save & Mark Delivered')).toBeNull();
    expect(screen.getByPlaceholderText('Enter courier, tracking link, dispatch timestamps, etc.').disabled).toBe(true);
    expect(screen.getByText(/recorded when the order is marked delivered/i)).toBeTruthy();
  });
});
