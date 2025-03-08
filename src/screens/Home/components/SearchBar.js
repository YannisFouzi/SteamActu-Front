import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';

const SearchBar = () => {
  const {searchQuery, setSearchQuery, setSortModalVisible, filterAndSortGames} =
    useAppContext();

  // Gérer le changement de texte dans la recherche
  const handleSearchChange = text => {
    setSearchQuery(text);
    filterAndSortGames(); // Appliquer immédiatement le filtrage
  };

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher un jeu..."
        placeholderTextColor="#8F98A0"
        value={searchQuery}
        onChangeText={handleSearchChange}
      />
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setSortModalVisible(true)}>
        <Text style={styles.sortButtonText}>Trier</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SearchBar;
