import React from 'react';
import { View } from 'react-native';
import NewsTab from './Home/components/NewsTab';
import styles from './Home/styles';

const NewsFeedScreen = ({
  steamId,
  newsState,
  fetchNews,
  onToggleFavoritesFilter,
  onToggleNewsFavorite,
}) => {
  const activeState = newsState?.news || {};
  return (
    <View style={styles.container}>
      <NewsTab
        steamId={steamId}
        newsState={newsState}
        fetchNews={fetchNews}
        favoritesOnly={Boolean(activeState.favoritesOnly)}
        hasFavorites={Boolean(activeState.hasFavorites)}
        onToggleFavoritesFilter={onToggleFavoritesFilter}
        onToggleFavorite={onToggleNewsFavorite}
      />
    </View>
  );
};

export default NewsFeedScreen;
