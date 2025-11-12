import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, AppState } from 'react-native';
import {
  buildStorageKey,
  getJSONItem,
  setJSONItem,
  useAsyncStorage,
  useLastVerificationDate,
} from '../hooks/useAsyncStorage';
import { useGameSync } from '../hooks/useGameSync';
import { steamService, userService } from '../services/api';
import {
  registerFCMToken,
  setupNotificationHandlers,
  unregisterFCMToken,
} from '../services/notificationService';
import {
  getGameAppId,
  getGameIconUrl,
  getLastPlayedValue,
  getPlaytimeForeverValue,
  isRecentlyUpdated,
} from '../utils';

const DEBUG_MODE =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production');

const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

const debugError = (...args) => {
  if (DEBUG_MODE) {
    console.error(...args);
  }
};

const showAlert = (title, message, buttons, options) =>
  Alert.alert(title, message, buttons, options);

class GamesFetchError extends Error {
  constructor(originalError) {
    super(
      (originalError && originalError.message) ||
        "Une erreur est survenue lors de la récupération des jeux.",
    );
    this.name = 'GamesFetchError';
    this.original = originalError;
  }
}

const extractGamesFromResponse = response => {
  const data = response?.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.games)) {
    return data.games;
  }
  return [];
};

const withFallbackTimestamps = games =>
  (games || []).map(game => {
    if (!game?.lastUpdateTimestamp) {
      const fallbackTimestamp = getLastPlayedValue(game);
      if (fallbackTimestamp > 0) {
        return {...game, lastUpdateTimestamp: fallbackTimestamp};
      }
    }
    return game;
  });

const STATUS_DEBOUNCE_DELAY = 250;
const getGamesCacheKey = steamId => buildStorageKey('games', steamId);
const getGamesVersionKey = steamId => buildStorageKey('gamesVersion', steamId);
const getWishlistCacheKey = steamId => buildStorageKey('wishlist', steamId);
const getWishlistVersionKey = steamId =>
  buildStorageKey('wishlistVersion', steamId);

const loadUserProfile = async steamId => {
  const response = await userService.getUser(steamId);
  return response.data;
};

const loadGamesLibrary = async (steamId, requestConfig = {}) => {
  try {
    const response = await steamService.getUserGames(steamId, requestConfig);
    const games = extractGamesFromResponse(response);
    debugLog(
      '[LOADDATA] Jeux récupérés:',
      Array.isArray(games) ? games.length : 0,
    );
    return withFallbackTimestamps(Array.isArray(games) ? games : []);
  } catch (error) {
    throw new GamesFetchError(error);
  }
};

const shouldReloadData = (forceReload, isReconnection, gamesLength) =>
  forceReload || isReconnection || gamesLength === 0;

const handleDataLoadError = ({error, onRetry, onLogout}) => {
  debugError('[LOADDATA] Erreur', error);

  if (error instanceof GamesFetchError) {
    showAlert(
      'Erreur de connexion',
      'Impossible de récupérer vos jeux. Veuillez vérifier votre connexion et réessayer.',
      [
        {text: 'Réessayer', onPress: onRetry},
        {text: 'Déconnexion', style: 'destructive', onPress: onLogout},
      ],
    );
    return;
  }

  const status = error?.response?.status;

  if (status === 404) {
    showAlert(
      'Session expirée',
      'Votre session a expiré ou votre compte a été supprimé. Veuillez vous reconnecter.',
      [{text: 'OK', onPress: onLogout}],
    );
    return;
  }

  if (error?.isAxiosError || status) {
    showAlert(
      'Erreur de connexion',
      'Impossible de récupérer vos données. Veuillez vérifier votre connexion et réessayer.',
      [
        {text: 'Réessayer', onPress: onRetry},
        {text: 'Déconnexion', style: 'destructive', onPress: onLogout},
      ],
    );
    return;
  }

  showAlert(
    'Erreur',
    "Une erreur inattendue s'est produite. Voulez-vous vous déconnecter et réessayer?",
    [
      {text: 'Réessayer', onPress: onRetry},
      {text: 'Déconnexion', style: 'destructive', onPress: onLogout},
    ],
  );
};

// Création du contexte
const AppContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAppContext = () => useContext(AppContext);

// Provider du contexte
export const AppProvider = ({children, navigation = null}) => {
  // Hooks personnalisés
  const {syncRecentActiveGames} = useGameSync();
  const {updateVerificationDate, isOlderThanOneDay} = useLastVerificationDate();

  // Refs pour la gestion des fetchs/versions
  const gamesFetchInFlightRef = useRef(false);
  const gamesLastRequestIdRef = useRef(null);
  const gamesFetchAbortControllerRef = useRef(null);
  const statusDebounceTimeoutRef = useRef(null);
  const gamesHydratedFromCacheRef = useRef(false);
  const skipNextGamesRefreshRef = useRef(false);
  const handleFollowGameRef = useRef(null);
  const notificationSyncListenersRef = useRef({
    news: new Set(),
    wishlist: new Set(),
    followed: new Set(),
  });

  const registerNotificationSyncHandler = useCallback(
    (type, handler) => {
      if (!type || typeof handler !== 'function') {
        return () => {};
      }

      const listeners = notificationSyncListenersRef.current[type];
      if (!listeners) {
        return () => {};
      }

      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    },
    [],
  );

  const notifyNotificationSync = useCallback((type, appId) => {
    if (!type || !appId) {
      return;
    }

    const listeners = notificationSyncListenersRef.current[type];
    if (!listeners || listeners.size === 0) {
      return;
    }

    listeners.forEach(listener => {
      try {
        listener(appId);
      } catch (error) {
        debugError(
          '[FCM] Erreur lors de la notification de synchronisation:',
          error,
        );
      }
    });
  }, []);

  // États principaux
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // États pour le versioning (invalidation cache)
  const [gamesVersion, setGamesVersion] = useState(null);
  const [wishlistVersion, setWishlistVersion] = useState(null);

  // État de l'application
  const appState = useRef(AppState.currentState);

  // Recherche et tri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useAsyncStorage('sortOption', 'default');

  // Chargement initial des données
  useEffect(() => {
    debugLog('\n🎬 [INIT] useEffect initial (mount) déclenché');
    loadData(false, 'init');

    // Configurer la détection du changement d'état de l'application
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        debugLog('📱 [APPSTATE] App revenue au premier plan!');
        checkLastVerificationDate();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
        statusDebounceTimeoutRef.current = null;
      }
    };
  }, [loadData]);

  // Surveiller les changements de steamId pour recharger les données après reconnexion
  useEffect(() => {
    debugLog('\n🔄 [useEffect[steamId]] Déclenché');
    debugLog('🔄 [useEffect[steamId]] steamId:', steamId || '(vide)');
    debugLog('🔄 [useEffect[steamId]] games.length:', games.length);
    debugLog('🔄 [useEffect[steamId]] loading:', loading);
    debugLog('🔄 [useEffect[steamId]] refreshing:', refreshing);
    
    // Charger les données uniquement si :
    // - steamId existe
    // - Aucune donnée chargée (games.length === 0)
    // - Aucun chargement en cours (évite double appel)
    if (steamId && games.length === 0 && !loading && !refreshing) {
      debugLog('🔄 [useEffect[steamId]] ✅ Condition remplie → appel loadData()');
      loadData(false, 'steamIdEffect');
    } else if (loading || refreshing) {
      debugLog('🔄 [useEffect[steamId]] ⏭️ Skip (chargement en cours)');
    } else if (steamId && games.length > 0) {
      debugLog('🔄 [useEffect[steamId]] ⏭️ Skip (jeux déjà chargés)');
    } else {
      debugLog('🔄 [useEffect[steamId]] ⏭️ Skip (pas de steamId)');
    }
  }, [steamId, games.length, loading, refreshing, loadData]);

  // Configuration des notifications FCM
  useEffect(() => {
    let cleanupNotifications;
    let canceled = false;

    async function initializeNotifications() {
      try {
        const storedNews = await AsyncStorage.getItem('newsNotifications');
        const storedLibraryMode = await AsyncStorage.getItem('libraryFollowMode');
        const storedWishlistMode = await AsyncStorage.getItem('wishlistFollowMode');

        const newsEnabled =
          storedNews !== null ? JSON.parse(storedNews) : false;
        const libraryMode = storedLibraryMode || 'off';
        const wishlistMode = storedWishlistMode || 'off';

        const needsNotifications =
          newsEnabled ||
          libraryMode === 'prompt' ||
          wishlistMode === 'prompt';

        if (canceled || !steamId) {
          return;
        }

        if (needsNotifications) {
          debugLog(
            '[FCM] 📥 Préférences notifications actives → tentative enregistrement token',
          );
          const result = await registerFCMToken(steamId);

          if (!result?.success) {
            debugLog(
              `[FCM] ⚠️ Impossible de ré-enregistrer le token (status=${result?.status})`,
            );
          }
        } else {
          debugLog(
            '[FCM] Notifications inactives → enregistrement token ignoré',
          );
        }
      } catch (error) {
        debugError('[FCM] Erreur lors de la lecture des préférences FCM:', error);
      }
    }

    if (steamId) {
      debugLog('[FCM] 🔔 Configuration des notifications pour:', steamId);
      cleanupNotifications = setupNotificationHandlers(steamId, {
        onUnfollowGame: async appId => {
          if (!appId) {
            return false;
          }

          const handler = handleFollowGameRef.current;
          if (!handler) {
            return false;
          }

          debugLog(
            '[FCM] 📤 Action "Ne plus suivre" reçue depuis la notification',
            appId,
          );
          try {
            const result = await handler({appId, isFollowed: true});
            return result !== false;
          } catch (error) {
            debugError(
              '[FCM] Erreur lors du traitement "Ne plus suivre" depuis la notification:',
              error,
            );
            return false;
          }
        },
        onNewsUnfollow: appId => notifyNotificationSync('news', appId),
        onWishlistUnfollow: appId => notifyNotificationSync('wishlist', appId),
        onFollowedGamesTabUnfollow: appId =>
          notifyNotificationSync('followed', appId),
        onFollowPromptConfirm: appId => notifyNotificationSync('followed', appId),
      });
      initializeNotifications();
    }

    return () => {
      canceled = true;
      if (cleanupNotifications) {
        debugLog('[FCM] 🔕 Nettoyage des handlers de notifications');
        cleanupNotifications();
      }
    };
  }, [steamId, notifyNotificationSync]);

  // La persistance des options est maintenant gérée automatiquement par useAsyncStorage

  // Filtrer et trier les jeux quand les critères changent
  useEffect(() => {
    if (games && Array.isArray(games) && (games.length > 0 || searchQuery)) {
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [games, searchQuery, sortOption]);

  // Filtrer et trier les jeux
  const filterAndSortGames = useCallback(() => {
    debugLog(
      '🔍 filterAndSortGames appelée (mémorisée) - searchQuery:',
      searchQuery,
      'games count:',
      games?.length,
    );
    if (!games || !Array.isArray(games)) {
      debugLog('Aucun jeu à filtrer ou format incorrect');
      setFilteredGames([]);
      return;
    }

    let filtered = [...games];

    // Appliquer le filtre de recherche
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(game =>
        game.name?.toLowerCase().includes(query),
      );
    }

    // Appliquer le tri
    switch (sortOption) {
      case 'alphabetical':
      case 'default':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      // ⚠️ DÉSACTIVÉ : Tri trop lent - voir SortModal.js
      // case 'recentlyUpdated':
      //   filtered.sort((a, b) => getLastUpdateValue(b) - getLastUpdateValue(a));
      //   break;
      case 'mostPlayed':
        filtered.sort(
          (a, b) => getPlaytimeForeverValue(b) - getPlaytimeForeverValue(a),
        );
        break;
      case 'recent':
        filtered.sort((a, b) => {
          return getLastPlayedValue(b) - getLastPlayedValue(a);
        });
        break;
      default:
        break;
    }

    setFilteredGames(filtered);
  }, [games, searchQuery, sortOption]);

  const beginLoadingState = forceReload => {
    if (forceReload) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
  };

  const finalizeLoadingState = () => {
    setLoading(false);
    setRefreshing(false);
  };

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
        debugLog('[VERSION] Version locale conservée', {
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

  const handleLogout = useCallback(async () => {
    try {
      debugLog('\n🚪 [LOGOUT] Début de la déconnexion...');
      debugLog('🚪 [LOGOUT] steamId avant reset:', steamId || '(vide)');
      debugLog('🚪 [LOGOUT] games count avant reset:', games.length);

      // Supprimer le token FCM du backend avant de déconnecter
      if (steamId) {
        try {
          await unregisterFCMToken(steamId);
          debugLog('🚪 [LOGOUT] Token FCM supprimé du backend');
        } catch (fcmError) {
          debugError('🚪 [LOGOUT] Erreur suppression token FCM:', fcmError);
          // Ne pas bloquer le logout si ça échoue
        }
      }

      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
        statusDebounceTimeoutRef.current = null;
      }

      if (gamesFetchAbortControllerRef.current) {
        try {
          gamesFetchAbortControllerRef.current.abort();
          debugLog('🚪 [LOGOUT] Abort du fetch en cours');
        } catch (abortError) {
          debugError('🚪 [LOGOUT] Erreur lors de l\'abort:', abortError);
        }
        gamesFetchAbortControllerRef.current = null;
      }

      gamesFetchInFlightRef.current = false;
      gamesLastRequestIdRef.current = null;
      gamesHydratedFromCacheRef.current = false;
      skipNextGamesRefreshRef.current = false;

      const storageKeys = [
        'steamId',
        'lastVerificationDate',
        'newsNotifications',
        'libraryFollowMode',
        'wishlistFollowMode',
        'sortOption',
        'gamesVersion',
        'wishlistVersion',
      ];

      const currentSteamId =
        steamId || (await AsyncStorage.getItem('steamId')) || null;

      if (currentSteamId) {
        storageKeys.push(
          getGamesCacheKey(currentSteamId),
          getGamesVersionKey(currentSteamId),
          getWishlistCacheKey(currentSteamId),
          getWishlistVersionKey(currentSteamId),
        );
      }

      await AsyncStorage.multiRemove(storageKeys.filter(Boolean));
      debugLog('🚪 [LOGOUT] ✅ AsyncStorage nettoyé', storageKeys);

      setSteamId('');
      setUser(null);
      setGames([]);
      setFilteredGames([]);
      setGamesVersion(null);
      setWishlistVersion(null);
      setLastRefreshTime(0);
      setSearchQuery('');
      setSortOption('default');

      if (navigation) {
        navigation.replace('Login');
      } else {
        showAlert(
          'Déconnexion réussie',
          "Vous avez été déconnecté.",
        );
      }

      debugLog('🚪 [LOGOUT] ✅ Déconnexion terminée\n');
    } catch (error) {
      debugError('🚪 [LOGOUT] ❌ Erreur lors de la déconnexion:', error);
      showAlert(
        'Erreur de déconnexion',
        'Une erreur est survenue lors de la déconnexion. Veuillez réessayer.',
      );
    }
  }, [
    games.length,
    navigation,
    setSortOption,
    steamId,
  ]);

  // Fonction pour charger les données
  const loadData = useCallback(
    async (forceReload = false, origin = 'unknown', options = {}) => {
      const {expectedGamesVersion} = options;

      debugLog('\n[LOADDATA] Début loadData...', `origine=${origin}`);
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
        if (navigation) {
          navigation.navigate('Login');
        }
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
        debugLog('[LOADDATA] steamId différent → setSteamId()');
        setSteamId(savedSteamId);
      }

      const mustReload = shouldReloadData(
        forceReload,
        isReconnection,
        games.length,
      );
      debugLog('[LOADDATA] shouldReload:', mustReload);

      if (!mustReload && !forceReload) {
        debugLog('[LOADDATA] Skip fetch (pas nécessaire)');
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
      const requestConfig = {signal: abortController.signal};

      try {
        const userData = await loadUserProfile(savedSteamId);
        if (gamesLastRequestIdRef.current !== requestId) {
          debugLog('[LOADDATA] Résultat userData ignoré (requête obsolète)');
          return;
        }
        setUser(userData);
        debugLog('[LOADDATA] Utilisateur récupéré');

        const normalizedGames = await loadGamesLibrary(
          savedSteamId,
          requestConfig,
        );
        if (gamesLastRequestIdRef.current !== requestId) {
          debugLog('[LOADDATA] Résultat games ignoré (requête obsolète)');
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
          debugLog('[LOADDATA] Requête annulée', {origin});
        } else {
          handleDataLoadError({
            error,
            onRetry: () => loadData(true, 'loadDataRetry'),
            onLogout: handleLogout,
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
      games.length,
      navigation,
      persistGamesCache,
      persistGamesVersion,
      steamId,
      syncRecentActiveGames,
      updateVerificationDate,
      handleLogout,
    ],
  );

// Vérifier la dernière date de vérification
  const checkLastVerificationDate = async () => {
    try {
      // Vérifier d'abord si un steamId existe (évite race condition pendant login)
      const savedSteamId = await AsyncStorage.getItem('steamId');
      if (!savedSteamId) {
        debugLog('⏭️ [CHECK] Skip vérification (pas de steamId dans AsyncStorage)');
        return;
      }

      if (isOlderThanOneDay()) {
        debugLog("⏰ [CHECK] Plus d'un jour écoulé → vérification complète");
        loadData(true, 'checkLastVerificationDate');
      } else if (Date.now() - lastRefreshTime > 300000) {
        debugLog("⏰ [CHECK] Vérification des nouveaux jeux (5 min écoulées)");
        checkForNewGames();
      } else {
        debugLog('⏭️ [CHECK] Vérification récente, skip');
      }
    } catch (error) {
      debugError('❌ [CHECK] Erreur lors de la vérification de la date:', error);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = useCallback(() => {
    loadData(true, 'handleRefresh');
  }, [loadData]);

  // Fonction pour gerer le suivi/desabonnement d'un jeu
  const handleFollowGame = async (gameMeta = {}) => {
    try {
      if (!steamId) {
        debugError('SteamID non trouvé');
        return false;
      }

      const rawAppId = gameMeta?.appId ?? gameMeta?.appid;
      if (!rawAppId) {
        debugError('AppID non trouvé');
        return false;
      }

      const appIdString = rawAppId.toString();

      debugLog('=== Début handleFollowGame ===');
      debugLog('AppID reçu:', appIdString);
      debugLog(
        'État isFollowed (fourni):',
        typeof gameMeta.isFollowed === 'boolean' ? gameMeta.isFollowed : 'non fourni',
      );
      debugLog('Nombre total de jeux:', games.length);

      const isFollowed =
        typeof gameMeta.isFollowed === 'boolean'
          ? gameMeta.isFollowed
          : isGameFollowed(appIdString);

      const game = games.find(g => getGameAppId(g) === appIdString);

      const gameName =
        gameMeta.name ||
        game?.name ||
        `Jeu ${appIdString}`;
      const gameIcon =
        gameMeta.imageUrl ||
        gameMeta.logoUrl ||
        (game ? getGameIconUrl(appIdString, game.img_icon_url) : '') ||
        '';

      debugLog('Jeu cible:', gameName);

      const previousGames = games;
      let localToggleApplied = false;
      let optimisticGames = games;

      if (game) {
        const updatedGames = games.map(g => {
          if (getGameAppId(g) === appIdString) {
            localToggleApplied = true;
            return {...g, isFollowed: !isFollowed};
          }
          return g;
        });

        if (localToggleApplied) {
          setGames(updatedGames);
          optimisticGames = updatedGames;
        }
      }

      try {
        if (!isFollowed) {
          const followResponse = await userService.followGame(
            steamId,
            appIdString,
            gameName,
            gameIcon,
          );
          const updatedUser = followResponse?.data;
          if (updatedUser?.gamesVersion) {
            await persistGamesVersion(updatedUser.gamesVersion, steamId, {
              reason: 'followGame',
            });
          }
          debugLog('Jeu suivi avec succès:', gameName);

          if (updatedUser) {
            setUser(updatedUser);
          } else {
            setUser(prevUser => {
              if (!prevUser) {
                return prevUser;
              }

              const current = Array.isArray(prevUser.followedGames)
                ? prevUser.followedGames.slice()
                : [];

              if (current.includes(appIdString)) {
                return {...prevUser, followedGames: current};
              }

              return {
                ...prevUser,
                followedGames: [...current, appIdString],
              };
            });
          }
          skipNextGamesRefreshRef.current = true;
          if (localToggleApplied) {
            await persistGamesCache(optimisticGames, steamId);
          }
        } else {
          const unfollowResponse = await userService.unfollowGame(
            steamId,
            appIdString,
          );
          const updatedUser = unfollowResponse?.data;
          if (updatedUser?.gamesVersion) {
            await persistGamesVersion(updatedUser.gamesVersion, steamId, {
              reason: 'unfollowGame',
            });
          }
          debugLog('Jeu retiré des suivis:', gameName);

          if (updatedUser) {
            setUser(updatedUser);
          } else {
            setUser(prevUser => {
              if (!prevUser) {
                return prevUser;
              }

              const current = Array.isArray(prevUser.followedGames)
                ? prevUser.followedGames.slice()
                : [];

              return {
                ...prevUser,
                followedGames: current.filter(id => id !== appIdString),
              };
            });
          }
          skipNextGamesRefreshRef.current = true;
          if (localToggleApplied) {
            await persistGamesCache(optimisticGames, steamId);
          }
        }

        filterAndSortGames();

        debugLog('=== Fin handleFollowGame (succès) ===');
        return true;
      } catch (apiError) {
        debugError('Erreur API lors de la modification du suivi:', apiError);

        if (localToggleApplied) {
          setGames(previousGames);
          await persistGamesCache(previousGames, steamId);
        }

        showAlert(
          'Erreur',
          'Impossible de modifier le suivi du jeu. Veuillez réessayer.',
        );
        return false;
      }
    } catch (error) {
      debugError('Erreur lors de la modification du suivi:', error);
      showAlert(
        'Erreur',
        'Une erreur inattendue est survenue. Veuillez réessayer.',
      );
      return false;
    }
  };

  handleFollowGameRef.current = handleFollowGame;

  // Fonction pour vérifier les nouveaux jeux
  const checkForNewGames = async () => {
    try {
      if (!steamId) return;

      debugLog('Vérification des nouveaux jeux pour', steamId);
      // Pour vérifier les nouveaux jeux, on récupère toujours tous les jeux
      const gamesResponse = await steamService.getUserGames(steamId);
      const newGames = Array.isArray(gamesResponse.data)
        ? gamesResponse.data
        : gamesResponse.data.games || [];

      if (!Array.isArray(newGames)) {
        debugLog('Format de réponse inattendu:', gamesResponse.data);
        return;
      }

      debugLog(`Jeux récupérés: ${newGames.length} jeux au total`);

      if (newGames.length > games.length) {
        debugLog(
          `${newGames.length - games.length} nouveaux jeux détectés!`,
        );

        // Convertir en Set pour une comparaison plus rapide
        const currentAppIds = new Set(games.map(game => game.appid.toString()));

        // Trouver les nouveaux jeux
        const addedGames = newGames.filter(
          game => !currentAppIds.has(game.appid.toString()),
        );

        if (addedGames.length > 0) {
          showAlert(
            'Nouveaux jeux détectés',
            `${addedGames.length} nouveau(x) jeu(x) ont été ajoutés à votre bibliothèque.`,
            [{text: 'OK'}],
          );

          // Mettre à jour les jeux
          setGames(newGames);
          await persistGamesCache(newGames, steamId);
          syncRecentActiveGames(newGames, steamId);
        }
      }
    } catch (error) {
      debugError('Erreur lors de la vérification des nouveaux jeux:', error);
    }
  };

  // La fonction isRecentlyUpdated est maintenant importée des utilitaires

  // Vérifier si un jeu est suivi
  const isGameFollowed = appId =>
    !!user?.followedGames && user.followedGames.includes(appId);

  /**
   * ✨ Refresh conditionnel basé sur la version games
   * Appelé au focus pour vérifier si les données ont changé
   */
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
            debugLog('[VERSION] status_match', {origin, version: serverGamesVersion});
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

  // Valeur du contexte
  const contextValue = {
    // États
    games,
    filteredGames,
    loading,
    refreshing,
    steamId,
    user,
    searchQuery,
    sortOption,
    gamesVersion,
    wishlistVersion,

    // Setters
    setSearchQuery,
    setSortOption,
    setGamesVersion,
    setWishlistVersion,

    // Fonctions
    loadData,
    handleRefresh,
    handleLogout,
    handleFollowGame,
    checkForNewGames,
    isRecentlyUpdated,
    filterAndSortGames,
    isGameFollowed,
    maybeRefreshGames,
    registerNotificationSyncHandler,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
