import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Alert, AppState} from 'react-native';
import {
  useAsyncStorage,
  useLastVerificationDate,
} from '../hooks/useAsyncStorage';
import {useGameSync} from '../hooks/useGameSync';
import {steamService, userService} from '../services/api';
import {
  getGameAppId,
  getGameIconUrl,
  getLastPlayedValue,
  getLastUpdateValue,
  getPlaytimeForeverValue,
  isRecentlyUpdated,
} from '../utils/gameHelpers';

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
    loadData();

    // Configurer la détection du changement d'état de l'application
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App revenue au premier plan!');
        checkLastVerificationDate();
      }

      appState.current = nextAppState;
    });

    // Les options de tri et filtre sont maintenant gérées par useAsyncStorage

    return () => {
      subscription.remove();
    };
  }, []);

  // Surveiller les changements de steamId pour recharger les données après reconnexion
  useEffect(() => {
    if (steamId) {
      // Utiliser setRefreshing pour afficher les indicateurs de chargement
      setRefreshing(true);
      loadData().finally(() => setRefreshing(false));
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
    console.log(
      '🔍 filterAndSortGames appelée (mémorisée) - searchQuery:',
      searchQuery,
      'games count:',
      games?.length,
    );
    if (!games || !Array.isArray(games)) {
      console.log('Aucun jeu à filtrer ou format incorrect');
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

  // Fonction pour charger les données
  const loadData = async (isFullCheck = false) => {
    try {
      if (isFullCheck) {
        setLoading(true);
      }

      // Vérifier s'il y a un identifiant Steam enregistré
      const savedSteamId = await AsyncStorage.getItem('steamId');

      // Si pas d'identifiant, retourner à l'écran de connexion
      if (!savedSteamId) {
        setLoading(false);
        if (navigation) {
          navigation.navigate('Login');
          return; // Sortir de la fonction sans erreur
        }
        return;
      }

      // Si c'est le même steamId, forcer quand même le rechargement (reconnexion)
      if (steamId === savedSteamId) {
        // Afficher l'indicateur de chargement pour la reconnexion
        if (!isFullCheck) {
          setRefreshing(true);
        }
      } else {
        setSteamId(savedSteamId);
        return; // Laisser useEffect[steamId] gérer le chargement
      }

      setSteamId(savedSteamId);

      try {
        // Récupérer les informations de l'utilisateur
        const userResponse = await userService.getUser(savedSteamId);
        setUser(userResponse.data);

        // Vérifier si nous pouvons utiliser getAllUserGames ou si nous devons revenir à getUserGames
        let gamesResponse;
        try {
          // Utiliser directement getUserGames (méthode fiable)
          // Si le filtre est sur "followed", on ne récupère que les jeux suivis
          const shouldFetchFollowedOnly = followFilter === 'followed';
          gamesResponse = await steamService.getUserGames(
            savedSteamId,
            shouldFetchFollowedOnly,
          );
        } catch (error) {
          setLoading(false);
          Alert.alert(
            'Erreur de connexion',
            'Impossible de récupérer vos jeux. Veuillez vérifier votre connexion et réessayer.',
            [
              {
                text: 'Réessayer',
                onPress: () => loadData(isFullCheck),
              },
              {
                text: 'Déconnexion',
                style: 'destructive',
                onPress: () => handleLogout(),
              },
            ],
          );
          return;
        }

        // Adapter la structure selon la réponse reçue
        let newGames = [];
        if (gamesResponse.data && gamesResponse.data.games) {
          // Nouvelle structure (getAllUserGames)
          newGames = gamesResponse.data.games;
          console.log(
            `Structure getAllUserGames détectée. ${newGames.length} jeux reçus.`,
          );
        } else if (
          gamesResponse.data &&
          Array.isArray(gamesResponse.data.games)
        ) {
          // Ancienne structure (getUserGames)
          newGames = gamesResponse.data.games;
          console.log(
            `Structure getUserGames détectée. ${newGames.length} jeux reçus.`,
          );
        } else if (Array.isArray(gamesResponse.data)) {
          // Structure de secours
          newGames = gamesResponse.data;
        }

        // Vérifier les données de tri disponibles
        if (newGames.length > 0) {
          // Ajout d'un timestamp pour les jeux qui n'en ont pas
          newGames.forEach(game => {
            if (!game.lastUpdateTimestamp) {
              const fallbackTimestamp = getLastPlayedValue(game);
              if (fallbackTimestamp > 0) {
                game.lastUpdateTimestamp = fallbackTimestamp;
              }
            }
          });
        }

        // Traiter et afficher les statistiques
        if (Array.isArray(newGames) && newGames.length > 0) {
          if (gamesResponse.data.apiGamesCount) {
            console.log(
              `Détails: ${
                gamesResponse.data.apiGamesCount || 0
              } jeux de l'API Steam, ${
                gamesResponse.data.databaseOnlyCount || 0
              } jeux uniquement en base de données`,
            );
          }
        } else {
          console.log('Aucun jeu récupéré ou format de réponse inattendu');
        }

        // Enfin, mettre à jour l'état des jeux et arrêter le chargement
        const normalizedGames = Array.isArray(newGames) ? newGames : [];
        setGames(normalizedGames);
        syncRecentActiveGames(normalizedGames, savedSteamId);
        if (!isFullCheck) {
          setLoading(false);
        }

        // Arrêter l'indicateur de refreshing si activé (cas de reconnexion)
        setRefreshing(false);
      } catch (apiError) {
        console.error('Erreur API lors du chargement des données:', apiError);
        setLoading(false);
        setRefreshing(false);

        // Vérifier si l'erreur est due à un utilisateur non trouvé (404)
        if (apiError.response && apiError.response.status === 404) {
          console.log(
            'Utilisateur non trouvé dans la base de données, déconnexion forcée',
          );
          Alert.alert(
            'Session expirée',
            'Votre session a expiré ou votre compte a été supprimé. Veuillez vous reconnecter.',
            [
              {
                text: 'OK',
                onPress: () => handleLogout(),
              },
            ],
          );
          return;
        }

        // Autres erreurs
        Alert.alert(
          'Erreur de connexion',
          'Impossible de récupérer vos données. Veuillez vérifier votre connexion et réessayer.',
          [
            {
              text: 'Réessayer',
              onPress: () => loadData(isFullCheck),
            },
            {
              text: 'Déconnexion',
              style: 'destructive',
              onPress: () => handleLogout(),
            },
          ],
        );
      }

      updateVerificationDate();
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('🔴 LOAD ERROR -', error.message);
      setLoading(false);
      setRefreshing(false);

      // Proposer à l'utilisateur de se déconnecter en cas d'erreur grave
      Alert.alert(
        'Erreur',
        "Une erreur inattendue s'est produite. Voulez-vous vous déconnecter et réessayer?",
        [
          {
            text: 'Réessayer',
            onPress: () => loadData(isFullCheck),
          },
          {
            text: 'Déconnexion',
            style: 'destructive',
            onPress: () => handleLogout(),
          },
        ],
      );
    }
  };

  // Vérifier la dernière date de vérification
  const checkLastVerificationDate = async () => {
    try {
      if (isOlderThanOneDay()) {
        console.log("Plus d'un jour s'est écoulé, vérification complète...");
        loadData(true);
      } else if (Date.now() - lastRefreshTime > 300000) {
        checkForNewGames();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la date:', error);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    setRefreshing(true);
    loadData()
      .then(() => {
        setRefreshing(false);
      })
      .catch(error => {
        setRefreshing(false);
      });
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      // Supprimer l'ID Steam du stockage
      await AsyncStorage.removeItem('steamId');

      // Réinitialiser les états
      setSteamId('');
      setUser(null);
      setGames([]);
      setFilteredGames([]);

      // Navigation si disponible
      if (navigation) {
        navigation.replace('Login');
      } else {
        // Forcer un "rafraîchissement" pour que les composants se mettent à jour
        console.log(
          'Navigation non disponible, réinitialisation des états uniquement',
        );
        // Vous pouvez ajouter ici une alerte ou un autre feedback utilisateur
        Alert.alert(
          'Déconnexion réussie',
          "Vous avez été déconnecté avec succès. Veuillez redémarrer l'application.",
        );
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert(
        'Erreur de déconnexion',
        'Une erreur est survenue lors de la déconnexion. Veuillez réessayer.',
      );
    }
  };

  // Fonction pour gérer le suivi/désabonnement d'un jeu
  // gameData : {name, logoUrl} pour les jeux non possédés (wishlist)
  const handleFollowGame = async (appId, isFollowed, gameData = null) => {
    try {
      if (!steamId) {
        console.error('SteamID non trouvé');
        return;
      }

      if (!appId) {
        console.error('AppID non trouvé');
        return;
      }

      // Convertir l'appId en chaîne
      const appIdString = appId.toString();

      console.log('=== Début handleFollowGame ===');
      console.log('AppID reçu:', appIdString);
      console.log('État isFollowed:', isFollowed);
      console.log('Nombre total de jeux:', games.length);

      // Trouver le jeu dans la liste ou utiliser gameData (wishlist)
      const game = games.find(g => {
        const gameId = getGameAppId(g);
        return gameId === appIdString;
      });

      // Si le jeu n'est pas dans "Mes jeux", utiliser gameData (wishlist)
      if (!game && !gameData) {
        console.error('Jeu non trouvé dans la liste:', appIdString);
        console.log('=== Fin handleFollowGame (erreur) ===');
        return;
      }

      const gameName = game ? game.name : gameData.name;
      const gameIcon = game ? getGameIconUrl(appIdString, game.img_icon_url) : gameData.logoUrl;

      console.log('Jeu trouvé:', gameName);

      // Mettre à jour l'état localement d'abord pour une UI réactive
      const updatedGames = games.map(g => {
        const gameId = getGameAppId(g);
        if (gameId === appIdString) {
          return {...g, isFollowed: !isFollowed};
        }
        return g;
      });

      // Mettre à jour l'état des jeux
      setGames(updatedGames);

      try {
        // Appeler l'API pour mettre à jour le suivi
        if (!isFollowed) {
          // Suivre le jeu
          await userService.followGame(
            steamId,
            appIdString,
            gameName,
            gameIcon,
          );
          console.log('Jeu suivi avec succès:', gameName);
        } else {
          // Ne plus suivre le jeu
          await userService.unfollowGame(steamId, appIdString);
          console.log('Jeu retiré des suivis:', gameName);
        }

        // Recharger les données de l'utilisateur
        const userResponse = await userService.getUser(steamId);
        if (userResponse.data) {
          setUser(userResponse.data);
        }

        // Forcer le rafraîchissement de la liste filtrée
        filterAndSortGames();

        console.log('=== Fin handleFollowGame (succès) ===');
      } catch (apiError) {
        console.error('Erreur API lors de la modification du suivi:', apiError);

        // Restaurer l'état précédent
        setGames(games);

        Alert.alert(
          'Erreur',
          'Impossible de modifier le suivi du jeu. Veuillez réessayer.',
        );
      }
    } catch (error) {
      console.error('Erreur lors de la modification du suivi:', error);
      Alert.alert(
        'Erreur',
        'Une erreur inattendue est survenue. Veuillez réessayer.',
      );
    }
  };

  // Fonction pour vérifier les nouveaux jeux
  const checkForNewGames = async () => {
    try {
      if (!steamId) return;

      console.log('Vérification des nouveaux jeux pour', steamId);
      // Pour vérifier les nouveaux jeux, on récupère toujours tous les jeux
      const gamesResponse = await steamService.getUserGames(steamId, false);
      const newGames = Array.isArray(gamesResponse.data)
        ? gamesResponse.data
        : gamesResponse.data.games || [];

      if (!Array.isArray(newGames)) {
        console.log('Format de réponse inattendu:', gamesResponse.data);
        return;
      }

      console.log(`Jeux récupérés: ${newGames.length} jeux au total`);

      if (newGames.length > games.length) {
        console.log(
          `${newGames.length - games.length} nouveaux jeux détectés!`,
        );

        // Convertir en Set pour une comparaison plus rapide
        const currentAppIds = new Set(games.map(game => game.appid.toString()));

        // Trouver les nouveaux jeux
        const addedGames = newGames.filter(
          game => !currentAppIds.has(game.appid.toString()),
        );

        if (addedGames.length > 0) {
          Alert.alert(
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
      console.error('Erreur lors de la vérification des nouveaux jeux:', error);
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
