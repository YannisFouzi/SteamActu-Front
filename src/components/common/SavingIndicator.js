import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../../constants/theme';

/**
 * Composant réutilisable pour l'indicateur de sauvegarde
 * Affiche un feedback visuel pendant les opérations de sauvegarde
 */
const SavingIndicator = ({
  visible = false,
  text = 'Sauvegarde en cours...',
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.STEAM_BLUE} size="small" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
    margin: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BLUE,
  },
  text: {
    color: COLORS.STEAM_BLUE,
    fontSize: 14,
    marginLeft: 8,
  },
});

export default SavingIndicator;
