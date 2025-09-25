import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {COLORS, TEXT_STYLES} from '../../constants/theme';

/**
 * Composant réutilisable pour le bouton de connexion Steam
 * Centralise l'interface de connexion avec Steam
 */
const SteamLoginButton = ({onPress, loading = false, disabled = false}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}>
      {loading ? (
        <ActivityIndicator color={COLORS.WHITE} />
      ) : (
        <Text style={styles.buttonText}>Se connecter avec Steam</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 4,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BLUE,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...TEXT_STYLES.button,
  },
});

export default SteamLoginButton;
