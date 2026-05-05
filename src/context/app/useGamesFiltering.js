import {useCallback, useEffect, useState} from 'react';
import {
  getLastPlayedValue,
  getPlaytimeForeverValue,
  getPlaytimeRecentValue,
} from '../../utils';

/**
 * Filtre + trie la liste des jeux en fonction de la query de recherche
 * globale (passee en parametre) et de la sortOption locale.
 */
export const useGamesFiltering = (games, searchQuery = '') => {
  const [filteredGames, setFilteredGames] = useState([]);
  const [sortOption, setSortOption] = useState('lastTwoWeeks');

  const filterAndSortGames = useCallback(() => {
    if (!games || !Array.isArray(games)) {
      setFilteredGames([]);
      return;
    }

    let filtered = [...games];

    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(game =>
        game.name?.toLowerCase().includes(query),
      );
    }

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
  }, [games, searchQuery, sortOption]);

  useEffect(() => {
    if (games && Array.isArray(games) && (games.length > 0 || searchQuery)) {
      filterAndSortGames();
    } else {
      setFilteredGames([]);
    }
  }, [filterAndSortGames, games, searchQuery, sortOption]);

  return {
    filteredGames,
    sortOption,
    setSortOption,
    filterAndSortGames,
  };
};
