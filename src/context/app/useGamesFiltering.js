import {useCallback, useEffect, useState} from 'react';
import {useAsyncStorage} from '../../hooks/useAsyncStorage';
import {debugLog} from '../../hooks/hooksLogger';
import {
  getLastPlayedValue,
  getPlaytimeForeverValue,
  getPlaytimeRecentValue,
} from '../../utils';

export const useGamesFiltering = games => {
  const [filteredGames, setFilteredGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useAsyncStorage('sortOption', 'default');

  const filterAndSortGames = useCallback(() => {
    debugLog(
      'filterAndSortGames appelee - searchQuery:',
      searchQuery,
      'games count:',
      games?.length,
    );

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
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    filterAndSortGames,
  };
};
