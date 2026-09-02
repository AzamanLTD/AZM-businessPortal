import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ExperienceSimulator from '@/components/ExperienceSimulator';

const blueprint = {
  preset: 'DINING_JOURNEY',
  navigation: { mode: 'CONTEXTUAL' },
  detail: {
    presentation: 'DISH_DOSSIER',
    showGallery: true,
    showOptions: true,
  },
  customerContext: {
    enabled: true,
    tableNumber: true,
    serviceMode: true,
    passenger: false,
  },
  commit: { style: 'PAPER_RIP', persistentTray: true },
  motion: { tempo: 'BALANCED' },
};

describe('ExperienceSimulator', () => {
  it('starts with category-native dining language', () => {
    render(<ExperienceSimulator blueprint={blueprint} category="FOOD_BEVERAGE" />);

    expect(screen.getByText('Browse the menu like a place, not a list')).toBeInTheDocument();
    expect(screen.getByText('Tonight’s table')).toBeInTheDocument();
    expect(screen.getByText(/Dining journey/)).toBeInTheDocument();
    expect(screen.getByText(/contextual/)).toBeInTheDocument();
  });

  it('walks the draft through browse, focus, detail and commit stages', () => {
    render(<ExperienceSimulator blueprint={blueprint} category="FOOD_BEVERAGE" />);

    fireEvent.click(screen.getByRole('button', { name: /Peppered chicken charred/i }));
    expect(screen.getByText('Peppered chicken')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Preview Dish dossier' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Preview Add to tray' }));
    expect(screen.getByText('Commit complete')).toBeInTheDocument();
    expect(screen.getByText(/paper rip/i)).toBeInTheDocument();
  });

  it('lets an owner jump directly to a journey stage', () => {
    render(<ExperienceSimulator blueprint={blueprint} category="FOOD_BEVERAGE" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Preview Peppered chicken' }));
    expect(screen.getByText('Peppered chicken')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Preview Peppered chicken' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Preview Add to tray' }));
    expect(screen.getByText('Commit complete')).toBeInTheDocument();
  });

  it('uses a retail blueprint without inheriting dining copy', () => {
    render(
      <ExperienceSimulator
        category="RETAIL"
        blueprint={{
          ...blueprint,
          preset: 'SHOP_FLOOR',
          navigation: { mode: 'AISLE_TRAVERSE' },
          detail: { ...blueprint.detail, presentation: 'PRODUCT_DOSSIER' },
          commit: { ...blueprint.commit, style: 'LIFT_INTO_TRAY' },
        }}
      />,
    );

    expect(screen.getByText('Move through collections and pull products forward')).toBeInTheDocument();
    expect(screen.getByText('Best sellers')).toBeInTheDocument();
    expect(screen.queryByText('Browse the menu like a place, not a list')).not.toBeInTheDocument();
  });
});