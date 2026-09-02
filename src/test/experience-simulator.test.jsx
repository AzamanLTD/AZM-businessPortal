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
  commit: { style: 'PAPER_RIP' },
  motion: { tempo: 'BALANCED' },
  persistentTray: true,
};

describe('ExperienceSimulator', () => {
  it('starts with category-native dining language', () => {
    render(<ExperienceSimulator blueprint={blueprint} category="FOOD_BEVERAGE" />);

    expect(screen.getByText('A menu that feels like a place')).toBeInTheDocument();
    expect(screen.getByText('Turn through courses and specials')).toBeInTheDocument();
    expect(screen.getByText('Restaurant · contextual guidance')).toBeInTheDocument();
  });

  it('walks the draft through browse, focus, detail and commit stages', () => {
    render(<ExperienceSimulator blueprint={blueprint} category="FOOD_BEVERAGE" />);

    fireEvent.click(screen.getByRole('button', { name: 'Try next step' }));
    expect(screen.getByText('Chef’s peppered chicken')).toBeInTheDocument();
    expect(screen.getByText('Dish dossier')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try next step' }));
    expect(screen.getByText('Focused detail')).toBeInTheDocument();
    expect(screen.getByText('Visible')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try next step' }));
    expect(screen.getByText('Tear the order into the tray')).toBeInTheDocument();
    expect(screen.getByText(/paper rip/i)).toBeInTheDocument();
    expect(screen.getByText(/persistent tray/i)).toBeInTheDocument();
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
          commit: { style: 'LIFT_INTO_TRAY' },
        }}
      />,
    );

    expect(screen.getByText('A store you can move through')).toBeInTheDocument();
    expect(screen.getByText('Move across collections like aisles')).toBeInTheDocument();
    expect(screen.queryByText('A menu that feels like a place')).not.toBeInTheDocument();
  });
});
