import React, {useEffect} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {useDebounce} from '../../../hooks/useDebounce';
import styles from '../styles';

const SearchBar = () => {
  const {
    searchQuery,
    setSearchQuery,
    setSortModalVisible,
    setFilterModalVisible,
    filterAndSortGames,
  } = useAppContext();

  // Debouncer la recherche pour éviter les appels excessifs
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Appliquer le filtrage quand la recherche debouncée change
  useEffect(() => {
    console.log(
      '🔍 SearchBar useEffect déclenché - debouncedSearchQuery:',
      debouncedSearchQuery,
    );
    filterAndSortGames();
  }, [debouncedSearchQuery, filterAndSortGames]);

  // Gérer le changement de texte dans la recherche
  const handleSearchChange = text => {
    setSearchQuery(text);
    // Le filtrage sera appliqué automatiquement via useEffect + debounce
  };

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher un jeu..."
        placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
        value={searchQuery}
        onChangeText={handleSearchChange}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setFilterModalVisible(true)}>
          <Text style={styles.actionButtonText}>Filtrer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSortModalVisible(true)}>
          <Text style={styles.actionButtonText}>Trier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SearchBar;
