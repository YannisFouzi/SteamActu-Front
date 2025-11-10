import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  View,
} from 'react-native';
import GameCard from '../../../components/GameCard';
import { COLORS } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { userService } from '../../../services/api';
import EmptyStateMessage from './EmptyStateMessage';

const FollowedGamesTab = ({styles}) => {
  const {steamId} = useAppContext();
  const [followedGames, setFollowedGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowedGames = useCallback(async () => {
    if (!steamId) {
      setFollowedGames([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await userService.getFollowedGamesDetails(steamId);
      setFollowedGames(response.data.followedGames || []);
    } catch (error) {
      debugError('Erreur récupération jeux suivis:', error);
      setFollowedGames([]);
    } finally {
      setLoading(false);
    }
  }, [steamId]);

  useEffect(() => {
    fetchFollowedGames();
  }, [fetchFollowedGames]);

  const renderGameItem = ({item}) => {
    const appId = item.appId?.toString();
    const imageUrl =
      item.imageUrl ||
      (item.appId
        ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appId}/header.jpg`
        : null);

    return (
      <GameCard
        game={{name: item.name}}
        imageUrl={imageUrl}
        followConfig={{
          appId,
          name: item.name,
          imageUrl,
          isFollowed: true,
          onToggle: ({nextIsFollowed}) => {
            if (!nextIsFollowed && appId) {
              setFollowedGames(prev =>
                prev.filter(game => game.appId?.toString() !== appId),
              );
            }
          },
        }}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.STEAM_BLUE} />
      </View>
    );
  }

  if (followedGames.length === 0) {
    return (
      <EmptyStateMessage
        styles={styles}
        iconName="notifications-off-outline"
        title="Aucun jeu suivi"
        text="Activez la cloche sur vos jeux pour recevoir les notifications ici."
        subtext="Vous pouvez ajouter un suivi depuis une fiche jeu ou les actus."
        align="top"
      />
    );
  }

  return (
    <FlatList
      data={followedGames}
      renderItem={renderGameItem}
      keyExtractor={item => item.appId?.toString()}
      contentContainerStyle={styles.followedGamesList}
    />
  );
};

export default FollowedGamesTab;
