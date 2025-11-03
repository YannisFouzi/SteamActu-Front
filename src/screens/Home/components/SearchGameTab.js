import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {steamService} from '../../../services/api';

const SearchGameTab = ({styles}) => {
  const {handleFollowGame, isGameFollowed} = useAppContext();

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
        console.error('Erreur recherche:', error);
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
    const isFollowed = isGameFollowed(appId);

    return (
      <View style={styles.wishlistCardHorizontal}>
        <Image
          source={{uri: item.header_image}}
          style={styles.wishlistImageHorizontal}
          resizeMode="cover"
        />
        <View style={styles.wishlistInfoHorizontal}>
          <Text style={styles.wishlistNameHorizontal} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.wishlistFollowButton}
          onPress={() => {
            handleFollowGame(appId, isFollowed, {
              name: item.name,
              logoUrl: item.header_image,
            });
          }}>
          <Icon
            name={isFollowed ? 'notifications' : 'notifications-outline'}
            size={24}
            color={isFollowed ? '#4CAF50' : '#757575'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.searchTabContainer}>
      <View style={styles.searchInputContainer}>
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
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setHasSearched(false);
            }}>
            <Icon name="close-circle" size={20} color={COLORS.STEAM_TEXT_GRAY} />
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.STEAM_BLUE} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.centerContainer}>
          <Icon
            name="search"
            size={64}
            color={COLORS.STEAM_TEXT_GRAY}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Rechercher un jeu</Text>
          <Text style={styles.emptyText}>
            Tapez au moins 2 caractères pour commencer
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon
            name="sad-outline"
            size={64}
            color={COLORS.STEAM_TEXT_GRAY}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>
            Essayez avec d'autres mots-clés
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderGameItem}
          keyExtractor={item => item.appid.toString()}
          contentContainerStyle={styles.searchResultsList}
        />
      )}
    </View>
  );
};

export default SearchGameTab;
