import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback} from 'react';
import {Alert} from 'react-native';
import {steamService, userService} from '../../../services/api';

/**
 * Hook pour gérer la synchronisation des jeux avec le serveur
 * @param {string} steamId - ID Steam de l'utilisateur
 * @param {Function} setSteamId - Fonction pour mettre à jour l'ID Steam
 * @param {Function} setUser - Fonction pour mettre à jour les données utilisateur
 * @param {Function} setGames - Fonction pour mettre à jour la liste des jeux
 * @param {Function} setLoading - Fonction pour mettre à jour l'état de chargement
 * @param {Function} setRefreshing - Fonction pour mettre à jour l'état de rafraîchissement
 * @param {Object} navigation - Objet de navigation
 * @param {Array} games - Liste des jeux
 * @returns {Object} Fonctions pour gérer la synchronisation des jeux
 */
const useGameSync = ({
  steamId,
  setSteamId,
  setUser,
  setGames,
  setLoading,
  setRefreshing,
  navigation,
  games,
}) => {
  // Fonction pour charger les données
  const loadData = useCallback(
    async (isFullCheck = false) => {
      try {
        if (!isFullCheck) {
          setLoading(true);
        }

        // Récupérer le SteamID stocké
        const savedSteamId = await AsyncStorage.getItem('steamId');

        if (!savedSteamId) {
          // Si pas de SteamID, retourner à l'écran de connexion
          navigation.replace('Login');
          return;
        }

        setSteamId(savedSteamId);

        // Récupérer les informations de l'utilisateur
        const userResponse = await userService.getUser(savedSteamId);
        setUser(userResponse.data);

        // Récupérer les jeux de l'utilisateur
        const gamesResponse = await steamService.getUserGames(savedSteamId);
        const newGames = gamesResponse.data;

        // Ajouter des console.log pour débogage
        console.log(
          'Jeux récupérés avec leur timestamp:',
          newGames.slice(0, 3),
        );

        // Vérifier si les jeux ont la propriété lastUpdateTimestamp
        const gamesWithTimestamp = newGames.filter(
          game => game.lastUpdateTimestamp,
        );
        console.log(`Nombre total de jeux: ${newGames.length}`);
        console.log(
          `Nombre de jeux avec lastUpdateTimestamp: ${gamesWithTimestamp.length}`,
        );

        if (gamesWithTimestamp.length > 0) {
          console.log('Exemple de jeu avec timestamp:', {
            nom: gamesWithTimestamp[0].name,
            timestamp: gamesWithTimestamp[0].lastUpdateTimestamp,
            date: new Date(
              gamesWithTimestamp[0].lastUpdateTimestamp,
            ).toLocaleString(),
          });
        }

        setGames(newGames);

        if (!isFullCheck) {
          setLoading(false);
        }

        // Mettre à jour la date de dernière vérification
        await AsyncStorage.setItem(
          'lastVerificationDate',
          Date.now().toString(),
        );
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);

        if (!isFullCheck) {
          setLoading(false);
        }

        Alert.alert(
          'Erreur',
          'Impossible de charger vos jeux. Veuillez vérifier votre connexion et réessayer.',
        );
      }
    },
    [steamId, setSteamId, setUser, setGames, setLoading, navigation],
  );

  // Fonction pour rafraîchir les données
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, [loadData, setRefreshing]);

  // Fonction pour se déconnecter
  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('steamId');
      navigation.replace('Login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }, [navigation]);

  // Fonction pour suivre ou ne plus suivre un jeu
  const followGame = useCallback(
    async game => {
      try {
        if (!steamId || !user) return;

        const isFollowed = user.followedGames?.some(
          g => g.appId === game.appId,
        );

        // Mettre à jour la liste des jeux suivis
        let updatedGames = [];

        if (isFollowed) {
          // Retirer le jeu de la liste des jeux suivis
          updatedGames = user.followedGames.filter(g => g.appId !== game.appId);
        } else {
          // Ajouter le jeu à la liste des jeux suivis
          updatedGames = [
            ...(user.followedGames || []),
            {
              appId: game.appId,
              name: game.name,
              logoUrl: game.logoUrl,
            },
          ];
        }

        // Mettre à jour sur le serveur
        const response = await userService.updateGames(steamId, updatedGames);

        // Mettre à jour l'utilisateur localement
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
    },
    [steamId, user, setUser],
  );

  // Fonction pour vérifier les nouveaux jeux sans afficher l'indicateur de chargement
  const checkForNewGames = useCallback(async () => {
    try {
      if (!steamId) return;

      console.log('Vérification des nouveaux jeux pour', steamId);
      const gamesResponse = await steamService.getUserGames(steamId);
      const newGames = gamesResponse.data;

      // Comparer avec les jeux actuels pour voir s'il y a des nouveautés
      const currentGameCount = games.length;
      if (newGames.length > currentGameCount) {
        console.log(
          `${newGames.length - currentGameCount} nouveaux jeux détectés!`,
        );

        // Trouver les nouveaux jeux
        const currentAppIds = games.map(game => game.appId);
        const addedGames = newGames.filter(
          game => !currentAppIds.includes(game.appId),
        );

        // Notifier l'utilisateur des nouveaux jeux
        if (addedGames.length > 0) {
          Alert.alert(
            'Nouveaux jeux détectés',
            `${addedGames.length} nouveau(x) jeu(x) ont été ajoutés à votre bibliothèque.`,
            [{text: 'OK'}],
          );
        }

        // Mettre à jour la liste des jeux
        setGames(newGames);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des nouveaux jeux:', error);
    }
  }, [steamId, games, setGames]);

  return {
    loadData,
    handleRefresh,
    handleLogout,
    followGame,
    checkForNewGames,
  };
};

export default useGameSync;
