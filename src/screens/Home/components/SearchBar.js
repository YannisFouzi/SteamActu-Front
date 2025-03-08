import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';

const SearchBar = () => {
  const {searchQuery, setSearchQuery, setSortModalVisible} = useAppContext();

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher un jeu..."
        placeholderTextColor="#8F98A0"
        value={searchQuery}
        onChangeText={setSearchQuery}
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
