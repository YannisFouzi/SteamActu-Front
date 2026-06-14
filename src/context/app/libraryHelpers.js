import {buildStorageKey} from '../../hooks/useAsyncStorage';
import {debugError, debugLog, showAlert} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {steamService, userService} from '../../services/api';
import {getLastPlayedValue} from '../../utils';
import {getSteamProfileCacheKey} from './sessionHelpers';

export class GamesFetchError extends Error {
  constructor(originalError) {
    super(
      (originalError && originalError.message) ||
        translate('errors.connectionGamesMessage'),
    );
    this.name = 'GamesFetchError';
    this.original = originalError;
  }
}

export const STATUS_DEBOUNCE_DELAY = 250;

export const getGamesCacheKey = steamId => buildStorageKey('games', steamId);
export const getGamesVersionKey = steamId =>
  buildStorageKey('gamesVersion', steamId);
export const getFollowVersionKey = steamId =>
  buildStorageKey('followVersion', steamId);
export const getWishlistCacheKey = steamId =>
  buildStorageKey('wishlist', steamId);
export const getWishlistVersionKey = steamId =>
  buildStorageKey('wishlistVersion', steamId);

export const getUserScopedStorageKeys = steamId => {
  if (!steamId) {
    return [];
  }

  return [
    getGamesCacheKey(steamId),
    getGamesVersionKey(steamId),
    getFollowVersionKey(steamId),
    getWishlistCacheKey(steamId),
    getWishlistVersionKey(steamId),
    getSteamProfileCacheKey(steamId),
  ].filter(Boolean);
};

export const extractGamesFromResponse = response => {
  const data = response?.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.games)) {
    return data.games;
  }
  return [];
};

export const withFallbackTimestamps = games =>
  (games || []).map(game => {
    if (!game?.lastUpdateTimestamp) {
      const fallbackTimestamp = getLastPlayedValue(game);
      if (fallbackTimestamp > 0) {
        return {...game, lastUpdateTimestamp: fallbackTimestamp};
      }
    }
    return game;
  });

export const loadUserProfile = async steamId => {
  const response = await userService.getUser(steamId);
  return response.data;
};

export const loadGamesLibrary = async (steamId, requestConfig = {}) => {
  try {
    const response = await steamService.getUserGames(steamId, requestConfig);
    const games = extractGamesFromResponse(response);
    debugLog(
      '[LOADDATA] Jeux recuperes:',
      Array.isArray(games) ? games.length : 0,
    );
    return withFallbackTimestamps(Array.isArray(games) ? games : []);
  } catch (error) {
    throw new GamesFetchError(error);
  }
};

export const shouldReloadData = (forceReload, isReconnection, gamesLength, hasLoadedOnce = false) =>
  forceReload || isReconnection || (gamesLength === 0 && !hasLoadedOnce);

export const handleDataLoadError = ({error, onRetry, onLogout}) => {
  debugError('[LOADDATA] Erreur', error);

  if (error instanceof GamesFetchError) {
    showAlert(
      translate('errors.connectionTitle'),
      translate('errors.connectionGamesMessage'),
      [
        {text: translate('common.retry'), onPress: onRetry},
        {
          text: translate('auth.logout'),
          style: 'destructive',
          onPress: onLogout,
        },
      ],
    );
    return;
  }

  const status = error?.response?.status;

  if (status === 404) {
    showAlert(
      translate('errors.sessionExpiredTitle'),
      translate('errors.sessionExpiredMessage'),
      [{text: translate('common.ok'), onPress: onLogout}],
    );
    return;
  }

  if (error?.isAxiosError || status) {
    showAlert(
      translate('errors.connectionTitle'),
      translate('errors.connectionDataMessage'),
      [
        {text: translate('common.retry'), onPress: onRetry},
        {
          text: translate('auth.logout'),
          style: 'destructive',
          onPress: onLogout,
        },
      ],
    );
    return;
  }

  showAlert(
    translate('common.error'),
    translate('errors.unexpectedRetryOrLogout'),
    [
      {text: translate('common.retry'), onPress: onRetry},
      {text: translate('auth.logout'), style: 'destructive', onPress: onLogout},
    ],
  );
};
