import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TypeGuardedRoute } from '@/components/TypeGuardedRoute';

const mockAuth = vi.hoisted(() => ({
  bizProfile: null,
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/lib/businessTypes', async () => {
  const actual = await vi.importActual('@/lib/businessTypes');
  return actual;
});

function renderGuard(types, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route
          path="/protected"
          element={
            <TypeGuardedRoute types={types}>
              <div data-testid="protected">Protected</div>
            </TypeGuardedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('TypeGuardedRoute runtime behavior', () => {
  beforeEach(() => {
    mockAuth.bizProfile = null;
  });

  it('renders the protected route when the business type matches', () => {
    mockAuth.bizProfile = { category: 'TRANSIT' };

    renderGuard(['TRANSIT']);

    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('redirects to the dashboard when the business type is not allowed', () => {
    mockAuth.bizProfile = { category: 'RESTAURANT' };

    renderGuard(['TRANSIT']);

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('accepts any matching type in a multi-type guard', () => {
    mockAuth.bizProfile = { category: 'HOTEL' };

    renderGuard(['HOTEL', 'RESTAURANT']);

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('renders when no type restriction is supplied', () => {
    mockAuth.bizProfile = { category: 'RETAIL' };

    renderGuard([]);

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });
});
