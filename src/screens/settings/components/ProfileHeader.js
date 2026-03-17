import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {COLORS, SPACING} from '../../../constants';
import {useAppContext} from '../../../context/AppContext';

const AVATAR_SIZE = 72;

const ProfileHeader = () => {
  const {t} = useTranslation();
  const {steamId, steamProfile} = useAppContext();

  if (!steamId) {
    return null;
  }

  const avatarUrl = steamProfile?.avatarfull;
  const displayName =
    steamProfile?.personaname || t('settings.steamAccountLabel');

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image source={{uri: avatarUrl}} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons
            name="person"
            size={32}
            color={COLORS.STEAM_TEXT_GRAY}
          />
        </View>
      )}

      <Text style={styles.displayName} numberOfLines={1}>
        {displayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.STEAM_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
});

export default ProfileHeader;
