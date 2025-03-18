import {useNavigation} from '@react-navigation/native';
import {format, formatDistanceToNow} from 'date-fns';
import {fr} from 'date-fns/locale';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppContext} from '../../../context/AppContext';

const GameItem = ({game}) => {
  const navigation = useNavigation();
  const {handleFollowGame, isRecentlyUpdated} = useAppContext();

  const formatDate = timestamp => {
    if (!timestamp) return 'Jamais';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays < 1) {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: fr,
      }).replace('environ ', '');
    } else if (diffInDays < 7) {
      return format(date, 'EEEE', {locale: fr});
    } else {
      return format(date, 'dd/MM/yyyy', {locale: fr});
    }
  };

  const isRecent = isRecentlyUpdated(game.lastUpdateTimestamp);

  // S'assurer que l'appId est une chaîne de caractères
  const appId = game.appid?.toString();

  return (
    <TouchableOpacity
      style={[styles.container, isRecent && styles.recentlyUpdatedGameItem]}
      onPress={() => navigation.navigate('GameDetails', {game})}>
      {isRecent && (
        <View style={styles.updateBadge}>
          <Text style={styles.updateBadgeText}>Nouveau</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {game.img_icon_url ? (
            <Image
              source={{
                uri: `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
              }}
              style={styles.logo}
            />
          ) : (
            <View style={styles.placeholderLogo}>
              <Icon name="gamepad-variant" size={30} color="#555" />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {game.name}
          </Text>
          <Text style={styles.lastUpdate}>
            Dernière MAJ: {formatDate(game.lastUpdateTimestamp)}
          </Text>
        </View>

        <Pressable
          style={styles.followButton}
          onPress={() => {
            if (appId) {
              handleFollowGame(appId, game.isFollowed);
            } else {
              console.error('ID du jeu non trouvé:', game);
            }
          }}>
          <Icon
            name={game.isFollowed ? 'bell' : 'bell-outline'}
            size={24}
            color={game.isFollowed ? '#4CAF50' : '#757575'}
          />
        </Pressable>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  recentlyUpdatedGameItem: {
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
  },
  updateBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  updateBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    marginRight: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  placeholderLogo: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  followButton: {
    justifyContent: 'center',
    padding: 8,
  },
});

export default GameItem;
