import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { COLORS } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { getGameAppId } from '../../../utils';
import styles from '../styles';
import EmptyStateMessage from './EmptyStateMessage';
import GameItemAlt from './GameItemAlt';
import NoResultsPlaceholder from './NoResultsPlaceholder';

const GamesList = React.memo(({listRef}) => {
  const {filteredGames, refreshing, handleRefresh, searchQuery, sortOption} =
    useAppContext();

  const renderEmptyList = () =>
    searchQuery && searchQuery.trim() !== '' ? (
      <NoResultsPlaceholder styles={styles} align="top" />
    ) : sortOption === 'recentsPlus' ? (
      <EmptyStateMessage
        styles={styles}
        iconName="time-outline"
        title="Aucun jeu recent"
        text="Aucun jeu lance recemment selon les donnees synchronisees."
        align="top"
      />
    ) : sortOption === 'lastTwoWeeks' ? (
      <EmptyStateMessage
        styles={styles}
        iconName="calendar-outline"
        title="Aucun jeu sur 2 semaines"
        text="Aucun jeu n'a ete lance dans les 14 derniers jours."
        align="top"
      />
    ) : (
      <EmptyStateMessage
        styles={styles}
        iconName="sad-outline"
        title="Aucun jeu disponible"
        text="Aucun jeu de votre bibliothèque n'a été importé pour le moment."
        align="top"
      />
    );

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
