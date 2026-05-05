import React, {useCallback} from 'react';
import {ActivityIndicator, FlatList, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import GameCard from '../../../components/GameCard';
import {COLORS} from '../../../constants';
import {useStoreSearch} from '../../../hooks/useStoreSearch';
import {
  getGameImageFallback,
  getGameImageUrl,
} from '../../../utils/steamHelpers';

/**
 * Composant self-contained pour afficher les resultats de recherche store Steam.
 * Owns le hook useStoreSearch (un seul fetch par query, debounce + cancel inflight).
 */
const StoreSearchResults = ({
  query,
  loadingComponent,
  emptyComponent = null,
  contentContainerStyle,
  scrollEnabled = true,
  ListHeaderComponent,
}) => {
  const {t} = useTranslation();
  const {results, loading, hasSearched} = useStoreSearch(query);

  const renderItem = useCallback(({item}) => {
    const appId = item.appid?.toString();
    const imageUrl = getGameImageUrl(item);
    const fallbackImageUrl = getGameImageFallback(item);
    return (
      <GameCard
        game={{name: item.name}}
        imageUrl={imageUrl}
        fallbackImageUrl={fallbackImageUrl}
        followConfig={{
          appId,
          name: item.name,
          imageUrl,
        }}
      />
    );
  }, []);

  const keyExtractor = useCallback(item => item.appid.toString(), []);

  if (loading) {
    if (loadingComponent !== undefined) {
      return loadingComponent;
    }
    return (
      <View style={defaultStyles.centerContainer}>
        <ActivityIndicator size="small" color={COLORS.STEAM_BLUE} />
        <Text style={defaultStyles.loadingText}>{t('search.loading')}</Text>
      </View>
    );
  }

  if (!hasSearched || results.length === 0) {
    return emptyComponent;
  }

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
};

const defaultStyles = {
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 12,
  },
};

export default StoreSearchResults;
