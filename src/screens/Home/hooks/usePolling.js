import {useEffect, useRef, useState} from 'react';
import {steamService} from '../../../services/api';

/**
 * Hook pour gérer le polling des mises à jour de jeux en arrière-plan
 * @param {string} steamId - ID Steam de l'utilisateur
 * @param {Array} games - Liste actuelle des jeux
 * @param {Function} setGames - Fonction pour mettre à jour la liste des jeux
 * @returns {Object} État et fonctions liés au polling
 */
const usePolling = (steamId, games, setGames) => {
  const [isLoadingMoreGames, setIsLoadingMoreGames] = useState(false);
  const [lastUpdatedGamesList, setLastUpdatedGamesList] = useState(Date.now());
  const pollingInterval = useRef(null);

  // Fonction pour récupérer uniquement les jeux avec les données mises à jour sans recharger toute la liste
  const pollForUpdatedGames = async () => {
    try {
      if (!steamId) return;

      const gamesResponse = await steamService.getUserGames(steamId);
      const newGames = gamesResponse.data;

      // Vérifier si le nombre de jeux avec timestamp a augmenté
      const newGamesWithTimestamp = newGames.filter(
        game => game.lastUpdateTimestamp > 0,
      );
      const currentGamesWithTimestamp = games.filter(
        game => game.lastUpdateTimestamp > 0,
      );

      if (newGamesWithTimestamp.length > currentGamesWithTimestamp.length) {
        console.log(
          `Mise à jour des jeux: ${
            newGamesWithTimestamp.length - currentGamesWithTimestamp.length
          } nouveaux jeux avec timestamp`,
        );
        setGames(newGames);
        setLastUpdatedGamesList(Date.now());
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des jeux:', error);
    }
  };

  // Démarrer le polling pour les mises à jour des jeux
  useEffect(() => {
    if (games.length > 0 && isLoadingMoreGames) {
      console.log('Démarrage du polling pour les jeux mis à jour');

      // Vérifier les mises à jour toutes les 10 secondes
      pollingInterval.current = setInterval(pollForUpdatedGames, 10000);

      // Arrêter le polling après 2 minutes (120 secondes)
      const timeoutId = setTimeout(() => {
        if (pollingInterval.current) {
          console.log('Arrêt du polling après 2 minutes');
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          setIsLoadingMoreGames(false);
        }
      }, 120000);

      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        clearTimeout(timeoutId);
      };
    }
  }, [games.length, isLoadingMoreGames, steamId]);

  // Vérifier si les jeux ont des timestamps et activer le polling si nécessaire
  useEffect(() => {
    if (games.length > 0) {
      const gamesWithTimestamp = games.filter(game => game.lastUpdateTimestamp);

      // Si nous n'avons pas encore tous les jeux avec timestamp, activer le polling
      if (
        gamesWithTimestamp.length < games.length &&
        gamesWithTimestamp.length > 0
      ) {
        console.log('Activation du polling pour obtenir plus de timestamps');
        setIsLoadingMoreGames(true);
      } else {
        setIsLoadingMoreGames(false);
      }
    }
  }, [games]);

  return {
    isLoadingMoreGames,
    lastUpdatedGamesList,
    pollForUpdatedGames,
  };
};

export default usePolling;
