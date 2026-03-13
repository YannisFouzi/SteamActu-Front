import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import SteamLoginButton from '../components/SteamLoginButton';
import {COLORS, TEXT_STYLES} from '../constants';
import {useSteamAuth} from '../hooks/useSteamAuth';

const LoginScreen = () => {
  const {t} = useTranslation();
  const {loading, authFlowState, handleSteamLogin} = useSteamAuth();

  const authStatusContent =
    authFlowState === 'pending'
      ? {
          title: t('auth.loginPendingTitle'),
          message: t('auth.loginPendingMessage'),
        }
      : authFlowState === 'expired'
      ? {
          title: t('auth.loginExpiredTitle'),
          message: t('auth.loginExpiredMessage'),
        }
      : null;

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/steam-logo.webp')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Steam Actu</Text>
      <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

      <SteamLoginButton onPress={handleSteamLogin} loading={loading} />

      {authStatusContent ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{authStatusContent.title}</Text>
          <Text style={styles.statusMessage}>{authStatusContent.message}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    ...TEXT_STYLES.title,
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    ...TEXT_STYLES.subtitle,
    marginBottom: 40,
    textAlign: 'center',
  },
  statusCard: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.STEAM_NAVY,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BLUE,
  },
  statusTitle: {
    ...TEXT_STYLES.subtitle,
    color: COLORS.WHITE,
    marginBottom: 6,
    textAlign: 'left',
  },
  statusMessage: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'left',
    lineHeight: 20,
  },
});

export default LoginScreen;
