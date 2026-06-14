import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {getJSONItem, setJSONItem} from '../../hooks/useAsyncStorage';
import {debugError, debugLog, showInfoMessage} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {steamService} from '../../services/api';
import {
  applyPendingFollowOverlayToGames,
  applyPendingFollowOverlayToUser,
  readPendingFollowMutations,
} from '../../services/followStateLocalStore';
import {
  STATUS_DEBOUNCE_DELAY,
  getFollowVersionKey,
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
  // Version du SUIVI (follow/unfollow/toggle, toutes surfaces). Un mismatch
  // déclenche un re-fetch du PROFIL SEUL — pas le reload des 250 jeux —, ce qui
  // propage les follows faits ailleurs (web, plugin, extension) sans lag.
  const [followVersion, setFollowVersion] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  const gamesFetchInFlightRef = useRef(false);
  const gamesLastRequestIdRef = useRef(null);
  const gamesFetchAbortControllerRef = useRef(null);
  const statusDebounceTimeoutRef = useRef(null);
  const gamesHydratedFromCacheRef = useRef(false);
  const gamesFetchedOnceRef = useRef(false);
  const skipNextGamesRefreshRef = useRef(false);

  const cancelInFlightOperations = useCallback(reason => {
    if (statusDebounceTimeoutRef.current) {
      clearTimeout(statusDebounceTimeoutRef.current);
      statusDebounceTimeoutRef.current = null;
    }

    if (gamesFetchAbortControllerRef.current) {
      try {
        gamesFetchAbortControllerRef.current.abort();
      } catch (abortError) {
        debugError(`[LOADDATA] Erreur lors de l’abort au ${reason}:`, abortError);
      }
      gamesFetchAbortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelInFlightOperations('nettoyage');
    };
  }, [cancelInFlightOperations]);

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

  const persistFollowVersion = useCallback(
    async (newVersion, targetSteamId = steamId) => {
      if (!newVersion) {
        return;
      }
      const versionKey = getFollowVersionKey(targetSteamId);
      if (!versionKey) {
        return;
      }
      setFollowVersion(newVersion);
      await AsyncStorage.setItem(versionKey, newVersion);
    },
    [steamId],
  );

  // Re-fetch du PROFIL uniquement (followedGames/mutedGames/etc.) sans toucher à
  // la bibliothèque — déclenché quand seul followVersion a bougé (un suivi fait
  // sur une autre surface). Garde-fou : si un loadData complet est en vol, il
  // rafraîchira déjà le profil, donc on s'abstient.
  const refreshProfileOnly = useCallback(
    async (serverFollowVersion, targetSteamId = steamId) => {
      if (!targetSteamId || gamesFetchInFlightRef.current) {
        return;
      }
      try {
        let userData = await loadUserProfile(targetSteamId);
        const pending = await readPendingFollowMutations(targetSteamId);
        userData = applyPendingFollowOverlayToUser(userData, pending);
        setUser(userData);
        if (serverFollowVersion) {
          await persistFollowVersion(serverFollowVersion, targetSteamId);
        }
        debugLog('[FOLLOW_VERSION] profil re-fetch (follow change distant)', {
          version: serverFollowVersion,
        });
      } catch (error) {
        debugError('[FOLLOW_VERSION] refreshProfileOnly fail', error);
      }
    },
    [persistFollowVersion, setUser, steamId],
  );

  const loadData = useCallback(
    async (forceReload = false, origin = 'unknown', options = {}) => {
      const {expectedGamesVersion, expectedFollowVersion} = options;

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
      const followVersionKey = getFollowVersionKey(savedSteamId);
      const pendingFollowMutations =
        await readPendingFollowMutations(savedSteamId);

      if (!gamesHydratedFromCacheRef.current) {
        const [cachedGames, cachedVersion, cachedFollowVersion] =
          await Promise.all([
            getJSONItem(gamesCacheKey, null),
            AsyncStorage.getItem(gamesVersionKey),
            AsyncStorage.getItem(followVersionKey),
          ]);
        if (cachedFollowVersion) {
          setFollowVersion(cachedFollowVersion);
        }

        if (Array.isArray(cachedGames) && cachedGames.length > 0) {
          debugLog('[CACHE] cache_hit games', {
            count: cachedGames.length,
          });
          const cachedGamesWithOverlay = applyPendingFollowOverlayToGames(
            cachedGames,
            pendingFollowMutations,
          );
          gamesHydratedFromCacheRef.current = true;
          setGames(cachedGamesWithOverlay);
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
        gamesFetchedOnceRef.current,
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
        let userData = await loadUserProfile(savedSteamId);
        if (gamesLastRequestIdRef.current !== requestId) {
          debugLog('[LOADDATA] Resultat userData ignore (requete obsolete)');
          return;
        }
        const latestUserPendingFollowMutations =
          await readPendingFollowMutations(savedSteamId);
        userData = applyPendingFollowOverlayToUser(
          userData,
          latestUserPendingFollowMutations,
        );
        setUser(userData);
        debugLog('[LOADDATA] Utilisateur recupere');

        const serverGames = await loadGamesLibrary(
          savedSteamId,
          requestConfig,
        );
        if (gamesLastRequestIdRef.current !== requestId) {
          debugLog('[LOADDATA] Resultat games ignore (requete obsolete)');
          return;
        }
        const latestGamesPendingFollowMutations =
          await readPendingFollowMutations(savedSteamId);
        const normalizedGames = applyPendingFollowOverlayToGames(
          serverGames,
          latestGamesPendingFollowMutations,
        );

        setGames(normalizedGames);
        gamesHydratedFromCacheRef.current = true;
        gamesFetchedOnceRef.current = true;
        syncRecentActiveGames(normalizedGames, savedSteamId);
        debugLog(
          '[LOADDATA] setGames ->',
          Array.isArray(normalizedGames) ? normalizedGames.length : 0,
          'jeux',
        );

        let serverGamesVersion = expectedGamesVersion || null;
        let serverFollowVersion = expectedFollowVersion || null;
        if (!serverGamesVersion || !serverFollowVersion) {
          try {
            debugLog('[LOADDATA] status_check_start (origine=loadData)', {
              origin,
              forceReload,
            });
            const statusResponse = await steamService.fetchStatus(
              savedSteamId,
              requestConfig,
            );
            serverGamesVersion =
              serverGamesVersion || statusResponse?.data?.gamesVersion || null;
            serverFollowVersion =
              serverFollowVersion ||
              statusResponse?.data?.followVersion ||
              null;
            debugLog('[LOADDATA] status_check_ok (origine=loadData)', {
              origin,
              serverGamesVersion,
              serverFollowVersion,
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
        // loadData rafraîchit déjà le profil → on aligne followVersion pour ne
        // pas re-déclencher un refresh profil juste après.
        if (serverFollowVersion) {
          await persistFollowVersion(serverFollowVersion, savedSteamId);
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
      persistFollowVersion,
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
          const pendingFollowMutations =
            await readPendingFollowMutations(steamId);
          const nextGames = applyPendingFollowOverlayToGames(
            newGames,
            pendingFollowMutations,
          );

          showInfoMessage(
            translate('games.newGamesDetectedTitle'),
            translate('games.newGamesDetectedMessage', {
              count: addedGames.length,
            }),
          );

          setGames(nextGames);
          await persistGamesCache(nextGames, steamId);
          syncRecentActiveGames(nextGames, steamId);
        }
      }
    } catch (error) {
      debugError('Erreur lors de la verification des nouveaux jeux:', error);
    }
  }, [games, persistGamesCache, setGames, steamId, syncRecentActiveGames]);

  // Implémentation (identité instable : capture gamesVersion/loading/etc.).
  const runMaybeRefreshGames = useCallback(
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
          const serverFollowVersion = statusResponse?.data?.followVersion;

          if (!serverGamesVersion) {
            debugLog('[VERSION] status_missing', {origin});
            return;
          }

          // 1) La bibliothèque a changé → reload complet (qui aligne aussi
          // followVersion). Prioritaire : il rafraîchit déjà le profil.
          if (serverGamesVersion !== gamesVersion) {
            debugLog('[VERSION] status_mismatch', {
              origin,
              serveur: serverGamesVersion,
              local: gamesVersion,
            });
            await loadData(true, origin, {
              expectedGamesVersion: serverGamesVersion,
              expectedFollowVersion: serverFollowVersion,
            });
            return;
          }

          // 2) Seul le SUIVI a changé (follow fait ailleurs : web, plugin,
          // extension) → re-fetch du profil seul, pas de reload bibliothèque.
          if (serverFollowVersion && serverFollowVersion !== followVersion) {
            debugLog('[VERSION] follow_mismatch', {
              origin,
              serveur: serverFollowVersion,
              local: followVersion,
            });
            await refreshProfileOnly(serverFollowVersion);
            return;
          }

          debugLog('[VERSION] status_match', {
            origin,
            version: serverGamesVersion,
          });
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
    [
      followVersion,
      gamesVersion,
      loadData,
      loading,
      refreshing,
      refreshProfileOnly,
      steamId,
    ],
  );

  // API publique RÉFÉRENCE-STABLE (même pattern que loadDataRef dans
  // useAppLifecycleRefresh). Sans ça, l'identité de maybeRefreshGames changeait
  // à chaque render, et le useFocusEffect de MyGamesScreen (qui en dépend) se
  // ré-exécutait en boucle → checks de version en rafale + rechargements.
  const runMaybeRefreshGamesRef = useRef(runMaybeRefreshGames);
  useEffect(() => {
    runMaybeRefreshGamesRef.current = runMaybeRefreshGames;
  }, [runMaybeRefreshGames]);

  const maybeRefreshGames = useCallback(
    (origin = 'maybeRefreshGames') => runMaybeRefreshGamesRef.current(origin),
    [],
  );

  const markSkipNextGamesRefresh = useCallback(() => {
    skipNextGamesRefreshRef.current = true;
  }, []);

  const resetGamesLibraryState = useCallback(() => {
    cancelInFlightOperations('logout');

    gamesFetchInFlightRef.current = false;
    gamesLastRequestIdRef.current = null;
    gamesHydratedFromCacheRef.current = false;
    gamesFetchedOnceRef.current = false;
    skipNextGamesRefreshRef.current = false;

    setGames([]);
    setGamesVersion(null);
    setFollowVersion(null);
    setLastRefreshTime(0);
    setLoading(false);
    setRefreshing(false);
  }, [cancelInFlightOperations]);

  return {
    games,
    setGames,
    loading,
    refreshing,
    lastRefreshTime,
    loadData,
    handleRefresh,
    checkForNewGames,
    maybeRefreshGames,
    persistGamesCache,
    persistGamesVersion,
    markSkipNextGamesRefresh,
    resetGamesLibraryState,
  };
};
