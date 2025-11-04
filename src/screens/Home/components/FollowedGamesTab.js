import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import GameCard from '../../../components/common/GameCard';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {userService} from '../../../services/api';

const FollowedGamesTab = ({styles}) => {
  const {steamId, handleFollowGame, isGameFollowed} = useAppContext();
  const [followedGames, setFollowedGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowedGames = useCallback(async () => {
    if (!steamId) return;

    try {
      setLoading(true);
      const response = await userService.getFollowedGamesDetails(steamId);
      setFollowedGames(response.data.followedGames || []);
    } catch (error) {
      console.error('Erreur récupération jeux suivis:', error);
      setFollowedGames([]);
    } finally {
      setLoading(false);
    }
  }, [steamId]);

  useEffect(() => {
    fetchFollowedGames();
  }, [fetchFollowedGames]);

  const renderGameItem = ({item}) => {
    const isFollowed = isGameFollowed(item.appId);
    const imageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appId}/header.jpg`;

    return (
      <GameCard
        game={{name: item.name}}
        imageUrl={imageUrl}
        isFollowed={isFollowed}
        onFollowPress={() => {
          handleFollowGame(item.appId, isFollowed);
        }}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.STEAM_BLUE} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (followedGames.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Icon
          name="notifications-off-outline"
          size={64}
          color={COLORS.STEAM_TEXT_GRAY}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>Aucun jeu suivi</Text>
        <Text style={styles.emptyText}>
          Activez la cloche sur vos jeux pour recevoir des notifications
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={followedGames}
      renderItem={renderGameItem}
      keyExtractor={item => item.appId}
      contentContainerStyle={styles.followedGamesList}
    />
  );
};

export default FollowedGamesTab;
