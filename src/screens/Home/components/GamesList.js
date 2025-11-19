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
  const {filteredGames, refreshing, handleRefresh, searchQuery} =
    useAppContext();

  const renderEmptyList = () =>
    searchQuery && searchQuery.trim() !== '' ? (
      <NoResultsPlaceholder styles={styles} align="top" />
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
