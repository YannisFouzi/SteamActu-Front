import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import SteamLoginButton from '../components/common/SteamLoginButton';
import {COLORS, TEXT_STYLES} from '../constants/theme';
import {useSteamAuth} from '../hooks/useSteamAuth';

const LoginScreen = ({navigation}) => {
  // Hook personnalisé pour l'authentification Steam
  const {loading, handleSteamLogin} = useSteamAuth(navigation);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/steam-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Steam Actu & Notif</Text>
      <Text style={styles.subtitle}>
        Restez informÃ© des derniÃ¨res actualitÃ©s de vos jeux Steam
      </Text>

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
