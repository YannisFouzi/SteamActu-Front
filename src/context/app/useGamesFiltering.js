import {useCallback, useEffect, useState} from 'react';
import {
  getLastPlayedValue,
  getPlaytimeForeverValue,
  getPlaytimeRecentValue,
} from '../../utils';

/**
 * Trie la liste des jeux de l'onglet "Mes Jeux" selon la sortOption locale.
 *
 * NB : ce hook ne gere PAS la recherche. La recherche unifiee
 * (`UnifiedSearchView`) filtre la liste `games` brute elle-meme — elle ne doit
 * pas heriter des filtres temps de jeu appliques ici par `lastTwoWeeks` /
 * `mostPlayed` / `recentsPlus`, sinon un jeu possede mais pas joue recemment
 * disparaitrait des resultats de recherche.
 */
export const useGamesFiltering = games => {
  const [filteredGames, setFilteredGames] = useState([]);
  const [sortOption, setSortOption] = useState('lastTwoWeeks');

  const filterAndSortGames = useCallback(() => {
    if (!games || !Array.isArray(games)) {
      setFilteredGames([]);
      return;
    }

    let filtered = [...games];

    switch (sortOption) {
      case 'alphabetical':
      case 'default':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'mostPlayed':
        filtered = filtered.filter(game => getPlaytimeForeverValue(game) > 0);
        filtered.sort(
          (a, b) => getPlaytimeForeverValue(b) - getPlaytimeForeverValue(a),
        );
        break;
      case 'recent':
        filtered.sort((a, b) => getLastPlayedValue(b) - getLastPlayedValue(a));
        break;
      case 'lastTwoWeeks':
        filtered = filtered.filter(game => getPlaytimeRecentValue(game) > 0);
        filtered.sort((a, b) => {
          const recentDiff =
            getPlaytimeRecentValue(b) - getPlaytimeRecentValue(a);
          if (recentDiff !== 0) {
            return recentDiff;
          }

          const lastPlayedDiff = getLastPlayedValue(b) - getLastPlayedValue(a);
          if (lastPlayedDiff !== 0) {
            return lastPlayedDiff;
          }

          return a.name.localeCompare(b.name);
        });
        break;
      case 'recentsPlus':
        filtered = filtered.filter(game => {
          const recent = getPlaytimeRecentValue(game);
          const lastPlayed = getLastPlayedValue(game);
          return recent > 0 || lastPlayed > 0;
        });
        filtered.sort((a, b) => {
          const recentDiff =
            getPlaytimeRecentValue(b) - getPlaytimeRecentValue(a);
          if (recentDiff !== 0) {
            return recentDiff;
          }

          const lastPlayedDiff = getLastPlayedValue(b) - getLastPlayedValue(a);
          if (lastPlayedDiff !== 0) {
            return lastPlayedDiff;
          }

          const totalPlaytimeDiff =
            getPlaytimeForeverValue(b) - getPlaytimeForeverValue(a);
          if (totalPlaytimeDiff !== 0) {
            return totalPlaytimeDiff;
          }

          return a.name.localeCompare(b.name);
        });
        break;
      default:
        break;
    }

    setFilteredGames(filtered);
  }, [games, sortOption]);

  useEffect(() => {
    if (games && Array.isArray(games) && games.length > 0) {
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [filterAndSortGames, games, sortOption]);

  return {
    filteredGames,
    sortOption,
    setSortOption,
    filterAndSortGames,
  };
};
