import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../constants';
import styles from '../styles';

/**
 * Barre de recherche réutilisable.
 * @param {string} value - Valeur contrôlée
 * @param {function} onChangeText - (text) => void
 * @param {string} [placeholder] - Texte du placeholder
 */
const SearchInput = ({ value, onChangeText, placeholder = 'Rechercher...' }) => {
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
          placeholder={placeholder}
          placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value && value.length > 0 && (
          <TouchableOpacity
            style={styles.searchClearButton}
            onPress={() => onChangeText('')}>
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

export default SearchInput;
