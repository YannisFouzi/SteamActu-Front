import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {COLORS, TEXT_STYLES} from '../../constants/theme';

/**
 * Composant réutilisable pour afficher un état de chargement
 * Centralise la logique d'affichage des indicateurs de chargement
 */
const LoadingContainer = ({
  size = 'large',
  text = 'Chargement...',
  color = COLORS.STEAM_BLUE,
  style = {},
}) => {
  const defaultStyle = {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  };

  return (
    <View style={[defaultStyle, style]}>
      <ActivityIndicator size={size} color={color} />
      <Text style={TEXT_STYLES.loadingText}>{text}</Text>
    </View>
  );
};

export default LoadingContainer;
