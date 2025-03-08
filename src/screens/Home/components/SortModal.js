import React from 'react';
import {Modal, Text, TouchableOpacity, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';

const SortModal = () => {
  const {
    sortModalVisible,
    setSortModalVisible,
    sortOption,
    setSortOption,
    filterAndSortGames,
  } = useAppContext();

  // Fonction pour gérer le changement d'option de tri
  const handleSortOptionChange = option => {
    console.log(`Option de tri sélectionnée: ${option}`);

    // Utiliser une fonction pour s'assurer que nous avons la valeur la plus récente
    setSortOption(currentOption => {
      console.log('Dans setSortOption - valeur actuelle:', currentOption);
      console.log('Dans setSortOption - nouvelle valeur:', option);
      return option;
    });

    // Forcer une mise à jour immédiate du tri
    setTimeout(() => {
      console.log(`Forcer un re-tri avec option ${option}`);
      filterAndSortGames();
    }, 100);

    // Fermer la modal
    setSortModalVisible(false);
  };

  return (
    <Modal
      visible={sortModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSortModalVisible(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setSortModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Trier par</Text>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'default' && styles.selectedSortOption,
            ]}
            onPress={() => handleSortOptionChange('default')}>
            <Text style={styles.sortOptionText}>Par défaut</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'recent' && styles.selectedSortOption,
            ]}
            onPress={() => handleSortOptionChange('recent')}>
            <Text style={styles.sortOptionText}>Joué récemment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'mostPlayed' && styles.selectedSortOption,
            ]}
            onPress={() => handleSortOptionChange('mostPlayed')}>
            <Text style={styles.sortOptionText}>Plus joué</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'recentlyUpdated' && styles.selectedSortOption,
            ]}
            onPress={() => handleSortOptionChange('recentlyUpdated')}>
            <Text style={styles.sortOptionText}>Mis à jour récemment</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default SortModal;
