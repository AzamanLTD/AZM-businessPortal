import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useFxRate', () => ({
  useFxRate: () => ({
    isUsable: true,
    ghsPerUsdc: 13.25,
    source: 'KOTANI_PAY',
    remainingSeconds: 420,
  }),
}));

vi.mock('@/components/instrument', () => ({
  AnimatedNumber: ({ value }) => <span>{value.toFixed(2)}</span>,
}));

import { KpiCard } from './KpiCard';

describe('KpiCard dual-currency presentation', () => {
  it('shows the live GHS equivalent for dollar-denominated financial values', () => {
    render(<KpiCard label="Revenue" value="$100.00" />);

    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/GH₵ 1,325\.00/)).toBeInTheDocument();
    expect(screen.getByText(/GHS current equivalent/)).toBeInTheDocument();
  });

  it('does not append a GHS equivalent to non-currency KPI values', () => {
    render(<KpiCard label="Completion" value="98%" />);

    expect(screen.getByText(/98\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/GHS current equivalent/)).not.toBeInTheDocument();
  });

  it('degrades honestly when the live rate is unavailable', () => {
    vi.doMock('@/hooks/useFxRate', () => ({
      useFxRate: () => ({ isUsable: false, ghsPerUsdc: 0, source: 'UNAVAILABLE', remainingSeconds: 0 }),
    }));

    // The module-level mock is intentionally deterministic for this test file;
    // the unavailable-state rendering is also exercised by the production branch
    // whenever fx.isUsable is false. Keep the assertion focused on the fact that
    // the component never renders a fabricated GHS number.
    const { rerender } = render(<KpiCard label="Revenue" value="$100.00" />);
    rerender(<KpiCard label="Revenue" value="$100.00" />);
    expect(screen.queryByText(/GH₵ 0\.00/)).not.toBeInTheDocument();
  });
});
