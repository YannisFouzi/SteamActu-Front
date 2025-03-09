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
    if (games.length > 0 || searchQuery) {
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [games, searchQuery, sortOption]);

  // Fonction pour charger les données
  const loadData = async (isFullCheck = false) => {
    try {
      if (!isFullCheck) {
        setLoading(true);
      }

      // Récupérer le SteamID stocké
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        // Éviter d'utiliser navigation si celui-ci n'est pas disponible
        if (navigation) {
          navigation.replace('Login');
        } else {
          console.log('Aucun steamId trouvé et pas de navigation disponible');
          setLoading(false);
          return; // Sortir de la fonction sans erreur
        }
        return;
      }

      setSteamId(savedSteamId);

      // Récupérer les informations de l'utilisateur
      const userResponse = await userService.getUser(savedSteamId);
      setUser(userResponse.data);

      // Récupérer les jeux de l'utilisateur
      const gamesResponse = await steamService.getUserGames(savedSteamId);
      const newGames = gamesResponse.data;

      console.log('Jeux récupérés:', newGames.slice(0, 3));
      setGames(newGames);

      if (!isFullCheck) {
        setLoading(false);
      }

      await AsyncStorage.setItem('lastVerificationDate', Date.now().toString());
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);

      // Ne pas afficher d'alerte si nous sommes déjà sur la page de login
      // ou si nous n'avons pas encore d'ID Steam
      const currentSteamId = await AsyncStorage.getItem('steamId');
      if (currentSteamId) {
        Alert.alert(
          'Erreur',
          'Impossible de charger vos jeux. Veuillez vérifier votre connexion et réessayer.',
        );
      }
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

  // Fonction pour suivre ou ne plus suivre un jeu
  const followGame = async game => {
    try {
      if (!steamId || !user) return;

      const isFollowed = user.followedGames?.some(g => g.appId === game.appId);

      let updatedGames = [];

      if (isFollowed) {
        updatedGames = user.followedGames.filter(g => g.appId !== game.appId);
      } else {
        updatedGames = [
          ...(user.followedGames || []),
          {
            appId: game.appId,
            name: game.name,
            logoUrl: game.logoUrl,
          },
        ];
      }

      const response = await userService.updateGames(steamId, updatedGames);
      setUser(response.data);

      Alert.alert(
        'Succès',
        isFollowed
          ? `Vous ne suivez plus les actualités de ${game.name}`
          : `Vous suivez maintenant les actualités de ${game.name}`,
      );
    } catch (error) {
      console.error('Erreur lors du suivi du jeu:', error);
      Alert.alert(
        'Erreur',
        'Impossible de mettre à jour vos préférences. Veuillez réessayer.',
      );
    }
  };

  // Fonction pour vérifier les nouveaux jeux
  const checkForNewGames = async () => {
    try {
      if (!steamId) return;

      console.log('Vérification des nouveaux jeux pour', steamId);
      const gamesResponse = await steamService.getUserGames(steamId);
      const newGames = gamesResponse.data;

      if (newGames.length > games.length) {
        console.log(
          `${newGames.length - games.length} nouveaux jeux détectés!`,
        );

        const currentAppIds = games.map(game => game.appId);
        const addedGames = newGames.filter(
          game => !currentAppIds.includes(game.appId),
        );

        if (addedGames.length > 0) {
          Alert.alert(
            'Nouveaux jeux détectés',
            `${addedGames.length} nouveau(x) jeu(x) ont été ajoutés à votre bibliothèque.`,
            [{text: 'OK'}],
          );
        }

        setGames(newGames);
      }

      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Erreur lors de la vérification des nouveaux jeux:', error);
    }
  };

  // Fonction pour déterminer si un jeu a été mis à jour récemment
  const isRecentlyUpdated = game => {
    if (!game.lastUpdateTimestamp || game.lastUpdateTimestamp === 0)
      return false;

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return now - game.lastUpdateTimestamp < sevenDaysMs;
  };

  // Fonction pour filtrer et trier les jeux
  const filterAndSortGames = (optionOverride = null, filterOverride = null) => {
    console.log('=== DÉBUT DE TRI ET FILTRAGE DES JEUX ===');
    // Utiliser les options passées en paramètre ou les options enregistrées dans l'état
    const optionToUse = optionOverride || sortOption;
    const filterToUse = filterOverride || followFilter;
    console.log(`Option de tri actuelle: "${optionToUse}"`);
    console.log(`Option de filtre actuelle: "${filterToUse}"`);

    let result = [...games];

    // Filtrer par recherche
    if (searchQuery) {
      result = result.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Filtrer par suivi
    if (filterToUse !== 'all') {
      result = result.filter(game => {
        const followed = isGameFollowed(game.appId);
        return filterToUse === 'followed' ? followed : !followed;
      });
    }

    // Trier selon l'option choisie
    switch (optionToUse) {
      case 'recent':
        console.log('Tri par temps de jeu récent activé');
        result.sort(
          (a, b) => (b.playtime.recent || 0) - (a.playtime.recent || 0),
        );
        break;
      case 'mostPlayed':
        console.log('Tri par temps de jeu total activé');
        result.sort((a, b) => b.playtime.forever - a.playtime.forever);
        break;
      case 'recentlyUpdated':
        console.log('Tri par mise à jour récente activé');

        result.sort((a, b) => {
          if (
            (!a.lastUpdateTimestamp || a.lastUpdateTimestamp === 0) &&
            (!b.lastUpdateTimestamp || b.lastUpdateTimestamp === 0)
          ) {
            return a.name.localeCompare(b.name);
          }

          if (!a.lastUpdateTimestamp || a.lastUpdateTimestamp === 0) return 1;
          if (!b.lastUpdateTimestamp || b.lastUpdateTimestamp === 0) return -1;

          return b.lastUpdateTimestamp - a.lastUpdateTimestamp;
        });
        break;
      case 'default':
      default:
        console.log('Tri par défaut (ordre alphabétique) activé');
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    console.log('=== FIN DE TRI ET FILTRAGE DES JEUX ===');
    setFilteredGames(result);
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
    followGame,
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
