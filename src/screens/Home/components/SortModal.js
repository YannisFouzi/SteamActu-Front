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

    // Mettre à jour l'option de tri dans l'état
    setSortOption(option);

    // Appliquer immédiatement le tri avec la nouvelle option
    filterAndSortGames(option);

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
