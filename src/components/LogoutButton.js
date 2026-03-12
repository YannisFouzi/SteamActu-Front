import React from 'react';
import {StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../constants';
import PrimaryButton from './PrimaryButton';

const LogoutButton = ({onPress, loading = false, disabled = false}) => {
  const {t} = useTranslation();

  return (
    <PrimaryButton
      label={t('auth.logout')}
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
};

const styles = StyleSheet.create({
  spacing: {
    marginTop: 8,
  },
});

export default LogoutButton;
