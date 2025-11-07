import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {COLORS, CONTAINER_STYLES} from '../constants';

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
  onClose = () => {},
  title,
  options = [],
  selectedValue,
  onSelect,
}) => {
  const safeOptions = Array.isArray(options) ? options : [];
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleOptionSelect = value => {
    if (typeof onSelect === 'function') {
      onSelect(value);
    }
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          {safeOptions.length === 0 ? (
            <Text style={styles.emptyState}>
              Aucune option disponible pour le moment.
            </Text>
          ) : (
            safeOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  selectedValue === option.value && styles.selectedSortOption,
                ]}
                onPress={() => handleOptionSelect(option.value)}>
                <Text style={styles.sortOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))
          )}
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
  emptyState: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default OptionModal;
