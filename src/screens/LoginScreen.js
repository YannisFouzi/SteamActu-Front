import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import SteamLoginButton from '../components/SteamLoginButton';
import {COLORS, TEXT_STYLES} from '../constants';
import {useSteamAuth} from '../hooks/useSteamAuth';

const LoginScreen = ({navigation}) => {
  const {t} = useTranslation();
  const {loading, handleSteamLogin} = useSteamAuth(navigation);

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
});

export default LoginScreen;
