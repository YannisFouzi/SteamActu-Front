import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {COLORS, TEXT_STYLES} from '../constants';

/**
 * Composant réutilisable pour afficher un état de chargement
 * Centralise la logique d'affichage des indicateurs de chargement
 */
const LoadingContainer = ({
  size = 'large',
  text = 'Chargement...',
  color = COLORS.STEAM_BLUE,
  style,
}) => (
  <View style={[styles.container, style]}>
    <ActivityIndicator size={size} color={color} />
    <Text style={TEXT_STYLES.loadingText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default LoadingContainer;
