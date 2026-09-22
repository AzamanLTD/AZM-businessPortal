import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ExperienceContentPreview from './ExperienceContentPreview';

describe('ExperienceContentPreview', () => {
  it('ranks active restaurant products by real order history', () => {
    render(
      <ExperienceContentPreview
        category="FOOD_BEVERAGE"
        products={[
          { id: '1', name: 'Jollof', priceUsdc: 12, totalOrders: 9, isActive: true, isAvailable: true },
          { id: '2', name: 'Grill', priceUsdc: 18, totalOrders: 21, isActive: true, isAvailable: true },
          { id: '3', name: 'Hidden', priceUsdc: 8, totalOrders: 99, isActive: false, isAvailable: true },
        ]}
      />,
    );
    expect(screen.getByText('Your popular dishes')).toBeInTheDocument();
    const grill = screen.getByText('Grill');
    const jollof = screen.getByText('Jollof');
    expect(grill.compareDocumentPosition(jollof) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('shows real hotel floors and room statuses without inventing inventory', () => {
    render(
      <ExperienceContentPreview
        category="HOTEL"
        rooms={[
          { id: 'r2', floor: 2, roomNumber: '202', roomType: 'DELUXE', status: 'AVAILABLE' },
          { id: 'r1', floor: 1, roomNumber: '101', roomType: 'STANDARD', status: 'OCCUPIED' },
        ]}
      />,
    );
    expect(screen.getByText('Live room map preview')).toBeInTheDocument();
    expect(screen.getByText('Floor 1')).toBeInTheDocument();
    expect(screen.getByText('Floor 2')).toBeInTheDocument();
    expect(screen.getByText('1 available')).toBeInTheDocument();
  });

  it('chooses the next scheduled transit journey from real trips', () => {
    render(
      <ExperienceContentPreview
        category="TRANSIT"
        trips={[
          { id: 'late', origin: 'Accra', destination: 'Kumasi', routeName: 'Late', departureAt: '2026-09-04T12:00:00Z', fareUsdc: 30, status: 'SCHEDULED', vehicleType: 'Coach', availableSeats: 12 },
          { id: 'early', origin: 'Tema', destination: 'Cape Coast', routeName: 'Early', departureAt: '2026-09-04T08:00:00Z', fareUsdc: 20, status: 'SCHEDULED', vehicleType: 'Minibus', availableSeats: 4 },
        ]}
      />,
    );
    expect(screen.getByText('Tema → Cape Coast')).toBeInTheDocument();
    expect(screen.getByText('Early')).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });
});
