import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS, TEXT_STYLES} from '../constants';

const StartupScreen = () => {
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/steam-logov2.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Steam Actu</Text>
      <Text style={styles.subtitle}>{t('common.loading')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    ...TEXT_STYLES.title,
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...TEXT_STYLES.loadingText,
    marginTop: 0,
    textAlign: 'center',
  },
});

export default StartupScreen;
