import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {COLORS, CONTAINER_STYLES} from '../../constants/theme';

/**
 * Composant modal générique pour les options (tri, filtre, etc.)
 * Évite la duplication entre SortModal et FilterModal
 *
 * @param {boolean} visible - Visibilité de la modal
 * @param {function} onClose - Fonction appelée à la fermeture
 * @param {string} title - Titre de la modal
 * @param {Array} options - Liste des options à afficher
 * @param {string} selectedValue - Valeur actuellement sélectionnée
 * @param {function} onSelect - Fonction appelée lors de la sélection
 */
const OptionModal = ({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}) => {
  // Fonction pour gérer la sélection d'une option
  const handleOptionSelect = value => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                selectedValue === option.value && styles.selectedSortOption,
              ]}
              onPress={() => handleOptionSelect(option.value)}>
              <Text style={styles.sortOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...CONTAINER_STYLES.modalOverlay,
  },
  modalContent: {
    ...CONTAINER_STYLES.modalContent,
  },
  modalTitle: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 3,
    marginBottom: 8,
  },
  sortOptionText: {
    color: COLORS.WHITE,
    fontSize: 16,
  },
  selectedSortOption: {
    backgroundColor: COLORS.STEAM_LIGHT_BLUE,
  },
});

export default OptionModal;
