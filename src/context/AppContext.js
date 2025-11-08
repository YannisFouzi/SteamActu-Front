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
  useAsyncStorage,
  useLastVerificationDate,
} from '../hooks/useAsyncStorage';
import { useGameSync } from '../hooks/useGameSync';
import { steamService, userService } from '../services/api';
import {
  getGameAppId,
  getGameIconUrl,
  getLastPlayedValue,
  isRecentlyUpdated
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

const loadUserProfile = async steamId => {
  const response = await userService.getUser(steamId);
  return response.data;
};

const loadGamesLibrary = async (steamId, followFilter) => {
  try {
    const shouldFetchFollowedOnly = followFilter === 'followed';
    const response = await steamService.getUserGames(
      steamId,
      shouldFetchFollowedOnly,
    );
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

  // États principaux
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // État de l'application
  const appState = useRef(AppState.currentState);

  // Recherche et tri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortOption, setSortOption] = useAsyncStorage('sortOption', 'default');

  // Filtre pour les jeux suivis
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [followFilter, setFollowFilter] = useAsyncStorage(
    'followFilter',
    'all',
  );

  // Chargement initial des données
  useEffect(() => {
    debugLog('\n🎬 [INIT] useEffect initial (mount) déclenché');
    loadData();

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
    };
  }, []);

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
      loadData();
    } else if (loading || refreshing) {
      debugLog('🔄 [useEffect[steamId]] ⏭️ Skip (chargement en cours)');
    } else if (steamId && games.length > 0) {
      debugLog('🔄 [useEffect[steamId]] ⏭️ Skip (jeux déjà chargés)');
    } else {
      debugLog('🔄 [useEffect[steamId]] ⏭️ Skip (pas de steamId)');
    }
  }, [steamId]);

  // La persistance des options est maintenant gérée automatiquement par useAsyncStorage

  // Filtrer et trier les jeux quand les critères changent
  useEffect(() => {
    if (games && Array.isArray(games) && (games.length > 0 || searchQuery)) {
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [games, searchQuery, sortOption, followFilter]);

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

    // Appliquer le filtre de suivi
    if (followFilter !== 'all') {
      filtered = filtered.filter(game => {
        const appId = getGameAppId(game);
        const isFollowed = isGameFollowed(appId);
        return followFilter === 'followed' ? isFollowed : !isFollowed;
      });
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
  }, [games, searchQuery, followFilter, sortOption, isGameFollowed]);

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

  // Fonction pour charger les données
  const loadData = async (forceReload = false) => {
    debugLog('\n[LOADDATA] Début loadData...');
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

    if (!mustReload) {
      return;
    }

    beginLoadingState(forceReload);

    try {
      const userData = await loadUserProfile(savedSteamId);
      setUser(userData);
      debugLog(
        '[LOADDATA] Utilisateur récupéré:',
        userData?.username || '(inconnu)',
      );

      const normalizedGames = await loadGamesLibrary(savedSteamId, followFilter);
      setGames(normalizedGames);
      syncRecentActiveGames(normalizedGames, savedSteamId);
      debugLog(
        '[LOADDATA] setGames ->',
        Array.isArray(normalizedGames) ? normalizedGames.length : 0,
        'jeux',
      );

      updateVerificationDate();
      setLastRefreshTime(Date.now());
    } catch (error) {
      handleDataLoadError({
        error,
        onRetry: () => loadData(true),
        onLogout: handleLogout,
      });
    } finally {
      finalizeLoadingState();
    }
  };

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
        loadData(true);
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
  const handleRefresh = () => {
    loadData(true);
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      debugLog('\n🚪 [LOGOUT] Début de la déconnexion...');
      debugLog('🚪 [LOGOUT] steamId avant reset:', steamId);
      debugLog('🚪 [LOGOUT] games count avant reset:', games.length);
      
      // Supprimer toutes les données d'AsyncStorage
      await AsyncStorage.removeItem('steamId');
      await AsyncStorage.removeItem('lastVerificationDate');
      debugLog('🚪 [LOGOUT] ✅ AsyncStorage vidé (steamId, lastVerificationDate)');

      // Réinitialiser TOUS les états du contexte
      setSteamId('');
      setUser(null);
      setGames([]);
      setFilteredGames([]);
      setLastRefreshTime(0);
      debugLog('🚪 [LOGOUT] ✅ États réinitialisés (steamId="", user=null, games=[], lastRefreshTime=0)');

      // Navigation si disponible
      if (navigation) {
        debugLog('🚪 [LOGOUT] ✅ Navigation vers LoginScreen');
        navigation.replace('Login');
      } else {
        debugLog('🚪 [LOGOUT] ⚠️ Navigation non disponible');
        showAlert(
          'Déconnexion réussie',
          "Vous avez été déconnecté avec succès. Veuillez redémarrer l'application.",
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
  };

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
        }
      }

      try {
        if (!isFollowed) {
          await userService.followGame(
            steamId,
            appIdString,
            gameName,
            gameIcon,
          );
          debugLog('Jeu suivi avec succès:', gameName);

          setUser(prevUser => {
            if (!prevUser) return prevUser;

            const current = Array.isArray(prevUser.followedGames)
              ? prevUser.followedGames
                  .map(item =>
                    typeof item === 'string'
                      ? item
                      : item?.appId?.toString(),
                  )
                  .filter(Boolean)
              : [];

            if (current.includes(appIdString)) {
              return {...prevUser, followedGames: current};
            }

            return {
              ...prevUser,
              followedGames: [...current, appIdString],
            };
          });
        } else {
          await userService.unfollowGame(steamId, appIdString);
          debugLog('Jeu retiré des suivis:', gameName);

          setUser(prevUser => {
            if (!prevUser) return prevUser;

            const current = Array.isArray(prevUser.followedGames)
              ? prevUser.followedGames
                  .map(item =>
                    typeof item === 'string'
                      ? item
                      : item?.appId?.toString(),
                  )
                  .filter(Boolean)
              : [];

            return {
              ...prevUser,
              followedGames: current.filter(id => id !== appIdString),
            };
          });
        }

        filterAndSortGames();

        debugLog('=== Fin handleFollowGame (succès) ===');
        return true;
      } catch (apiError) {
        debugError('Erreur API lors de la modification du suivi:', apiError);

        if (localToggleApplied) {
          setGames(previousGames);
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

  // Fonction pour vérifier les nouveaux jeux
  const checkForNewGames = async () => {
    try {
      if (!steamId) return;

      debugLog('Vérification des nouveaux jeux pour', steamId);
      // Pour vérifier les nouveaux jeux, on récupère toujours tous les jeux
      const gamesResponse = await steamService.getUserGames(steamId, false);
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
          syncRecentActiveGames(newGames, steamId);
        }
      }
    } catch (error) {
      debugError('Erreur lors de la vérification des nouveaux jeux:', error);
    }
  };

  // La fonction isRecentlyUpdated est maintenant importée des utilitaires

  // Vérifier si un jeu est suivi
  const isGameFollowed = appId => {
    if (!user || !user.followedGames) return false;

    // Nouvelle structure : array simple d'IDs
    if (typeof user.followedGames[0] === 'string') {
      return user.followedGames.includes(appId);
    }

    // Ancienne structure : array d'objets (compatibilité)
    return user.followedGames.some(game => game.appId === appId);
  };

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
    sortModalVisible,
    sortOption,
    filterModalVisible,
    followFilter,

    // Setters
    setSearchQuery,
    setSortModalVisible,
    setSortOption,
    setFilterModalVisible,
    setFollowFilter,

    // Fonctions
    loadData,
    handleRefresh,
    handleLogout,
    handleFollowGame,
    checkForNewGames,
    isRecentlyUpdated,
    filterAndSortGames,
    isGameFollowed,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
