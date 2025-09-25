import React from 'react';
import {FlatList, RefreshControl, Text, View} from 'react-native';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {getGameAppId} from '../../../utils/gameHelpers';
import styles from '../styles';
import GameItemAlt from './GameItemAlt';

const GamesList = () => {
  const {filteredGames, refreshing, handleRefresh} = useAppContext();

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        Aucun jeu trouvé. Essayez de modifier vos critères de recherche.
      </Text>
    </View>
  );

  return (
    <FlatList
      data={filteredGames}
      renderItem={({item}) => <GameItemAlt game={item} />}
      keyExtractor={(item, index) => {
        const appId = getGameAppId(item);
        return appId ? `${appId}-${index}` : `game-${index}`;
      }}
      contentContainerStyle={styles.gamesList}
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
};

export default GamesList;
