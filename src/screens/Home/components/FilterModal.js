import React from 'react';
import {Modal, Text, TouchableOpacity, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';

const FilterModal = () => {
  const {
    filterModalVisible,
    setFilterModalVisible,
    followFilter,
    setFollowFilter,
    filterAndSortGames,
  } = useAppContext();

  // Fonction pour gérer le changement d'option de filtre
  const handleFilterChange = option => {
    console.log(`Option de filtre sélectionnée: ${option}`);

    // Mettre à jour l'option de filtre dans l'état
    setFollowFilter(option);

    // Appliquer immédiatement le filtrage avec la nouvelle option
    filterAndSortGames(null, option);

    // Fermer la modal
    setFilterModalVisible(false);
  };

  return (
    <Modal
      visible={filterModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setFilterModalVisible(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setFilterModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filtrer par</Text>

          <TouchableOpacity
            style={[
              styles.sortOption,
              followFilter === 'all' && styles.selectedSortOption,
            ]}
            onPress={() => handleFilterChange('all')}>
            <Text style={styles.sortOptionText}>Tous les jeux</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              followFilter === 'followed' && styles.selectedSortOption,
            ]}
            onPress={() => handleFilterChange('followed')}>
            <Text style={styles.sortOptionText}>Jeux suivis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              followFilter === 'unfollowed' && styles.selectedSortOption,
            ]}
            onPress={() => handleFilterChange('unfollowed')}>
            <Text style={styles.sortOptionText}>Jeux non suivis</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default FilterModal;
