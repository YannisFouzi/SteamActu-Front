import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import styles from '../styles';

const SortOptions = ({options, selectedValue, onSelect}) => {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <View style={styles.sortOptionsContainer}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.sortOptionButton,
            selectedValue === option.value && styles.sortOptionButtonActive,
          ]}
          onPress={() => onSelect(option.value)}>
          <Text
            style={[
              styles.sortOptionText,
              selectedValue === option.value && styles.sortOptionTextActive,
            ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SortOptions;
