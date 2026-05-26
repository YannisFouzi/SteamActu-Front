import React, {useCallback} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import {Button} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {COLORS, SPACING} from '../constants';

const UpdateRequiredScreen = ({updateUrl}) => {
  const {t} = useTranslation();

  const handleUpdate = useCallback(() => {
    if (!updateUrl) {
      return;
    }
    Linking.openURL(updateUrl).catch(() => {});
  }, [updateUrl]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-download-outline" size={64} color={COLORS.STEAM_BLUE} />
      </View>
      <Text style={styles.title}>{t('update.title')}</Text>
      <Text style={styles.message}>{t('update.message')}</Text>
      {updateUrl ? (
        <Button
          mode="contained"
          onPress={handleUpdate}
          style={styles.button}
          buttonColor={COLORS.STEAM_BLUE}>
          {t('update.button')}
        </Button>
      ) : (
        <Text style={styles.hint}>{t('update.hint')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconWrap: {
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  message: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  button: {
    minWidth: 220,
  },
  hint: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default UpdateRequiredScreen;
