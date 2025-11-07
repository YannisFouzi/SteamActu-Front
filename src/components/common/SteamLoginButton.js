import React from 'react';
import {StyleSheet} from 'react-native';
import {COLORS} from '../../constants';
import PrimaryButton from './PrimaryButton';

/**
 * CTA spécialisé pour la connexion Steam (s'appuie sur PrimaryButton)
 */
const SteamLoginButton = ({
  onPress,
  loading = false,
  disabled = false,
  testID,
}) => (
  <PrimaryButton
    label="Se connecter avec Steam"
    onPress={onPress}
    loading={loading}
    disabled={disabled}
    backgroundColor={COLORS.STEAM_NAVY}
    borderColor={COLORS.STEAM_BLUE}
    textColor={COLORS.WHITE}
    spinnerColor={COLORS.WHITE}
    style={styles.button}
    testID={testID}
  />
);

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginBottom: 20,
  },
});

export default SteamLoginButton;
