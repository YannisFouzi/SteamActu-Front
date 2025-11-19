import React, { useCallback, useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    View,
} from 'react-native';
import GameCard from '../../../components/GameCard';
import { COLORS } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { useFollowedGames } from '../../../hooks/useFollowedGames';
import EmptyStateMessage from './EmptyStateMessage';

const FollowedGamesTab = React.memo(({
  styles,
  onToggleFollowState,
  registerExternalUnfollowHandler,
}) => {
  const {steamId} = useAppContext();
  const {followedGames, loading, removeFollowedGame} = useFollowedGames(steamId);

  useEffect(() => {
    if (typeof registerExternalUnfollowHandler !== 'function') {
      return undefined;
    }

    const unregister = registerExternalUnfollowHandler(appId => {
      if (!appId) {
        return;
      }
      removeFollowedGame(appId);
    });

    return unregister;
  }, [registerExternalUnfollowHandler, removeFollowedGame]);

  const renderGameItem = useCallback(({item}) => {
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
              removeFollowedGame(appId);
            }
            if (typeof onToggleFollowState === 'function' && appId) {
              onToggleFollowState(appId, nextIsFollowed);
            }
          },
        }}
      />
    );
  }, [onToggleFollowState, removeFollowedGame]);

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
});

FollowedGamesTab.displayName = 'FollowedGamesTab';

export default FollowedGamesTab;
