import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import LoadingContainer from '../components/LoadingContainer';
import { useAppContext } from '../context/AppContext';
import GamesList from './Home/components/GamesList';
import SearchBar from './Home/components/SearchBar';
import SortOptions from './Home/components/SortOptions';
import styles from './Home/styles';

const MY_GAMES_SORT_OPTIONS = [
  {value: 'default', label: 'A-Z'},
  {value: 'recent', label: 'Recents'},
  {value: 'mostPlayed', label: 'Plus joues'},
];

const MyGamesScreen = () => {
  const {
    loading: gamesLoading,
    sortOption,
    setSortOption,
    filterAndSortGames,
    maybeRefreshGames,
  } = useAppContext();

  const handleMyGamesSortChange = useCallback(
    option => {
      setSortOption(option);
      filterAndSortGames();
    },
    [filterAndSortGames, setSortOption],
  );

  useFocusEffect(
    useCallback(() => {
      maybeRefreshGames('myGamesScreen');
    }, [maybeRefreshGames]),
  );

  return (
    <View style={styles.container}>
      <SearchBar />
      <SortOptions
        options={MY_GAMES_SORT_OPTIONS}
        selectedValue={sortOption}
        onSelect={handleMyGamesSortChange}
      />
      {gamesLoading ? (
        <LoadingContainer text="Chargement des jeux..." />
      ) : (
        <GamesList />
      )}
    </View>
  );
};

export default MyGamesScreen;
