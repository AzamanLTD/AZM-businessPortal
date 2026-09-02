import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ExperienceSimulator from './ExperienceSimulator';

const blueprint = (preset, overrides = {}) => ({
  preset,
  navigation: { mode: 'CONTEXTUAL', showProgress: true },
  detail: {
    presentation: preset === 'DINING_JOURNEY' ? 'DISH_DOSSIER' : 'MORPH',
    showGallery: true,
    showSpecifications: true,
    showOptions: true,
    showQuantity: true,
  },
  customerContext: { enabled: true, tableNumber: preset === 'DINING_JOURNEY', serviceMode: false, passenger: preset === 'TRAVEL_JOURNEY' },
  commit: { style: preset === 'DINING_JOURNEY' ? 'PAPER_RIP' : preset === 'SHOP_FLOOR' ? 'LIFT_INTO_TRAY' : 'MATERIAL', persistentTray: preset === 'DINING_JOURNEY' || preset === 'SHOP_FLOOR' },
  motion: { tempo: 'BALANCED' },
  ...overrides,
});

describe('ExperienceSimulator', () => {
  it('renders the restaurant journey and opens a dish detail from the menu', () => {
    render(<ExperienceSimulator category="FOOD_BEVERAGE" blueprint={blueprint('DINING_JOURNEY')} />);
    expect(screen.getByText('Browse the menu like a place, not a list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Peppered chicken' }));
    expect(screen.getByText('peppered chicken')).toBeInTheDocument();
  });

  it('renders retail as a shelf and carries the selected product into the detail stage', () => {
    render(<ExperienceSimulator category="RETAIL" blueprint={blueprint('SHOP_FLOOR')} />);
    expect(screen.getByText('Best sellers')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Everyday carry set/i }));
    expect(screen.getByText('PRODUCT DOSSIER')).toBeInTheDocument();
  });

  it('renders hotel floor traversal and preserves room identity into the dossier', () => {
    render(<ExperienceSimulator category="HOTEL" blueprint={blueprint('BUILDING_WALK')} />);
    expect(screen.getByText('Rooms with availability')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Room 302/i }));
    expect(screen.getByText('Room 302')).toBeInTheDocument();
    expect(screen.getByText('ROOM DOSSIER')).toBeInTheDocument();
  });

  it('renders transit seats with an occupied seat disabled and a selectable journey', () => {
    render(<ExperienceSimulator category="TRANSIT" blueprint={blueprint('TRAVEL_JOURNEY')} />);
    const occupied = screen.getByRole('button', { name: 'Seat B12 occupied' });
    expect(occupied).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Seat A11' }));
    expect(screen.getByText('Seat A11')).toBeInTheDocument();
  });

  it('progresses from detail to the configured commit state', () => {
    render(<ExperienceSimulator category="RETAIL" blueprint={blueprint('SHOP_FLOOR')} />);
    fireEvent.click(screen.getByRole('button', { name: /Everyday carry set/i }));
    expect(screen.getByText('PRODUCT DOSSIER')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lift into bag/i }));
    expect(screen.getByText('Commit complete')).toBeInTheDocument();
  });
});
