import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {userService} from '../services/api';
import {debugError, debugLog} from './hooksLogger';
import {buildStorageKey, getJSONItem, setJSONItem} from './useAsyncStorage';

const normalizeFollowedIds = followedAppIds =>
  Array.isArray(followedAppIds)
    ? followedAppIds
        .map(appId => (appId ? appId.toString() : ''))
        .filter(Boolean)
    : [];

const reconcileFollowedGames = (games, followedAppIds) => {
  const followedSet = new Set(normalizeFollowedIds(followedAppIds));

  if (followedSet.size === 0) {
    return [];
  }

  if (!Array.isArray(games)) {
    return [];
  }

  return games.filter(game => followedSet.has(game?.appId?.toString()));
};

export const useFollowedGames = ({
  steamId,
  followedAppIds = [],
  registerSyncHandler,
}) => {
  const [followedGames, setFollowedGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const followedGamesHydratedFromCacheRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  const normalizedFollowedIds = useMemo(
    () => normalizeFollowedIds(followedAppIds),
    [followedAppIds],
  );
  const followedSignature = useMemo(
    () => normalizedFollowedIds.slice().sort().join('|'),
    [normalizedFollowedIds],
  );

  const persistFollowedGamesCache = useCallback(
    async (games, targetSteamId = steamId) => {
      const cacheKey = buildStorageKey('followedGames', targetSteamId);
      if (!cacheKey) {
        return;
      }

      await setJSONItem(cacheKey, games);
      debugLog('[FOLLOWED_GAMES] Cache sauvegarde', {count: games.length});
    },
    [steamId],
  );

  const safeSetValue = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  const safeUpdateFollowedGames = useCallback(updater => {
    if (!isMountedRef.current) {
      return;
    }

    setFollowedGames(currentGames => updater(currentGames));
  }, []);

  const fetchFollowedGames = useCallback(
    async (options = {}) => {
      const {silent = false} = options;

      if (!steamId) {
        safeSetValue(setFollowedGames, []);
        safeSetValue(setLoading, false);
        safeSetValue(setRefreshing, false);
        return [];
      }

      if (fetchInFlightRef.current) {
        debugLog('[FOLLOWED_GAMES] Fetch deja en cours, skip');
        return [];
      }

      try {
        fetchInFlightRef.current = true;

        if (silent) {
          safeSetValue(setRefreshing, true);
        } else {
          safeSetValue(setLoading, true);
        }

        const response = await userService.getFollowedGamesDetails(steamId);
        const remoteGames = Array.isArray(response?.data?.followedGames)
          ? response.data.followedGames
          : [];

        safeSetValue(setFollowedGames, remoteGames);
        safeSetValue(setError, null);
        followedGamesHydratedFromCacheRef.current = true;
        await persistFollowedGamesCache(remoteGames, steamId);

        debugLog('[FOLLOWED_GAMES] Jeux suivis charges', {
          count: remoteGames.length,
        });

        return remoteGames;
      } catch (err) {
        debugError('[FOLLOWED_GAMES] Erreur recuperation:', err);
        safeSetValue(setError, err);
        return [];
      } finally {
        fetchInFlightRef.current = false;
        safeSetValue(setLoading, false);
        safeSetValue(setRefreshing, false);
      }
    },
    [persistFollowedGamesCache, safeSetValue, steamId],
  );

  const removeFollowedGame = useCallback(
    async appId => {
      if (!appId) {
        return;
      }

      const appIdString = appId.toString();

      let nextGames = [];
      safeUpdateFollowedGames(currentGames => {
        nextGames = (currentGames || []).filter(
          game => game?.appId?.toString() !== appIdString,
        );
        return nextGames;
      });

      await persistFollowedGamesCache(nextGames, steamId);
      debugLog('[FOLLOWED_GAMES] Jeu retire du cache', {appId: appIdString});
    },
    [persistFollowedGamesCache, safeUpdateFollowedGames, steamId],
  );

  const handleRefresh = useCallback(async () => {
    await fetchFollowedGames({silent: true});
  }, [fetchFollowedGames]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!steamId) {
      followedGamesHydratedFromCacheRef.current = false;
      fetchInFlightRef.current = false;
      safeSetValue(setFollowedGames, []);
      safeSetValue(setError, null);
      safeSetValue(setLoading, false);
      safeSetValue(setRefreshing, false);
      return;
    }

    let isActive = true;
    followedGamesHydratedFromCacheRef.current = false;

    const hydrateFromCache = async () => {
      const cacheKey = buildStorageKey('followedGames', steamId);
      if (!cacheKey) {
        return;
      }

      try {
        const cachedGames = await getJSONItem(cacheKey, null);
        if (!isActive || !isMountedRef.current) {
          return;
        }

        if (Array.isArray(cachedGames)) {
          const reconciledGames = reconcileFollowedGames(
            cachedGames,
            normalizedFollowedIds,
          );
          followedGamesHydratedFromCacheRef.current = true;
          safeSetValue(setFollowedGames, reconciledGames);
          debugLog('[FOLLOWED_GAMES] Hydrate depuis le cache', {
            count: reconciledGames.length,
          });
        }
      } catch (err) {
        debugError('[FOLLOWED_GAMES] Erreur hydratation cache:', err);
      }
    };

    hydrateFromCache();

    return () => {
      isActive = false;
    };
  }, [normalizedFollowedIds, safeSetValue, steamId]);

  useEffect(() => {
    if (!steamId) {
      return;
    }

    if (normalizedFollowedIds.length === 0) {
      safeSetValue(setFollowedGames, []);
      persistFollowedGamesCache([], steamId).catch(err => {
        debugError('[FOLLOWED_GAMES] Erreur purge cache:', err);
      });
      return;
    }

    safeUpdateFollowedGames(currentGames =>
      reconcileFollowedGames(currentGames, normalizedFollowedIds),
    );

    fetchFollowedGames({
      silent: followedGamesHydratedFromCacheRef.current,
    }).catch(fetchError => {
      debugError('[FOLLOWED_GAMES] Refresh initial échoué:', fetchError);
    });
  }, [
    fetchFollowedGames,
    followedSignature,
    normalizedFollowedIds,
    persistFollowedGamesCache,
    safeSetValue,
    safeUpdateFollowedGames,
    steamId,
  ]);

  useEffect(() => {
    if (typeof registerSyncHandler !== 'function') {
      return undefined;
    }

    return registerSyncHandler('followed', () => {
      if (!steamId) {
        return;
      }

      fetchFollowedGames({silent: true}).catch(fetchError => {
        debugError(
          '[FOLLOWED_GAMES] Sync handler refresh échoué:',
          fetchError,
        );
      });
    });
  }, [fetchFollowedGames, registerSyncHandler, steamId]);

  return {
    followedGames,
    loading,
    refreshing,
    error,
    fetchFollowedGames,
    handleRefresh,
    removeFollowedGame,
  };
};
