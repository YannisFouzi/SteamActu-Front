import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {useAppContext} from '../../../context/AppContext';
import styles from '../styles';

const GameItem = ({game}) => {
  const navigation = useNavigation();
  const {isGameFollowed, followGame, formatPlaytime, isRecentlyUpdated} =
    useAppContext();

  const isFollowed = isGameFollowed(game);
  const hasRecentUpdate = isRecentlyUpdated(game);

  return (
    <TouchableOpacity
      style={[
        styles.gameItem,
        hasRecentUpdate && styles.recentlyUpdatedGameItem,
      ]}
      onPress={() =>
        navigation.navigate('GameDetails', {
          gameId: game.appId,
          gameName: game.name,
        })
      }>
      <Image
        style={styles.gameImage}
        source={{
          uri: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
        }}
      />
      <View style={styles.gameInfo}>
        <View style={styles.gameTitleContainer}>
          <Text style={styles.gameTitle}>{game.name}</Text>
          {hasRecentUpdate && (
            <View style={styles.updateBadge}>
              <Text style={styles.updateBadgeText}>Nouveau</Text>
            </View>
          )}
        </View>
        <Text style={styles.gamePlaytime}>
          Temps de jeu: {formatPlaytime(game.playtime.forever)}
        </Text>
        {game.playtime.recent > 0 && (
          <Text style={styles.gameRecentPlaytime}>
            Récent: {formatPlaytime(game.playtime.recent)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.followButton, isFollowed ? styles.followedButton : {}]}
        onPress={() => followGame(game)}>
        <Text style={styles.followButtonText}>
          {isFollowed ? 'Suivi' : 'Suivre'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default GameItem;
