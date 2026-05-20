jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: key => key }),
}));

const mockSetWishlistVersion = jest.fn();
jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({ setWishlistVersion: mockSetWishlistVersion }),
}));

jest.mock('../../services/api', () => ({
  steamService: {
    getUserWishlist: jest.fn(),
    fetchStatus: jest.fn(),
  },
}));

jest.mock('../../services/followStateLocalStore', () => ({
  readPendingFollowMutations: jest.fn().mockResolvedValue([]),
  applyPendingFollowOverlayToWishlist: jest.fn(items => items),
}));

jest.mock('../useAsyncStorage', () => ({
  buildStorageKey: jest.fn((prefix, id) => (id ? `${prefix}:${id}` : null)),
  getJSONItem: jest.fn().mockResolvedValue(null),
  setJSONItem: jest.fn().mockResolvedValue(),
}));

const { renderHook, act, waitFor } = require('@testing-library/react-native');
const { useWishlist } = require('../useWishlist');
const { steamService } = require('../../services/api');

describe('hooks/useWishlist', () => {
  beforeEach(() => {
    steamService.getUserWishlist.mockReset();
    steamService.fetchStatus.mockReset();
    steamService.getUserWishlist.mockResolvedValue({ data: [] });
    steamService.fetchStatus.mockResolvedValue({
      data: { wishlistVersion: 'v1' },
    });
  });

  it('declenche un refresh wishlist au montage (sans visiter l ecran Wishlist)', async () => {
    jest.useFakeTimers();
    renderHook(() => useWishlist('76561198000000000'));

    // maybeRefreshWishlist debounce son status-check (~250ms).
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    await waitFor(() => {
      expect(steamService.fetchStatus).toHaveBeenCalled();
    });
  });

  it('ne declenche aucun fetch si steamId absent', async () => {
    jest.useFakeTimers();
    renderHook(() => useWishlist(null));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    expect(steamService.fetchStatus).not.toHaveBeenCalled();
  });
});
