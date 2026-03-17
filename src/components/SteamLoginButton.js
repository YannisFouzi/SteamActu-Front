import React from 'react';
import {StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../constants';
import PrimaryButton from './PrimaryButton';

const SteamLoginButton = ({
  onPress,
  loading = false,
  disabled = false,
  testID,
}) => {
  const {t} = useTranslation();

  return (
    <PrimaryButton
      label={t('auth.loginWithSteam')}
      loadingLabel={t('auth.loggingIn')}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      backgroundColor={COLORS.STEAM_BLUE}
      borderColor="rgba(255, 255, 255, 0.08)"
      textColor={COLORS.STEAM_DARK_BLUE}
      spinnerColor={COLORS.STEAM_DARK_BLUE}
      accessibilityHint={t('auth.loginButtonHint')}
      style={styles.button}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
  },
});

export default SteamLoginButton;
