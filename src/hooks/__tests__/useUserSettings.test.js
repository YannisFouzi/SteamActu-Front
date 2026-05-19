const contextValue = {
  settingsLoading: false,
  settingsSaving: false,
  newsNotifications: true,
  libraryFollowMode: 'auto',
  wishlistFollowMode: 'off',
  confirmUnfollowGames: true,
  handleToggleNews: jest.fn(),
  handleLibraryModeChange: jest.fn(),
  handleWishlistModeChange: jest.fn(),
  handleConfirmUnfollowGamesChange: jest.fn(),
};

jest.doMock('../../context/AppContext', () => ({
  useAppContext: () => contextValue,
}));

const { renderHook } = require('@testing-library/react-native');
const { useUserSettings } = require('../useUserSettings');

describe('hooks/useUserSettings', () => {
  it('expose les champs du context renommés (loading, saving, ...)', () => {
    const { result } = renderHook(() => useUserSettings());

    expect(result.current).toMatchObject({
      loading: false,
      saving: false,
      newsNotifications: true,
      libraryFollowMode: 'auto',
      wishlistFollowMode: 'off',
      confirmUnfollowGames: true,
    });
    expect(typeof result.current.handleToggleNews).toBe('function');
    expect(typeof result.current.handleLibraryModeChange).toBe('function');
  });

  it('mémoïse — même référence sur 2 renders sans changement', () => {
    const { result, rerender } = renderHook(() => useUserSettings());
    const ref1 = result.current;
    rerender();
    expect(result.current).toBe(ref1);
  });
});
