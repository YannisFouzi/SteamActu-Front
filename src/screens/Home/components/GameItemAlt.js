import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppContext} from '../../../context/AppContext';

const GameItemAlt = ({game}) => {
  const navigation = useNavigation();
  const {handleFollowGame, isRecentlyUpdated, isGameFollowed} = useAppContext();

  // S'assurer que nous avons un appId valide
  const appId = game?.appid?.toString() || game?.appId?.toString();
  const isFollowed = isGameFollowed(appId);

  const formatDate = timestamp => {
    if (!timestamp) return 'Jamais';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInDays < 7) {
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  };

  const isRecent = isRecentlyUpdated(game.lastUpdateTimestamp);

  // Ne pas rendre le composant si nous n'avons pas les données minimales requises
  if (!game || !game.name) {
    return null;
  }

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
          {game.logoUrl ? (
            <Image source={{uri: game.logoUrl}} style={styles.logo} />
          ) : (
            <View style={styles.placeholderLogo}>
              <Text style={styles.placeholderText}>🎮</Text>
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
              handleFollowGame(appId, isFollowed);
            } else {
              console.error('ID du jeu non trouvé:', game);
            }
          }}>
          <Icon
            name={isFollowed ? 'notifications' : 'notifications-outline'}
            size={24}
            color={isFollowed ? '#4CAF50' : '#757575'}
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
  placeholderText: {
    fontSize: 24,
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

export default GameItemAlt;
