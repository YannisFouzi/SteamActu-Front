const steamServiceMock = {
  getUserGames: jest.fn(),
};
const userServiceMock = {
  getUser: jest.fn(),
};

jest.doMock('../../../services/api', () => ({
  steamService: steamServiceMock,
  userService: userServiceMock,
}));

const {
  GamesFetchError,
  STATUS_DEBOUNCE_DELAY,
  getGamesCacheKey,
  getGamesVersionKey,
  getWishlistCacheKey,
  getWishlistVersionKey,
  getUserScopedStorageKeys,
  extractGamesFromResponse,
  withFallbackTimestamps,
  loadUserProfile,
  loadGamesLibrary,
  shouldReloadData,
} = require('../libraryHelpers');

const STEAM = '76561197960287930';

describe('context/app/libraryHelpers', () => {
  beforeEach(() => {
    steamServiceMock.getUserGames.mockReset();
    userServiceMock.getUser.mockReset();
  });

  describe('GamesFetchError', () => {
    it('wrap une erreur originale avec name=GamesFetchError', () => {
      const original = new Error('original');
      const err = new GamesFetchError(original);
      expect(err.name).toBe('GamesFetchError');
      expect(err.original).toBe(original);
      expect(err.message).toBe('original');
    });

    it('message fallback si pas d\'erreur', () => {
      const err = new GamesFetchError();
      expect(typeof err.message).toBe('string');
      expect(err.message.length).toBeGreaterThan(0);
    });
  });

  describe('STATUS_DEBOUNCE_DELAY', () => {
    it('exporte 250ms', () => {
      expect(STATUS_DEBOUNCE_DELAY).toBe(250);
    });
  });

  describe('storage keys', () => {
    it('getGamesCacheKey → app:games:{steamId}', () => {
      expect(getGamesCacheKey(STEAM)).toBe(`app:games:${STEAM}`);
    });

    it('getGamesVersionKey → app:gamesVersion:{steamId}', () => {
      expect(getGamesVersionKey(STEAM)).toBe(`app:gamesVersion:${STEAM}`);
    });

    it('getWishlistCacheKey, getWishlistVersionKey', () => {
      expect(getWishlistCacheKey(STEAM)).toBe(`app:wishlist:${STEAM}`);
      expect(getWishlistVersionKey(STEAM)).toBe(`app:wishlistVersion:${STEAM}`);
    });
  });

  describe('getUserScopedStorageKeys()', () => {
    it('renvoie 6 clés pour un steamId', () => {
      const keys = getUserScopedStorageKeys(STEAM);
      expect(keys).toHaveLength(6);
      expect(keys.every((k) => k.includes(STEAM))).toBe(true);
    });

    it('[] si pas de steamId', () => {
      expect(getUserScopedStorageKeys(null)).toEqual([]);
      expect(getUserScopedStorageKeys('')).toEqual([]);
    });
  });

  describe('extractGamesFromResponse()', () => {
    it('renvoie data si array direct', () => {
      const games = [{ appid: 730 }];
      expect(extractGamesFromResponse({ data: games })).toBe(games);
    });

    it('renvoie data.games si présent', () => {
      const games = [{ appid: 570 }];
      expect(extractGamesFromResponse({ data: { games } })).toBe(games);
    });

    it('[] si rien', () => {
      expect(extractGamesFromResponse(null)).toEqual([]);
      expect(extractGamesFromResponse({})).toEqual([]);
      expect(extractGamesFromResponse({ data: { foo: 'bar' } })).toEqual([]);
    });
  });

  describe('withFallbackTimestamps()', () => {
    it('ajoute lastUpdateTimestamp depuis rtime_last_played', () => {
      const games = [
        { appid: 730, name: 'CSGO', rtime_last_played: 1_700_000_000 },
      ];
      const result = withFallbackTimestamps(games);
      expect(result[0].lastUpdateTimestamp).toBe(1_700_000_000);
    });

    it('garde lastUpdateTimestamp s\'il est déjà présent', () => {
      const game = { appid: 730, lastUpdateTimestamp: 999, rtime_last_played: 1000 };
      expect(withFallbackTimestamps([game])[0].lastUpdateTimestamp).toBe(999);
    });

    it('renvoie le jeu inchangé si pas de fallback dispo', () => {
      const game = { appid: 730, name: 'X' };
      const result = withFallbackTimestamps([game]);
      expect(result[0]).toBe(game);
    });

    it('accepte input vide/null', () => {
      expect(withFallbackTimestamps(null)).toEqual([]);
      expect(withFallbackTimestamps([])).toEqual([]);
    });
  });

  describe('loadUserProfile()', () => {
    it('appelle userService.getUser et renvoie data', async () => {
      userServiceMock.getUser.mockResolvedValue({
        data: { steamId: STEAM, language: 'fr' },
      });
      const user = await loadUserProfile(STEAM);
      expect(user).toEqual({ steamId: STEAM, language: 'fr' });
    });
  });

  describe('loadGamesLibrary()', () => {
    it('appelle steamService.getUserGames et applique fallback timestamps', async () => {
      steamServiceMock.getUserGames.mockResolvedValue({
        data: [{ appid: 730, name: 'CSGO', rtime_last_played: 1_700_000_000 }],
      });

      const games = await loadGamesLibrary(STEAM);
      expect(games).toHaveLength(1);
      expect(games[0].lastUpdateTimestamp).toBe(1_700_000_000);
    });

    it('throw GamesFetchError sur erreur', async () => {
      steamServiceMock.getUserGames.mockRejectedValue(new Error('down'));
      await expect(loadGamesLibrary(STEAM)).rejects.toBeInstanceOf(
        GamesFetchError,
      );
    });
  });

  describe('shouldReloadData()', () => {
    it('true si forceReload', () => {
      expect(shouldReloadData(true, false, 5, true)).toBe(true);
    });

    it('true si isReconnection', () => {
      expect(shouldReloadData(false, true, 5, true)).toBe(true);
    });

    it('true si gamesLength=0 et jamais chargé', () => {
      expect(shouldReloadData(false, false, 0, false)).toBe(true);
    });

    it('false si déjà chargé une fois et games présents', () => {
      expect(shouldReloadData(false, false, 5, true)).toBe(false);
    });

    it('false si gamesLength=0 mais hasLoadedOnce=true', () => {
      expect(shouldReloadData(false, false, 0, true)).toBe(false);
    });
  });
});
