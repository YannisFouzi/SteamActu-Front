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
          }
          return;
        }

        setSteamId(savedSteamId);

        try {
          // Récupérer les informations de l'utilisateur
          const userResponse = await userService.getUser(savedSteamId);
          setUser(userResponse.data);

          // Essayer d'abord avec getAllUserGames
          let gamesResponse;
          let newGamesData;

          try {
            gamesResponse = await steamService.getAllUserGames(savedSteamId);
            newGamesData = gamesResponse.data;
            console.log('Méthode getAllUserGames utilisée avec succès');
          } catch (e) {
            console.warn(
              'Erreur avec getAllUserGames, utilisation de getUserGames alternative:',
              e,
            );
            gamesResponse = await steamService.getUserGames(savedSteamId);
            newGamesData = gamesResponse.data;
            console.log('Méthode getUserGames utilisée comme fallback');
          }

          // Normaliser la structure des données reçues
          let gamesList = [];

          if (newGamesData && Array.isArray(newGamesData.games)) {
            // Structure standard {games: [...]}
            gamesList = newGamesData.games;
            console.log('Structure standard détectée');
          } else if (Array.isArray(newGamesData)) {
            // Array direct [...]
            gamesList = newGamesData;
            console.log('Structure array directe détectée');
          } else if (newGamesData && typeof newGamesData === 'object') {
            // Objet avec propriétés inconnues
            if (newGamesData.games) {
              gamesList = Array.isArray(newGamesData.games)
                ? newGamesData.games
                : [];
            } else {
              // Tenter d'extraire des jeux de l'objet
              console.warn(
                "Structure non reconnue, tentative d'extraction:",
                newGamesData,
              );
              gamesList = [];
            }
          }

          console.log(`${gamesList.length} jeux récupérés au total`);

          if (gamesList.length > 0) {
            console.log('Exemples de jeux:', gamesList.slice(0, 3));

            // Assurer que tous les jeux ont une propriété lastUpdateTimestamp
            const gamesWithTimestamp = gamesList.filter(
              game => game.lastUpdateTimestamp,
            );
            console.log(
              `Nombre de jeux avec timestamp: ${gamesWithTimestamp.length}`,
            );

            // Si besoin, ajouter timestamp aux jeux
            if (gamesWithTimestamp.length === 0) {
              console.log('Ajout de timestamps par défaut aux jeux');
              gamesList.forEach(game => {
                game.lastUpdateTimestamp = 0;
              });
            }
          } else {
            console.warn("Aucun jeu n'a été récupéré!");
          }

          // Mettre à jour la liste de jeux et arrêter le chargement
          setGames(gamesList);
          setLoading(false);

          await AsyncStorage.setItem(
            'lastVerificationDate',
            Date.now().toString(),
          );
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
                  onPress: async () => {
                    // Déconnexion forcée
                    await AsyncStorage.removeItem('steamId');
                    if (navigation) {
                      navigation.navigate('Login');
                    }
                  },
                },
              ],
            );
            return;
          }

          // Autres erreurs
          Alert.alert(
            'Erreur de connexion',
            'Impossible de récupérer vos données. Veuillez vérifier votre connexion et réessayer.',
          );
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setLoading(false);

        // Proposer à l'utilisateur de se déconnecter
        Alert.alert(
          'Erreur',
          "Une erreur inattendue s'est produite. Voulez-vous revenir à l'écran de connexion?",
          [
            {
              text: 'Réessayer',
              onPress: () => loadData(isFullCheck),
            },
            {
              text: 'Se déconnecter',
              style: 'destructive',
              onPress: async () => {
                await AsyncStorage.removeItem('steamId');
                if (navigation) {
                  navigation.navigate('Login');
                }
              },
            },
          ],
        );
      }
    },
    [steamId, navigation, setSteamId, setUser, setGames, setLoading],
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

      // Essayer d'utiliser la nouvelle méthode, et se rabattre sur l'ancienne en cas d'erreur
      let gamesResponse;
      let newGamesData;

      try {
        gamesResponse = await steamService.getAllUserGames(steamId);
        newGamesData = gamesResponse.data;
        console.log(
          'Utilisation réussie de getAllUserGames pour la vérification',
        );
      } catch (e) {
        console.warn(
          'Erreur avec getAllUserGames, utilisation de getUserGames alternative:',
          e,
        );
        gamesResponse = await steamService.getUserGames(steamId);
        newGamesData = gamesResponse.data;
        console.log(
          'Utilisation de getUserGames comme fallback pour la vérification',
        );
      }

      // Normaliser la structure pour extraire la liste des jeux
      let newGames = [];

      if (newGamesData && Array.isArray(newGamesData.games)) {
        newGames = newGamesData.games;
      } else if (Array.isArray(newGamesData)) {
        newGames = newGamesData;
      } else if (newGamesData && typeof newGamesData === 'object') {
        if (newGamesData.games) {
          newGames = Array.isArray(newGamesData.games)
            ? newGamesData.games
            : [];
        }
      }

      console.log(`${newGames.length} jeux récupérés pour vérification`);

      if (newGamesData.apiGamesCount) {
        console.log(
          `Détails: API: ${newGamesData.apiGamesCount}, DB uniquement: ${newGamesData.databaseOnlyCount}`,
        );
      }

      // Comparer avec les jeux actuels pour voir s'il y a des nouveautés
      const currentGameCount = games.length;
      if (newGames.length > currentGameCount) {
        console.log(
          `${newGames.length - currentGameCount} nouveaux jeux détectés!`,
        );

        // Trouver les nouveaux jeux
        // Note: Ceci est une approche simplifiée. Pour être plus précis,
        // il faudrait comparer par appId plutôt que par longueur.
        setGames(newGames);

        // Notifier l'utilisateur
        Alert.alert(
          'Nouveaux jeux détectés',
          `${
            newGames.length - currentGameCount
          } nouveaux jeux ont été ajoutés à votre bibliothèque.`,
        );

        return true;
      }

      console.log('Aucun nouveau jeu détecté');
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des nouveaux jeux:', error);
      return false;
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
