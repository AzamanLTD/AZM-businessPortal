import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveExperience: vi.fn(),
  getExperience: vi.fn(),
  listProducts: vi.fn(),
}));

vi.mock('@/services/storefrontApi', () => ({
  storefrontApi: {
    getExperience: mocks.getExperience,
    saveExperience: mocks.saveExperience,
  },
}));

vi.mock('@/lib/api', () => ({
  products: { list: mocks.listProducts },
}));

import ExperienceStudio from '@/pages/ExperienceStudio';

const blueprint = {
  preset: 'DINING_JOURNEY',
  navigation: { mode: 'CONTEXTUAL', showProgress: true },
  detail: {
    presentation: 'DISH_DOSSIER',
    showGallery: true,
    showSpecifications: true,
    showOptions: true,
    showQuantity: true,
  },
  customerContext: { enabled: true, tableNumber: true, serviceMode: true, passenger: false },
  commit: { style: 'PAPER_RIP', persistentTray: true },
  motion: { tempo: 'BALANCED', reducedMotionSafe: true },
};

const response = {
  category: 'FOOD_BEVERAGE',
  blueprint,
  navigationModes: ['CONTEXTUAL', 'FLOOR_TRAVERSE', 'AISLE_TRAVERSE', 'JOURNEY_TIMELINE'],
  detailPresentations: ['MORPH', 'DISH_DOSSIER', 'PRODUCT_DOSSIER', 'ROOM_DOSSIER', 'SEAT_DOSSIER', 'SERVICE_DOSSIER'],
  motionTempos: ['RELAXED', 'BALANCED', 'QUICK'],
  commitStyles: ['MATERIAL', 'PAPER_RIP', 'LIFT_INTO_TRAY'],
};

const renderStudio = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ExperienceStudio />
    </QueryClientProvider>,
  );
};

describe('ExperienceStudio commit controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExperience.mockResolvedValue(response);
    mocks.saveExperience.mockResolvedValue(blueprint);
    mocks.listProducts.mockResolvedValue({ products: [] });
  });

  it('restores the commit metaphor and persistent tray controls for the active preset', async () => {
    renderStudio();
    expect(await screen.findByText('Commit behavior')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paper rip into tray/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Material commit/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Keep a persistent customer tray / bag')).toBeChecked();
  });

  it('changes the commit metaphor without mutating the backend until save', async () => {
    renderStudio();
    const material = await screen.findByRole('button', { name: /Material commit/i });
    fireEvent.click(material);
    expect(mocks.saveExperience).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Save experience/i }));
    await waitFor(() => expect(mocks.saveExperience).toHaveBeenCalledWith(
      expect.objectContaining({ commit: { style: 'MATERIAL', persistentTray: true } }),
    ));
  });

  it('lets the business turn off the persistent tray while keeping the commit metaphor', async () => {
    renderStudio();
    const tray = await screen.findByLabelText('Keep a persistent customer tray / bag');
    fireEvent.click(tray);
    expect(tray).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Save experience/i }));
    await waitFor(() => expect(mocks.saveExperience).toHaveBeenCalledWith(
      expect.objectContaining({ commit: { style: 'PAPER_RIP', persistentTray: false } }),
    ));
  });
});
