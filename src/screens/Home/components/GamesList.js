import React from 'react';
import {FlatList, RefreshControl, Text, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';
import GameItem from './GameItem';

const GamesList = () => {
  const {filteredGames, refreshing, handleRefresh} = useAppContext();

  const renderEmptyList = () => (
    <View style={styles.emptyListContainer}>
      <Text style={styles.emptyListText}>
        Aucun jeu trouvé. Essayez de modifier vos critères de recherche.
      </Text>
    </View>
  );

  return (
    <FlatList
      data={filteredGames}
      renderItem={({item}) => <GameItem game={item} />}
      keyExtractor={(item, index) => `${item.appId}-${index}`}
      contentContainerStyle={styles.gamesList}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#66C0F4']}
          tintColor="#66C0F4"
        />
      }
      ListEmptyComponent={renderEmptyList}
    />
  );
};

export default GamesList;
