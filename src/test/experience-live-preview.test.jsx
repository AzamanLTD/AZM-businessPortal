import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ExperienceLivePreview from '@/components/ExperienceLivePreview';

const blueprint = {
  preset: 'DINING_JOURNEY',
  navigation: { mode: 'CONTEXTUAL', showProgress: true },
  detail: { presentation: 'DISH_DOSSIER', showGallery: true, showSpecifications: true, showOptions: true, showQuantity: true },
  customerContext: { enabled: true, tableNumber: true, serviceMode: true, passenger: false },
  commit: { style: 'PAPER_RIP', persistentTray: true },
  motion: { tempo: 'BALANCED' },
};

const products = [{
  id: 'dish-1',
  name: 'Jollof + grilled fish',
  priceUsdc: 14,
  imageUrls: ['https://example.com/jollof.jpg'],
  preparationMins: 18,
  calorieCount: 620,
  variants: [{ id: 'large', name: 'Large', priceDelta: 2 }],
  modifierGroups: [{ name: 'Sauce', required: false, options: [{ id: 'pepper', name: 'Pepper', priceDelta: 1 }] }],
  isActive: true,
  isAvailable: true,
}];

describe('ExperienceLivePreview', () => {
  it('uses the merchant record rather than synthetic simulator copy', () => {
    render(<ExperienceLivePreview blueprint={blueprint} category="RESTAURANT" products={products} />);

    expect(screen.getByText('Jollof + grilled fish')).toBeInTheDocument();
    expect(screen.queryByText('Peppered chicken')).not.toBeInTheDocument();
    expect(screen.getByText(/1 live records available/)).toBeInTheDocument();
  });

  it('walks the real item through detail and commit while honoring configured controls', () => {
    render(<ExperienceLivePreview blueprint={blueprint} category="RESTAURANT" products={products} />);

    fireEvent.click(screen.getByRole('button', { name: /Jollof \+ grilled fish/i }));
    expect(screen.getByText('Preparation')).toBeInTheDocument();
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Large/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pepper/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));

    expect(screen.getByText('$34.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tear into tray/i }));
    expect(screen.getByText('Added to the tray')).toBeInTheDocument();
  });

  it('removes optional detail controls when the blueprint hides them', () => {
    render(
      <ExperienceLivePreview
        blueprint={{ ...blueprint, detail: { ...blueprint.detail, showGallery: false, showSpecifications: false, showOptions: false, showQuantity: false } }}
        category="RESTAURANT"
        products={products}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Jollof \+ grilled fish/i }));
    expect(screen.queryByText('Preparation')).not.toBeInTheDocument();
    expect(screen.queryByText('Options')).not.toBeInTheDocument();
    expect(screen.queryByText('Quantity')).not.toBeInTheDocument();
  });

  it('uses authoritative room records for building previews', () => {
    render(
      <ExperienceLivePreview
        blueprint={{ ...blueprint, preset: 'BUILDING_WALK' }}
        category="HOTEL"
        rooms={[{ id: 'room-7', roomNumber: '407', floor: 4, roomType: 'Executive', status: 'AVAILABLE' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Room 407/i }));
    expect(screen.getByText('Floor')).toBeInTheDocument();
    expect(screen.getByText('Executive')).toBeInTheDocument();
  });
});
