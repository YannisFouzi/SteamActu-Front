import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useState} from 'react';

/**
 * Hook pour gérer le filtrage et le tri des jeux
 * @param {Array} games - Liste complète des jeux
 * @param {string} searchQuery - Requête de recherche
 * @returns {Object} Fonctions et états pour filtrer et trier les jeux
 */
const useGameFilter = (games, searchQuery) => {
  const [filteredGames, setFilteredGames] = useState([]);
  const [sortOption, setSortOption] = useState('default'); // default, recent, mostPlayed, recentlyUpdated

  // Persistance de l'option de tri
  useEffect(() => {
    // Récupérer l'option de tri sauvegardée
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
  }, []);

  // Sauvegarder l'option de tri lorsqu'elle change
  useEffect(() => {
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

    if (sortOption) {
      saveSortOption();
    }
  }, [sortOption]);

  // Fonction pour filtrer et trier les jeux
  const filterAndSortGames = useCallback(() => {
    console.log('=== DÉBUT DE TRI DES JEUX ===');
    console.log(`Option de tri actuelle: "${sortOption}"`);

    let result = [...games];

    // Filtrer par recherche
    if (searchQuery) {
      result = result.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Vérifier les timestamps de quelques jeux pour déboguer
    if (result.length > 0) {
      console.log('Échantillon de jeux avec leurs timestamps:');
      result.slice(0, 3).forEach(game => {
        console.log(
          `- ${game.name}: ${game.lastUpdateTimestamp || 'aucun'} (${
            game.lastUpdateTimestamp
              ? new Date(game.lastUpdateTimestamp).toLocaleString()
              : 'jamais'
          })`,
        );
      });
    }

    // Trier selon l'option choisie
    switch (sortOption) {
      case 'recent':
        console.log('Tri par temps de jeu récent activé');
        // Tri par temps de jeu récent (si disponible)
        result.sort(
          (a, b) => (b.playtime.recent || 0) - (a.playtime.recent || 0),
        );
        break;
      case 'mostPlayed':
        console.log('Tri par temps de jeu total activé');
        // Tri par temps de jeu total
        result.sort((a, b) => b.playtime.forever - a.playtime.forever);
        break;
      case 'recentlyUpdated':
        console.log('Tri par mise à jour récente activé');
        // Vérifier si nous avons des données lastUpdateTimestamp
        const gamesWithTimestamp = result.filter(
          game => game.lastUpdateTimestamp > 0,
        );
        console.log(
          `${gamesWithTimestamp.length} jeux sur ${result.length} ont un timestamp > 0`,
        );

        if (gamesWithTimestamp.length > 0) {
          console.log('Top 3 des jeux les plus récemment mis à jour:');
          gamesWithTimestamp
            .sort((a, b) => b.lastUpdateTimestamp - a.lastUpdateTimestamp)
            .slice(0, 3)
            .forEach(game => {
              console.log(
                `- ${game.name}: ${new Date(
                  game.lastUpdateTimestamp,
                ).toLocaleString()}`,
              );
            });
        }

        // Tri par mise à jour récente
        result.sort((a, b) => {
          // Si les deux jeux ont un timestamp de 0 ou undefined, trier par nom
          if (
            (!a.lastUpdateTimestamp || a.lastUpdateTimestamp === 0) &&
            (!b.lastUpdateTimestamp || b.lastUpdateTimestamp === 0)
          ) {
            return a.name.localeCompare(b.name);
          }

          // Si seulement a a un timestamp de 0 ou undefined, b doit venir en premier
          if (!a.lastUpdateTimestamp || a.lastUpdateTimestamp === 0) return 1;

          // Si seulement b a un timestamp de 0 ou undefined, a doit venir en premier
          if (!b.lastUpdateTimestamp || b.lastUpdateTimestamp === 0) return -1;

          // Sinon comparer les timestamps (du plus récent au plus ancien)
          return b.lastUpdateTimestamp - a.lastUpdateTimestamp;
        });
        break;
      case 'default':
      default:
        console.log('Tri par défaut (ordre alphabétique) activé');
        // Par défaut, trier par ordre alphabétique
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    // Vérifier le résultat du tri
    if (result.length > 0) {
      console.log('Premiers jeux après tri:');
      result.slice(0, 3).forEach(game => {
        console.log(`- ${game.name}`);
      });
    }
    console.log('=== FIN DE TRI DES JEUX ===');

    setFilteredGames(result);
  }, [games, searchQuery, sortOption]);

  // Filtrer/trier les jeux quand la liste ou les critères de recherche changent
  useEffect(() => {
    if (games.length > 0 || searchQuery) {
      console.log(
        `Mise à jour des jeux filtrés (${games.length} jeux, recherche: "${searchQuery}")`,
      );
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [games, searchQuery, filterAndSortGames]);

  return {
    filteredGames,
    sortOption,
    setSortOption,
    filterAndSortGames,
  };
};

export default useGameFilter;
