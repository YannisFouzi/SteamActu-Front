import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {getJSONItem, setJSONItem} from '../../hooks/useAsyncStorage';
import {debugError, debugLog, showInfoMessage} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {steamService} from '../../services/api';
import {
  STATUS_DEBOUNCE_DELAY,
  getGamesCacheKey,
  getGamesVersionKey,
  handleDataLoadError,
  loadGamesLibrary,
  loadUserProfile,
  shouldReloadData,
} from './libraryHelpers';

export const useGamesLibraryController = ({
  steamId,
  setSteamId,
  setUser,
  updateVerificationDate,
  syncRecentActiveGames,
  onLogoutRef,
}) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gamesVersion, setGamesVersion] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  const gamesFetchInFlightRef = useRef(false);
  const gamesLastRequestIdRef = useRef(null);
  const gamesFetchAbortControllerRef = useRef(null);
  const statusDebounceTimeoutRef = useRef(null);
  const gamesHydratedFromCacheRef = useRef(false);
  const skipNextGamesRefreshRef = useRef(false);

  useEffect(() => {
    return () => {
      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
        statusDebounceTimeoutRef.current = null;
      }

      if (gamesFetchAbortControllerRef.current) {
        try {
          gamesFetchAbortControllerRef.current.abort();
        } catch (abortError) {
          debugError('[LOADDATA] Erreur lors de l’abort au nettoyage:', abortError);
        }
        gamesFetchAbortControllerRef.current = null;
      }
    };
  }, []);

  const beginLoadingState = useCallback(forceReload => {
    if (forceReload) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
  }, []);

  const finalizeLoadingState = useCallback(() => {
    setLoading(false);
    setRefreshing(false);
  }, []);

  const persistGamesCache = useCallback(
    async (nextGames, targetSteamId = steamId) => {
      const cacheKey = getGamesCacheKey(targetSteamId);
      if (!cacheKey) {
        return;
      }

      await setJSONItem(cacheKey, nextGames);
    },
    [steamId],
  );

  const persistGamesVersion = useCallback(
    async (newVersion, targetSteamId = steamId, meta = {}) => {
      if (!newVersion) {
        return;
      }

      const versionKey = getGamesVersionKey(targetSteamId);
      if (!versionKey) {
        return;
      }

      const serverTs = Date.parse(newVersion);
      const localTs = gamesVersion ? Date.parse(gamesVersion) : null;

      const shouldUpdate =
        !gamesVersion ||
        Number.isNaN(serverTs) ||
        Number.isNaN(localTs) ||
        serverTs >= localTs;

      if (!shouldUpdate) {
        debugLog('[VERSION] Version locale conservee', {
          raison: meta.reason || 'persistGamesVersion',
          locale: gamesVersion,
          serveur: newVersion,
        });
        return;
      }

      setGamesVersion(newVersion);
      await AsyncStorage.setItem(versionKey, newVersion);
    },
    [gamesVersion, steamId],
  );

  const loadData = useCallback(
    async (forceReload = false, origin = 'unknown', options = {}) => {
      const {expectedGamesVersion} = options;

      debugLog('\n[LOADDATA] Debut loadData...', `origine=${origin}`);
      debugLog('[LOADDATA] forceReload:', forceReload);
      debugLog('[LOADDATA] steamId actuel (state):', steamId || '(vide)');
      debugLog('[LOADDATA] games.length:', games.length);

      const savedSteamId = await AsyncStorage.getItem('steamId');
      debugLog(
        '[LOADDATA] savedSteamId (AsyncStorage):',
        savedSteamId || '(vide)',
      );

      if (!savedSteamId) {
        finalizeLoadingState();
        return;
      }

      const gamesCacheKey = getGamesCacheKey(savedSteamId);
      const gamesVersionKey = getGamesVersionKey(savedSteamId);

      if (!gamesHydratedFromCacheRef.current) {
        const [cachedGames, cachedVersion] = await Promise.all([
          getJSONItem(gamesCacheKey, null),
          AsyncStorage.getItem(gamesVersionKey),
        ]);

        if (Array.isArray(cachedGames) && cachedGames.length > 0) {
          debugLog('[CACHE] cache_hit games', {
            count: cachedGames.length,
          });
          gamesHydratedFromCacheRef.current = true;
          setGames(cachedGames);
          if (cachedVersion) {
            setGamesVersion(cachedVersion);
          }
        } else {
          debugLog('[CACHE] cache_miss games');
        }
      }

      const isReconnection = steamId === '' && savedSteamId !== '';
      if (steamId !== savedSteamId) {
        debugLog('[LOADDATA] steamId different -> setSteamId()');
        setSteamId(savedSteamId);
      }

      const mustReload = shouldReloadData(
        forceReload,
        isReconnection,
        games.length,
        gamesHydratedFromCacheRef.current,
      );
      debugLog('[LOADDATA] shouldReload:', mustReload);

      if (!mustReload && !forceReload) {
        debugLog('[LOADDATA] Skip fetch (pas necessaire)');
        return;
      }

      if (gamesFetchInFlightRef.current) {
        debugLog('[LOADDATA] refresh_skipped_inflight');
        return;
      }

      beginLoadingState(forceReload);

      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      gamesFetchInFlightRef.current = true;
      gamesLastRequestIdRef.current = requestId;

      const abortController = new AbortController();
      gamesFetchAbortControllerRef.current = abortController;
      const requestConfig = {
        signal: abortController.signal,
      };

      try {
        const userData = await loadUserProfile(savedSteamId);
        if (gamesLastRequestIdRef.current !== requestId) {
          debugLog('[LOADDATA] Resultat userData ignore (requete obsolete)');
          return;
        }
        setUser(userData);
        debugLog('[LOADDATA] Utilisateur recupere');

        const normalizedGames = await loadGamesLibrary(
          savedSteamId,
          requestConfig,
        );
        if (gamesLastRequestIdRef.current !== requestId) {
          debugLog('[LOADDATA] Resultat games ignore (requete obsolete)');
          return;
        }

        setGames(normalizedGames);
        gamesHydratedFromCacheRef.current = true;
        syncRecentActiveGames(normalizedGames, savedSteamId);
        debugLog(
          '[LOADDATA] setGames ->',
          Array.isArray(normalizedGames) ? normalizedGames.length : 0,
          'jeux',
        );

        let serverGamesVersion = expectedGamesVersion || null;
        if (!serverGamesVersion) {
          try {
            debugLog('[LOADDATA] status_check_start (origine=loadData)', {
              origin,
              forceReload,
            });
            const statusResponse = await steamService.fetchStatus(
              savedSteamId,
              requestConfig,
            );
            serverGamesVersion = statusResponse?.data?.gamesVersion || null;
            debugLog('[LOADDATA] status_check_ok (origine=loadData)', {
              origin,
              serverGamesVersion,
            });
          } catch (statusError) {
            if (statusError?.name === 'CanceledError') {
              debugLog('[LOADDATA] status_check_cancelled');
            } else {
              debugError('[LOADDATA] status_check_fail', statusError);
            }
          }
        }

        if (serverGamesVersion) {
          await persistGamesVersion(serverGamesVersion, savedSteamId, {
            reason: `loadData:${origin}`,
          });
        }

        await persistGamesCache(normalizedGames, savedSteamId);

        updateVerificationDate();
        setLastRefreshTime(Date.now());
      } catch (error) {
        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
          debugLog('[LOADDATA] Requete annulee', {origin});
        } else {
          const logout = onLogoutRef?.current;
          handleDataLoadError({
            error,
            onRetry: () => loadData(true, 'loadDataRetry'),
            onLogout: () => {
              if (typeof logout === 'function') {
                logout();
              }
            },
          });
        }
      } finally {
        if (gamesLastRequestIdRef.current === requestId) {
          finalizeLoadingState();
          gamesLastRequestIdRef.current = null;
        }
        gamesFetchInFlightRef.current = false;
        if (gamesFetchAbortControllerRef.current === abortController) {
          gamesFetchAbortControllerRef.current = null;
        }
      }
    },
    [
      beginLoadingState,
      finalizeLoadingState,
      games.length,
      onLogoutRef,
      persistGamesCache,
      persistGamesVersion,
      setSteamId,
      setUser,
      steamId,
      syncRecentActiveGames,
      updateVerificationDate,
    ],
  );

  const handleRefresh = useCallback(() => {
    loadData(true, 'handleRefresh');
  }, [loadData]);

  const checkForNewGames = useCallback(async () => {
    try {
      if (!steamId) {
        return;
      }

      debugLog('Verification des nouveaux jeux pour', steamId);
      const gamesResponse = await steamService.getUserGames(steamId);
      const newGames = Array.isArray(gamesResponse.data)
        ? gamesResponse.data
        : gamesResponse.data.games || [];

      if (!Array.isArray(newGames)) {
        debugLog('Format de reponse inattendu:', gamesResponse.data);
        return;
      }

      debugLog(`Jeux recuperes: ${newGames.length} jeux au total`);

      if (newGames.length > games.length) {
        debugLog(`${newGames.length - games.length} nouveaux jeux detectes!`);

        const currentAppIds = new Set(games.map(game => game.appid.toString()));
        const addedGames = newGames.filter(
          game => !currentAppIds.has(game.appid.toString()),
        );

        if (addedGames.length > 0) {
          showInfoMessage(
            translate('games.newGamesDetectedTitle'),
            translate('games.newGamesDetectedMessage', {
              count: addedGames.length,
            }),
          );

          setGames(newGames);
          await persistGamesCache(newGames, steamId);
          syncRecentActiveGames(newGames, steamId);
        }
      }
    } catch (error) {
      debugError('Erreur lors de la verification des nouveaux jeux:', error);
    }
  }, [games, persistGamesCache, setGames, steamId, syncRecentActiveGames]);

  const maybeRefreshGames = useCallback(
    async (origin = 'maybeRefreshGames') => {
      if (!steamId) {
        return;
      }

      if (skipNextGamesRefreshRef.current) {
        debugLog('[VERSION] refresh_skipped (skip flag)', {origin});
        skipNextGamesRefreshRef.current = false;
        return;
      }

      if (loading || refreshing || gamesFetchInFlightRef.current) {
        debugLog('[VERSION] refresh_skipped_inflight', {
          origin,
          loading,
          refreshing,
        });
        return;
      }

      const runStatusCheck = async () => {
        try {
          debugLog('[VERSION] status_check_start', {origin});
          const statusResponse = await steamService.fetchStatus(steamId);
          const serverGamesVersion = statusResponse?.data?.gamesVersion;

          if (!serverGamesVersion) {
            debugLog('[VERSION] status_missing', {origin});
            return;
          }

          if (serverGamesVersion !== gamesVersion) {
            debugLog('[VERSION] status_mismatch', {
              origin,
              serveur: serverGamesVersion,
              local: gamesVersion,
            });
            await loadData(true, origin, {
              expectedGamesVersion: serverGamesVersion,
            });
          } else {
            debugLog('[VERSION] status_match', {
              origin,
              version: serverGamesVersion,
            });
          }
        } catch (error) {
          debugError('[VERSION] status_check_fail', error);
        } finally {
          statusDebounceTimeoutRef.current = null;
        }
      };

      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
      }

      statusDebounceTimeoutRef.current = setTimeout(
        runStatusCheck,
        STATUS_DEBOUNCE_DELAY,
      );
    },
    [gamesVersion, loadData, loading, refreshing, steamId],
  );

  const refreshRecentsPlus = useCallback(
    async (origin = 'refreshRecentsPlus') => {
      if (!steamId) {
        return;
      }

      await maybeRefreshGames(origin);
    },
    [maybeRefreshGames, steamId],
  );

  const markSkipNextGamesRefresh = useCallback(() => {
    skipNextGamesRefreshRef.current = true;
  }, []);

  const resetGamesLibraryState = useCallback(() => {
    if (statusDebounceTimeoutRef.current) {
      clearTimeout(statusDebounceTimeoutRef.current);
      statusDebounceTimeoutRef.current = null;
    }

    if (gamesFetchAbortControllerRef.current) {
      try {
        gamesFetchAbortControllerRef.current.abort();
      } catch (abortError) {
        debugError('[LOADDATA] Erreur lors de l’abort au logout:', abortError);
      }
      gamesFetchAbortControllerRef.current = null;
    }

    gamesFetchInFlightRef.current = false;
    gamesLastRequestIdRef.current = null;
    gamesHydratedFromCacheRef.current = false;
    skipNextGamesRefreshRef.current = false;

    setGames([]);
    setGamesVersion(null);
    setLastRefreshTime(0);
    setLoading(false);
    setRefreshing(false);
  }, []);

  return {
    games,
    setGames,
    loading,
    refreshing,
    gamesVersion,
    setGamesVersion,
    lastRefreshTime,
    setLastRefreshTime,
    loadData,
    handleRefresh,
    checkForNewGames,
    maybeRefreshGames,
    refreshRecentsPlus,
    persistGamesCache,
    persistGamesVersion,
    markSkipNextGamesRefresh,
    resetGamesLibraryState,
  };
};
