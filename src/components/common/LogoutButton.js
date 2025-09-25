import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {COLORS, TEXT_STYLES} from '../../constants/theme';

/**
 * Composant réutilisable pour le bouton de déconnexion
 * Centralise l'interface de déconnexion avec styles cohérents
 */
const LogoutButton = ({onPress, loading = false, disabled = false}) => {
  return (
    <TouchableOpacity
      style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}>
      {loading ? (
        <ActivityIndicator color={COLORS.WHITE} size="small" />
      ) : (
        <Text style={styles.buttonText}>Se déconnecter</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    backgroundColor: COLORS.ERROR,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...TEXT_STYLES.button,
  },
});

export default LogoutButton;
