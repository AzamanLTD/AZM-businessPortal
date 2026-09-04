import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const fxMock = vi.hoisted(() => ({
  current: {
    isUsable: true,
    ghsPerUsdc: 13.25,
    source: 'KOTANI_PAY',
    remainingSeconds: 420,
  },
}));

vi.mock('@/hooks/useFxRate', () => ({
  useFxRate: () => fxMock.current,
}));

vi.mock('@/components/instrument', () => ({
  AnimatedNumber: ({ value }) => <span>{value.toFixed(2)}</span>,
}));

import { KpiCard } from './KpiCard';

describe('KpiCard dual-currency presentation', () => {
  beforeEach(() => {
    fxMock.current = {
      isUsable: true,
      ghsPerUsdc: 13.25,
      source: 'KOTANI_PAY',
      remainingSeconds: 420,
    };
  });

  it('shows the live GHS equivalent for dollar-denominated financial values', () => {
    render(<KpiCard label="Revenue" value="$100.00" />);

    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText(/GH₵ 1,325\.00/)).toBeInTheDocument();
    expect(screen.getByText(/GHS current equivalent/)).toBeInTheDocument();
    expect(screen.getByTitle(/1 USDC ≈ GH₵ 13\.25/)).toHaveAttribute('title', expect.stringContaining('KOTANI_PAY'));
  });

  it('does not append a GHS equivalent to non-currency KPI values', () => {
    render(<KpiCard label="Completion" value="98%" />);

    expect(screen.getByText('98.00')).toBeInTheDocument();
    expect(screen.queryByText(/GHS current equivalent/)).not.toBeInTheDocument();
  });

  it('reports the GHS equivalent as unavailable without a usable oracle rate', () => {
    fxMock.current = {
      isUsable: false,
      ghsPerUsdc: 0,
      source: 'UNAVAILABLE',
      remainingSeconds: 0,
    };

    render(<KpiCard label="Revenue" value="$100.00" />);

    expect(screen.getByText('GHS equivalent unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/GH₵ 0\.00/)).not.toBeInTheDocument();
  });
});
