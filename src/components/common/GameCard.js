import React, {useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../../constants/theme';

const GameCard = ({
  game,
  imageUrl,
  isFollowed = false,
  onFollowPress,
  showDate = false,
  dateText = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const handleFollowPress = () => {
    if (onFollowPress) {
      onFollowPress();
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={styles.imagePlaceholder}>
            <Icon name="game-controller-outline" size={32} color="#999" />
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
      <TouchableOpacity style={styles.followButton} onPress={handleFollowPress}>
        <Icon
          name={isFollowed ? 'notifications' : 'notifications-outline'}
          size={24}
          color={isFollowed ? '#4CAF50' : '#757575'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#757575',
  },
  followButton: {
    justifyContent: 'center',
    padding: 12,
  },
});

export default GameCard;
