import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import GameCard from '../../../components/GameCard';
import { COLORS } from '../../../constants';
import { steamService } from '../../../services/api';
import { getGameImageUrl, getGameImageFallback } from '../../../utils/steamHelpers';
import NoResultsPlaceholder from './NoResultsPlaceholder';
import SearchInput from './SearchInput';
import EmptyStateMessage from './EmptyStateMessage';
import { debugError } from '../../../hooks/hooksLogger';

const SearchGameTab = ({styles}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchGames = useCallback(
    async query => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setSearching(true);
      try {
        const response = await steamService.searchGames(query.trim(), 5);
        setSearchResults(response.data || []);
        setHasSearched(true);
      } catch (error) {
        debugError('Erreur recherche:', error);
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGames(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchGames]);

  const handleSearchChange = useCallback(text => {
    setSearchQuery(text);
    if (!text || text.trim() === '') {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, []);

  const renderGameItem = ({item}) => {
    const appId = item.appid.toString();
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
  };

  const renderSearchContent = () => {
    if (searching) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.STEAM_BLUE} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      );
    }

    if (!hasSearched) {
      return (
        <EmptyStateMessage
          styles={styles}
          iconName="search"
          title="Rechercher un jeu"
          text="Tapez au moins 2 caractères pour commencer"
          titleStyle={styles.emptyTitle}
          textStyle={styles.emptyText}
          align="top"
        />
      );
    }

    if (searchResults.length === 0) {
      return <NoResultsPlaceholder styles={styles} align="top" />;
    }

    return (
      <FlatList
        data={searchResults}
        renderItem={renderGameItem}
        keyExtractor={item => item.appid.toString()}
        contentContainerStyle={styles.searchResultsList}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <View style={styles.searchTabContainer}>
      <SearchInput
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Rechercher un jeu Steam..."
      />

      {renderSearchContent()}
    </View>
  );
};

export default SearchGameTab;

