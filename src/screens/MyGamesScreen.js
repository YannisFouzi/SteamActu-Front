import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useMemo, useRef} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import LoadingContainer from '../components/LoadingContainer';
import {useAppContext} from '../context/AppContext';
import GamesList from './Home/components/GamesList';
import SortOptions from './Home/components/SortOptions';
import styles from './Home/styles';

const MyGamesScreen = () => {
  const {t} = useTranslation();
  const {
    loading: gamesLoading,
    sortOption,
    setSortOption,
    filterAndSortGames,
    maybeRefreshGames,
  } = useAppContext();
  const listRef = useRef(null);

  const sortOptions = useMemo(
    () => [
      {value: 'lastTwoWeeks', label: t('games.recentTwoWeeks')},
      {value: 'default', label: t('games.sortAZ')},
      {value: 'mostPlayed', label: t('games.topPlayed')},
    ],
    [t],
  );

  const handleMyGamesSortChange = useCallback(
    option => {
      setSortOption(option);
      filterAndSortGames();
      if (listRef.current) {
        listRef.current.scrollToOffset({offset: 0, animated: true});
      }
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
      <SortOptions
        options={sortOptions}
        selectedValue={sortOption}
        onSelect={handleMyGamesSortChange}
      />
      {gamesLoading ? (
        <LoadingContainer text={t('games.loadingGames')} />
      ) : (
        <GamesList listRef={listRef} />
      )}
    </View>
  );
};

export default MyGamesScreen;
