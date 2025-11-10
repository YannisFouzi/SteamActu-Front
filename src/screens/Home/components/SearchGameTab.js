import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import GameCard from '../../../components/GameCard';
import { COLORS } from '../../../constants';
import { steamService } from '../../../services/api';
import NoResultsPlaceholder from './NoResultsPlaceholder';
import EmptyStateMessage from './EmptyStateMessage';

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

  const renderGameItem = ({item}) => {
    const appId = item.appid.toString();
    return (
      <GameCard
        game={{name: item.name}}
        imageUrl={item.header_image}
        followConfig={{
          appId,
          name: item.name,
          imageUrl: item.header_image,
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
      />
    );
  };

  return (
    <View style={styles.searchTabContainer}>
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Icon
            name="search"
            size={20}
            color={COLORS.STEAM_TEXT_GRAY}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un jeu Steam..."
            placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClearButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setHasSearched(false);
              }}>
              <Icon
                name="close-circle"
                size={20}
                color={COLORS.STEAM_TEXT_GRAY}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderSearchContent()}
    </View>
  );
};

export default SearchGameTab;

