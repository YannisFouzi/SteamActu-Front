import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, CONTAINER_STYLES } from '../constants';
import FollowToggle from './FollowToggle';

const GameCard = ({
  game,
  imageUrl,
  followConfig = null,
  showDate = false,
  dateText = '',
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={styles.imagePlaceholder}>
            <Icon
              name="game-controller-outline"
              size={32}
              color={COLORS.STEAM_TEXT_GRAY}
            />
          </View>
        ) : (
          <Image
            source={{uri: imageUrl}}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {game.name}
        </Text>
        {showDate && dateText ? (
          <Text style={styles.date}>{dateText}</Text>
        ) : null}
      </View>
      {followConfig ? (
        <FollowToggle
          appId={followConfig.appId}
          name={followConfig.name || game.name}
          imageUrl={followConfig.imageUrl || imageUrl}
          isFollowed={followConfig.isFollowed}
          size={followConfig.size}
          activeColor={followConfig.activeColor}
          inactiveColor={followConfig.inactiveColor}
          style={styles.followButton}
          onToggle={followConfig.onToggle}
          testID={followConfig.testID}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...CONTAINER_STYLES.card,
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
  },
  imageContainer: {
    width: 120,
    height: 80,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.PLACEHOLDER_GRAY,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.NEWS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  followButton: {
    justifyContent: 'center',
    padding: 12,
  },
});

export default GameCard;
