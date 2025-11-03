import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {
  getGameAppId,
  isValidGame,
} from '../../../utils/gameHelpers';

const GameItemAlt = ({game}) => {
  const navigation = useNavigation();
  const {handleFollowGame, isGameFollowed} = useAppContext();
  const [imageError, setImageError] = React.useState(false);

  // Validation et extraction des données du jeu
  if (!isValidGame(game)) {
    return null;
  }

  const appId = getGameAppId(game);
  const isFollowed = isGameFollowed(appId);

  // Construire l'URL de l'image du jeu (header image Steam)
  const gameImageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('GameDetails', {game})}>
      {/* 🎨 Image du jeu (comme wishlist) */}
      {imageError ? (
        <View style={styles.gameImagePlaceholder}>
          <Icon name="game-controller-outline" size={32} color="#999" />
        </View>
      ) : (
        <Image
          source={{uri: gameImageUrl}}
          style={styles.gameImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* 📝 Infos du jeu */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {game.name}
        </Text>
      </View>

      {/* 🔔 Bouton follow */}
      <TouchableOpacity
        style={styles.followButton}
        onPress={e => {
          e.stopPropagation();
          if (appId) {
            handleFollowGame(appId, isFollowed);
          }
        }}>
        <Icon
          name={isFollowed ? 'notifications' : 'notifications-outline'}
          size={24}
          color={isFollowed ? '#4CAF50' : '#757575'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 🎨 Style horizontal identique à la wishlist
  container: {
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
  gameImage: {
    width: 120,
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  gameImagePlaceholder: {
    width: 120,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  followButton: {
    justifyContent: 'center',
    padding: 12,
  },
});

export default GameItemAlt;
