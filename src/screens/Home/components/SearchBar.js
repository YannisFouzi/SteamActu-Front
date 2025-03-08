import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';

const SearchBar = () => {
  const {
    searchQuery,
    setSearchQuery,
    setSortModalVisible,
    setFilterModalVisible,
    filterAndSortGames,
  } = useAppContext();

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
