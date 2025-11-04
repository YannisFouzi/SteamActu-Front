import React, {useEffect} from 'react';
import {TextInput, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {useDebounce} from '../../../hooks/useDebounce';
import styles from '../styles';

const SearchBar = () => {
  const {searchQuery, setSearchQuery, filterAndSortGames} = useAppContext();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    filterAndSortGames();
  }, [debouncedSearchQuery, filterAndSortGames]);

  const handleSearchChange = text => {
    setSearchQuery(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
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
          placeholder="Rechercher dans mes jeux..."
          placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchClearButton}
            onPress={handleClearSearch}>
            <Icon
              name="close-circle"
              size={20}
              color={COLORS.STEAM_TEXT_GRAY}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default SearchBar;
