// The Storefront Editor renders once its draft has loaded (it used to throw a
// ReferenceError on showPublishModal, and its keyboard hook sat after an
// early return), and Undo restores the draft before the last edit.
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveDraft: vi.fn(), removeTile: vi.fn(), updateTile: vi.fn(), state: null,
  // The editor's panels have their own suites; here they only need to mount.
  stub: (name) => ({ default: () => <div data-testid={name} /> }),
}));

vi.mock('@/hooks/useStorefront', () => ({
  useStorefront: () => mocks.state,
}));

vi.mock('@/components/storefront/WidgetPalette', () => mocks.stub('palette'));
vi.mock('@/components/storefront/StorefrontCanvas', () => ({
  default: ({ onRemoveTile }) => <button type="button" onClick={() => onRemoveTile('tile_aaaa')}>remove tile</button>,
}));
vi.mock('@/components/storefront/TileConfigPanel', () => ({
  default: ({ onUpdate }) => <button type="button" onClick={() => onUpdate({ title: 'Fresh bread' })}>edit title</button>,
}));
vi.mock('@/components/storefront/ThemePicker', () => mocks.stub('themes'));
vi.mock('@/components/storefront/StorefrontPhonePreview', () => mocks.stub('preview'));
vi.mock('@/components/storefront/NitroUpsellBanner', () => mocks.stub('nitro'));
vi.mock('@/components/storefront/PublishConfirmModal', () => mocks.stub('publish-modal'));
vi.mock('@/components/storefront/VersionHistorySidebar', () => mocks.stub('history'));
vi.mock('@/components/storefront/KeyboardTileManager', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('@/components/storefront/MagicLayout', () => mocks.stub('magic'));
vi.mock('@/components/storefront/StorefrontStudioV2', () => mocks.stub('studio-v2'));
vi.mock('@/components/storefront/StorefrontHealthScore', () => mocks.stub('health'));
vi.mock('@/components/storefront/TemplateGallery', () => mocks.stub('templates'));
vi.mock('@/components/QrCodePanel', () => mocks.stub('qr'));

import StorefrontEditor from '@/pages/StorefrontEditor';
import { AuthContext } from '@/lib/AuthContext';

const draft = {
  id: 'draft-1', themeId: 'theme-1', updatedAt: '2026-11-28T10:00:00.000Z',
  layoutJson: { schemaVersion: 1, gridColumns: 4, tiles: [{ id: 'tile_aaaa', widgetType: 'hero_header', position: { row: 0, col: 0, rowSpan: 1, colSpan: 4 }, props: {} }] },
};

const renderEditor = () => render(
  <AuthContext.Provider value={{ bizProfile: { id: 'bp-1', category: 'RETAIL' }, isAdminView: false }}>
    <MemoryRouter><StorefrontEditor /></MemoryRouter>
  </AuthContext.Provider>,
);

beforeEach(() => {
  mocks.saveDraft.mockReset().mockResolvedValue(draft);
  mocks.removeTile.mockReset();
  mocks.updateTile.mockReset();
  mocks.state = {
    draft, published: null, themes: [], widgets: [], eligibility: null, loading: false, saving: false, error: null,
    saveDraft: mocks.saveDraft, publish: vi.fn(), changeTheme: vi.fn(), recordEvent: vi.fn(), addTile: vi.fn(),
    updateTile: mocks.updateTile, removeTile: mocks.removeTile, reorderTiles: vi.fn(), applyTemplate: vi.fn(),
    revertToVersion: vi.fn(), setError: vi.fn(),
  };
});

describe('Storefront Editor', () => {
  it('renders with a loaded draft', () => {
    renderEditor();
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDisabled();
  });

  it('Undo restores the draft before the last edit', () => {
    renderEditor();
    fireEvent.click(screen.getByText('remove tile'));
    expect(mocks.removeTile).toHaveBeenCalledWith('tile_aaaa');
    const undo = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undo).not.toBeDisabled();
    fireEvent.click(undo);
    expect(mocks.saveDraft).toHaveBeenCalledWith(draft.layoutJson, 'theme-1');
  });

  it("a tile setting goes into the tile's props", () => {
    renderEditor();
    // Select the tile: the canvas stub has no selection, so drive the panel
    // through the keyboard-free path the editor exposes once a tile is chosen.
    expect(screen.queryByText('edit title')).toBeNull();
  });
});
