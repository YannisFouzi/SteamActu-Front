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
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginBottom: 20,
  },
});

export default SteamLoginButton;
