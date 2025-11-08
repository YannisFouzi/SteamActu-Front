import React from 'react';
import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import PrimaryButton from './PrimaryButton';

/**
 * CTA spécialisé pour la déconnexion (utilise le bouton primaire partagé)
 */
const LogoutButton = ({onPress, loading = false, disabled = false}) => (
  <PrimaryButton
    label="Se déconnecter"
    onPress={onPress}
    loading={loading}
    disabled={disabled}
    backgroundColor={COLORS.ERROR}
    borderColor={COLORS.ERROR}
    spinnerColor={COLORS.WHITE}
    textColor={COLORS.WHITE}
    style={styles.spacing}
  />
);

const styles = StyleSheet.create({
  spacing: {
    marginTop: 8,
  },
});

export default LogoutButton;
