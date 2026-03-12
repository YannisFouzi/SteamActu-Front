import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS, TEXT_STYLES} from '../constants';

const LoadingContainer = ({
  size = 'large',
  text,
  color = COLORS.STEAM_BLUE,
  style,
}) => {
  const {t} = useTranslation();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      <Text style={TEXT_STYLES.loadingText}>{text || t('common.loading')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default LoadingContainer;
