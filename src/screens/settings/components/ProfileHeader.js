import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {COLORS, SPACING} from '../../../constants';
import {steamService} from '../../../services/api';

const AVATAR_SIZE = 72;

const ProfileHeader = ({steamId}) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!steamId) {
      return;
    }

    steamService
      .getProfile(steamId)
      .then(res => setProfile(res.data))
      .catch(() => setProfile(null));
  }, [steamId]);

  const displayName = profile?.personaname || 'Steam User';
  const avatarUrl = profile?.avatarfull;

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image source={{uri: avatarUrl}} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={32} color={COLORS.STEAM_TEXT_GRAY} />
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
