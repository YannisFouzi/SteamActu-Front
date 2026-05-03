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
  // True UNIQUEMENT après une réponse réseau (success ou error). Sert au tab
  // à savoir si l'état affiché reflète une réponse serveur ou seulement le
  // cache local (pattern stale-while-revalidate).
  const [hasFetchedFromNetwork, setHasFetchedFromNetwork] = useState(false);

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
        followedGamesHydratedFromCacheRef.current = true;
        await persistFollowedGamesCache(remoteGames, steamId);

        debugLog('[FOLLOWED_GAMES] Jeux suivis charges', {
          count: remoteGames.length,
        });

        return remoteGames;
      } catch (err) {
        debugError('[FOLLOWED_GAMES] Erreur recuperation:', err);
        return [];
      } finally {
        fetchInFlightRef.current = false;
        safeSetValue(setLoading, false);
        safeSetValue(setRefreshing, false);
        safeSetValue(setHasFetchedFromNetwork, true);
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
      safeSetValue(setLoading, false);
      safeSetValue(setRefreshing, false);
      return;
    }

    let isActive = true;

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
      // On ne wipe PAS le cache durable depuis cet effet : il peut fire en
      // état transitoire (user briefly null au cold-boot → followedAppIds=[]).
      // Le cache n'est purgé que par removeFollowedGame ou par un fetch dont
      // la réponse serveur est []. setFollowedGames([]) reste pour clear le
      // local en cas de vrai unfollow du dernier jeu (le tab gère le rendu
      // empty state via gating sur user + hasFetchedFromNetwork).
      safeSetValue(setFollowedGames, []);
      return;
    }

    // Reconcile in-place : retire les jeux qui ne sont plus follow et calcule
    // le nombre d'items connus localement (= ceux dont on a déjà name/image).
    let reconciledCount = 0;
    safeUpdateFollowedGames(currentGames => {
      const reconciled = reconcileFollowedGames(
        currentGames,
        normalizedFollowedIds,
      );
      reconciledCount = reconciled.length;
      return reconciled;
    });

    // Skip le fetch si on a déjà tous les détails en local — typique d'un
    // unfollow via cloche (la signature change mais aucun nouveau jeu à
    // résoudre). Évite un re-fetch silencieux qui flashe le RefreshControl.
    if (
      followedGamesHydratedFromCacheRef.current &&
      reconciledCount === normalizedFollowedIds.length
    ) {
      debugLog('[FOLLOWED_GAMES] Reconcile local suffisant, fetch skip');
      return;
    }

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
    hasFetchedFromNetwork,
    handleRefresh,
    removeFollowedGame,
  };
};
