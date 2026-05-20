import React from 'react';
import {FlatList, RefreshControl} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../../../constants';
import {useAppContext} from '../../../context/AppContext';
import {
  getGameAppId,
  getLastPlayedValue,
  getPlaytimeForeverValue,
  getPlaytimeRecentValue,
} from '../../../utils';
import styles from '../styles';
import EmptyStateMessage from './EmptyStateMessage';
import GameItemAlt from './GameItemAlt';

const GamesList = React.memo(({listRef}) => {
  const {t} = useTranslation();
  const {
    filteredGames,
    games,
    refreshing,
    handleRefresh,
    sortOption,
  } = useAppContext();

  const hasLibraryGames = Array.isArray(games) && games.length > 0;
  const hasTotalPlaytime =
    hasLibraryGames && games.some(game => getPlaytimeForeverValue(game) > 0);
  const hasPlaytimeData =
    hasLibraryGames &&
    games.some(
      game =>
        game?.hasPlaytimeData === true ||
        getPlaytimeForeverValue(game) > 0 ||
        getPlaytimeRecentValue(game) > 0 ||
        getLastPlayedValue(game) > 0,
    );

  const renderPlaytimePrivateEmpty = () => (
    <EmptyStateMessage
      styles={styles}
      iconName="time-outline"
      title={t('games.playtimePrivateTitle')}
      text={t('games.playtimePrivateShortText')}
      instructions={[t('games.privacyPlaytimeStep')]}
    />
  );

  const renderEmptyList = () => {
    if (sortOption === 'lastTwoWeeks' || sortOption === 'recentsPlus') {
      if (!hasPlaytimeData) {
        return renderPlaytimePrivateEmpty();
      }

      return (
        <EmptyStateMessage
          styles={styles}
          iconName="time-outline"
          title={t('games.lastTwoWeeksEmptyTitle')}
          text={t('games.lastTwoWeeksEmptyText')}
        />
      );
    }

    if (sortOption === 'mostPlayed') {
      if (!hasPlaytimeData) {
        return renderPlaytimePrivateEmpty();
      }

      if (!hasTotalPlaytime) {
        return (
          <EmptyStateMessage
            styles={styles}
            iconName="time-outline"
            title={t('games.noPlaytimeTitle')}
            text={t('games.noPlaytimeText')}
          />
        );
      }
    }

    return null;
  };

  return (
    <FlatList
      ref={listRef}
      data={filteredGames}
      renderItem={({item}) => <GameItemAlt game={item} />}
      keyExtractor={(item, index) => {
        const appId = getGameAppId(item);
        return appId ? `${appId}-${index}` : `game-${index}`;
      }}
      contentContainerStyle={styles.gamesList}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.STEAM_BLUE]}
          tintColor={COLORS.STEAM_BLUE}
        />
      }
      ListEmptyComponent={renderEmptyList}
    />
  );
});

GamesList.displayName = 'GamesList';

export default GamesList;
