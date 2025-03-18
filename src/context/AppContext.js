import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Alert, AppState} from 'react-native';
import {steamService, userService} from '../services/api';

// Création du contexte
const AppContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAppContext = () => useContext(AppContext);

// Provider du contexte
export const AppProvider = ({children, navigation = null}) => {
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
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // Recherche et tri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [isLoadingMoreGames, setIsLoadingMoreGames] = useState(false);

  // Filtre pour les jeux suivis
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [followFilter, setFollowFilter] = useState('all'); // 'all', 'followed', 'unfollowed'

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
      setAppStateVisible(appState.current);
    });

    // Charger l'option de tri sauvegardée
    const getSavedSortOption = async () => {
      try {
        const savedOption = await AsyncStorage.getItem('sortOption');
        if (savedOption) {
          console.log('Option de tri récupérée du stockage:', savedOption);
          setSortOption(savedOption);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'option de tri:",
          error,
        );
      }
    };
    getSavedSortOption();

    // Charger l'option de filtre sauvegardée
    const getSavedFilterOption = async () => {
      try {
        const savedFilter = await AsyncStorage.getItem('followFilter');
        if (savedFilter) {
          console.log('Option de filtre récupérée du stockage:', savedFilter);
          setFollowFilter(savedFilter);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'option de filtre:",
          error,
        );
      }
    };
    getSavedFilterOption();

    return () => {
      subscription.remove();
    };
  }, []);

  // Persister l'option de tri
  useEffect(() => {
    if (sortOption) {
      const saveSortOption = async () => {
        try {
          await AsyncStorage.setItem('sortOption', sortOption);
          console.log('Option de tri sauvegardée:', sortOption);
        } catch (error) {
          console.error(
            "Erreur lors de la sauvegarde de l'option de tri:",
            error,
          );
        }
      };
      saveSortOption();
    }
  }, [sortOption]);

  // Persister l'option de filtre
  useEffect(() => {
    if (followFilter) {
      const saveFilterOption = async () => {
        try {
          await AsyncStorage.setItem('followFilter', followFilter);
          console.log('Option de filtre sauvegardée:', followFilter);
        } catch (error) {
          console.error(
            "Erreur lors de la sauvegarde de l'option de filtre:",
            error,
          );
        }
      };
      saveFilterOption();
    }
  }, [followFilter]);

  // Filtrer et trier les jeux quand les critères changent
  useEffect(() => {
    if (games && Array.isArray(games) && (games.length > 0 || searchQuery)) {
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [games, searchQuery, sortOption, followFilter]);

  // Filtrer et trier les jeux
  const filterAndSortGames = () => {
    if (!games || !Array.isArray(games)) {
      console.log('Aucun jeu à filtrer ou format incorrect');
      setFilteredGames([]);
      return;
    }

    let filtered = [...games];

    // Vérifier les données disponibles pour le débogage
    if (filtered.length > 0) {
      const sampleGame = filtered[0];
      console.log("Données d'un jeu exemple pour le tri:", {
        name: sampleGame.name,
        appid: sampleGame.appid,
        lastUpdateTimestamp: sampleGame.lastUpdateTimestamp,
        playtime_forever: sampleGame.playtime_forever,
        playtime_2weeks: sampleGame.playtime_2weeks,
        rtime_last_played: sampleGame.rtime_last_played,
      });
    }

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
        const isFollowed = game.isFollowed === true;
        return followFilter === 'followed' ? isFollowed : !isFollowed;
      });
    }

    // Appliquer le tri
    console.log(`Tri en cours avec l'option: ${sortOption}`);
    switch (sortOption) {
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recentlyUpdated':
        filtered.sort((a, b) => {
          const timestampA = a.lastUpdateTimestamp || 0;
          const timestampB = b.lastUpdateTimestamp || 0;
          return timestampB - timestampA; // Du plus récent au plus ancien
        });
        break;
      case 'mostPlayed':
        filtered.sort((a, b) => {
          const playtimeA = a.playtime_forever || 0;
          const playtimeB = b.playtime_forever || 0;
          return playtimeB - playtimeA;
        });
        break;
      case 'recent':
        // Essayer d'abord de trier par playtime_2weeks (jeux joués dans les 2 dernières semaines)
        // Sinon, trier par rtime_last_played (horodatage de la dernière session de jeu)
        filtered.sort((a, b) => {
          // Priorité aux jeux joués récemment (2 dernières semaines)
          const recentA = a.playtime_2weeks || 0;
          const recentB = b.playtime_2weeks || 0;

          if (recentA > 0 || recentB > 0) {
            return recentB - recentA;
          }

          // Si pas de données récentes, utiliser rtime_last_played
          const lastPlayedA = a.rtime_last_played || 0;
          const lastPlayedB = b.rtime_last_played || 0;
          return lastPlayedB - lastPlayedA;
        });
        break;
      case 'default':
      default:
        // Par défaut, ne change pas l'ordre ou utilise l'ordre dans lequel Steam renvoie les jeux
        // On peut aussi utiliser un tri par nom si on préfère
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    console.log(`${filtered.length} jeux après filtrage et tri`);
    setFilteredGames(filtered);
  };

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

      setSteamId(savedSteamId);

      try {
        // Récupérer les informations de l'utilisateur
        const userResponse = await userService.getUser(savedSteamId);
        setUser(userResponse.data);

        // Vérifier si nous pouvons utiliser getAllUserGames ou si nous devons revenir à getUserGames
        let gamesResponse;
        try {
          // D'abord, essayer avec getAllUserGames (nouvelle méthode)
          gamesResponse = await steamService.getAllUserGames(savedSteamId);
          console.log('Réponse de getAllUserGames:', gamesResponse.data);
        } catch (allGamesError) {
          // En cas d'erreur, revenir à getUserGames (ancienne méthode)
          console.warn(
            'Erreur avec getAllUserGames, utilisation de getUserGames:',
            allGamesError,
          );
          gamesResponse = await steamService.getUserGames(savedSteamId);
          console.log('Réponse de getUserGames:', gamesResponse.data);
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
          console.log(
            `Structure alternative détectée. ${newGames.length} jeux reçus.`,
          );
        }

        // Vérifier les données de tri disponibles
        if (newGames.length > 0) {
          const jeuAvecLastPlayed = newGames.filter(
            g => g.rtime_last_played > 0,
          ).length;
          const jeuAvecPlaytime2Weeks = newGames.filter(
            g => g.playtime_2weeks > 0,
          ).length;
          const jeuAvecPlaytime = newGames.filter(
            g => g.playtime_forever > 0,
          ).length;
          const jeuAvecTimestamp = newGames.filter(
            g => g.lastUpdateTimestamp > 0,
          ).length;

          console.log('[DIAGNOSTIC TRI] Propriétés disponibles :');
          console.log(
            `- rtime_last_played : ${jeuAvecLastPlayed}/${newGames.length} jeux`,
          );
          console.log(
            `- playtime_2weeks : ${jeuAvecPlaytime2Weeks}/${newGames.length} jeux`,
          );
          console.log(
            `- playtime_forever : ${jeuAvecPlaytime}/${newGames.length} jeux`,
          );
          console.log(
            `- lastUpdateTimestamp : ${jeuAvecTimestamp}/${newGames.length} jeux`,
          );

          // Ajout de lastUpdateTimestamp pour tous les jeux qui n'en ont pas
          newGames.forEach(game => {
            if (!game.lastUpdateTimestamp) {
              game.lastUpdateTimestamp = game.rtime_last_played || 0;
            }
          });
        }

        // Traiter et afficher les statistiques
        if (Array.isArray(newGames) && newGames.length > 0) {
          console.log(`${newGames.length} jeux récupérés au total`);

          if (gamesResponse.data.apiGamesCount) {
            console.log(
              `Détails: ${
                gamesResponse.data.apiGamesCount || 0
              } jeux de l'API Steam, ${
                gamesResponse.data.databaseOnlyCount || 0
              } jeux uniquement en base de données`,
            );
          }

          console.log('Exemples de jeux:', newGames.slice(0, 3));
        } else {
          console.log('Aucun jeu récupéré ou format de réponse inattendu');
        }

        // Enfin, mettre à jour l'état des jeux et arrêter le chargement
        setGames(Array.isArray(newGames) ? newGames : []);
        if (!isFullCheck) {
          setLoading(false);
        }
      } catch (apiError) {
        console.error('Erreur API lors du chargement des données:', apiError);
        setLoading(false);

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

      await AsyncStorage.setItem('lastVerificationDate', Date.now().toString());
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);

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
      const savedVerificationDate = await AsyncStorage.getItem(
        'lastVerificationDate',
      );

      if (savedVerificationDate) {
        const lastDate = parseInt(savedVerificationDate, 10);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (now - lastDate > oneDayMs) {
          console.log("Plus d'un jour s'est écoulé, vérification complète...");
          loadData(true);
        } else if (Date.now() - lastRefreshTime > 300000) {
          checkForNewGames();
        }
      } else {
        await AsyncStorage.setItem(
          'lastVerificationDate',
          Date.now().toString(),
        );
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la date:', error);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
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
  const handleFollowGame = async (appId, isFollowed) => {
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

      // Trouver le jeu dans la liste
      const game = games.find(g => {
        const gameId = (g.appid || g.appId || '').toString();
        return gameId === appIdString;
      });

      if (!game) {
        console.error('Jeu non trouvé dans la liste:', appIdString);
        console.log('=== Fin handleFollowGame (erreur) ===');
        return;
      }

      console.log('Jeu trouvé:', game.name);

      // Mettre à jour l'état localement d'abord pour une UI réactive
      const updatedGames = games.map(g => {
        const gameId = (g.appid || g.appId || '').toString();
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
            game.name,
            game.img_icon_url
              ? `http://media.steampowered.com/steamcommunity/public/images/apps/${appIdString}/${game.img_icon_url}.jpg`
              : null,
          );
          console.log('Jeu suivi avec succès:', game.name);
        } else {
          // Ne plus suivre le jeu
          await userService.unfollowGame(steamId, appIdString);
          console.log('Jeu retiré des suivis:', game.name);
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
      const gamesResponse = await steamService.getAllUserGames(steamId);
      const newGames = gamesResponse.data.games || [];

      if (!Array.isArray(newGames)) {
        console.log('Format de réponse inattendu:', gamesResponse.data);
        return;
      }

      console.log(
        `Jeux récupérés: ${newGames.length} jeux au total (API: ${gamesResponse.data.apiGamesCount}, DB uniquement: ${gamesResponse.data.databaseOnlyCount})`,
      );

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
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des nouveaux jeux:', error);
    }
  };

  // Vérifier si un jeu a été mis à jour récemment (dans les dernières 24 heures)
  const isRecentlyUpdated = timestamp => {
    if (!timestamp) return false;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return now - timestamp < oneDayMs;
  };

  // Formater le temps de jeu
  const formatPlaytime = minutes => {
    if (!minutes) return '0 heure';

    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} minutes`;
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  };

  // Vérifier si un jeu est suivi
  const isGameFollowed = appId => {
    if (!user || !user.followedGames) return false;
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
    isLoadingMoreGames,
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
    formatPlaytime,
    isGameFollowed,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
