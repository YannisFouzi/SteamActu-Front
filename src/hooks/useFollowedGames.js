import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { userService } from '../services/api';
import { debugError, debugLog } from './hooksLogger';
import {
  buildStorageKey,
  getJSONItem,
  setJSONItem,
} from './useAsyncStorage';

/**
 * Hook personnalisé pour gérer les jeux suivis
 * Centralise la logique de chargement, le cache et la synchronisation.
 */
export const useFollowedGames = steamId => {
  const [followedGames, setFollowedGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const followedGamesHydratedFromCacheRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const persistFollowedGamesCache = useCallback(
    async (games, targetSteamId = steamId) => {
      const cacheKey = buildStorageKey('followedGames', targetSteamId);
      if (!cacheKey) {
        return;
      }
      await setJSONItem(cacheKey, games);
      debugLog('[FOLLOWED_GAMES] Cache sauvegardé', { count: games.length });
    },
    [steamId],
  );

  const fetchFollowedGames = useCallback(
    async (options = {}) => {
      if (!steamId) {
        safeSetState(setFollowedGames, []);
        safeSetState(setLoading, false);
        return;
      }

      if (fetchInFlightRef.current) {
        debugLog('[FOLLOWED_GAMES] Fetch déjà en cours, skip');
        return;
      }

      try {
        fetchInFlightRef.current = true;

        if (!options.silent) {
          safeSetState(setLoading, true);
        }

        const response = await userService.getFollowedGamesDetails(steamId);
        const games = response.data.followedGames || [];

        safeSetState(setFollowedGames, games);
        safeSetState(setError, null);

        // Persister dans le cache
        await persistFollowedGamesCache(games);

        debugLog('[FOLLOWED_GAMES] Jeux suivis chargés', { count: games.length });
      } catch (err) {
        debugError('[FOLLOWED_GAMES] Erreur récupération:', err);
        safeSetState(setError, err);
        safeSetState(setFollowedGames, []);
      } finally {
        fetchInFlightRef.current = false;
        safeSetState(setLoading, false);
      }
    },
    [steamId, safeSetState, persistFollowedGamesCache],
  );

  // Hydratation depuis le cache au montage
  useEffect(() => {
    const hydrateFromCache = async () => {
      if (!steamId || followedGamesHydratedFromCacheRef.current) {
        return;
      }

      const cacheKey = buildStorageKey('followedGames', steamId);
      if (!cacheKey) {
        return;
      }

      try {
        const cachedGames = await getJSONItem(cacheKey, null);
        if (Array.isArray(cachedGames) && cachedGames.length > 0) {
          followedGamesHydratedFromCacheRef.current = true;
          safeSetState(setFollowedGames, cachedGames);
          debugLog('[FOLLOWED_GAMES] Hydraté depuis le cache', {
            count: cachedGames.length,
          });
        }
      } catch (err) {
        debugError('[FOLLOWED_GAMES] Erreur hydratation cache:', err);
      }
    };

    hydrateFromCache();
  }, [steamId, safeSetState]);

  // Fetch initial après hydratation
  useEffect(() => {
    if (steamId && followedGamesHydratedFromCacheRef.current) {
      // Fetch silencieux en arrière-plan après hydratation du cache
      fetchFollowedGames({ silent: true });
    } else if (steamId) {
      // Pas de cache, fetch normal avec loader
      fetchFollowedGames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamId]);

  const removeFollowedGame = useCallback(
    async appId => {
      if (!appId) {
        return;
      }

      // Mise à jour optimiste
      const updatedGames = followedGames.filter(
        game => game.appId?.toString() !== appId.toString(),
      );
      safeSetState(setFollowedGames, updatedGames);

      // Persister dans le cache
      await persistFollowedGamesCache(updatedGames);

      debugLog('[FOLLOWED_GAMES] Jeu retiré du cache', { appId });
    },
    [followedGames, safeSetState, persistFollowedGamesCache],
  );

  return {
    followedGames,
    loading,
    error,
    fetchFollowedGames,
    removeFollowedGame,
  };
};
