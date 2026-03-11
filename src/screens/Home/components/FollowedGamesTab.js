import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  View,
} from 'react-native';
import GameCard from '../../../components/GameCard';
import { COLORS } from '../../../constants';
import { getGameImageUrl, getGameImageFallback } from '../../../utils/steamHelpers';
import { useAppContext } from '../../../context/AppContext';
import { useFollowedGames } from '../../../hooks/useFollowedGames';
import EmptyStateMessage from './EmptyStateMessage';
import NoResultsPlaceholder from './NoResultsPlaceholder';
import SearchInput from './SearchInput';

const FollowedGamesTab = React.memo(({
  styles,
  onToggleFollowState,
  registerExternalUnfollowHandler,
}) => {
  const {steamId} = useAppContext();
  const {followedGames, loading, removeFollowedGame} = useFollowedGames(steamId);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFollowedGames = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return followedGames;
    }
    const query = searchQuery.toLowerCase().trim();
    return followedGames.filter(
      game => game.name && game.name.toLowerCase().includes(query),
    );
  }, [followedGames, searchQuery]);

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
    const imageUrl = getGameImageUrl(item);
    const fallbackImageUrl = getGameImageFallback(item);

    return (
      <GameCard
        game={{name: item.name}}
        imageUrl={imageUrl}
        fallbackImageUrl={fallbackImageUrl}
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

  const renderContent = () => {
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

    if (searchQuery.trim() !== '' && filteredFollowedGames.length === 0) {
      return <NoResultsPlaceholder styles={styles} align="top" />;
    }

    return (
      <FlatList
        data={filteredFollowedGames}
        renderItem={renderGameItem}
        keyExtractor={item => item.appId?.toString()}
        contentContainerStyle={styles.followedGamesList}
      />
    );
  };

  return (
    <View style={styles.container}>
      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Rechercher dans les jeux suivis..."
      />
      {renderContent()}
    </View>
  );
});

FollowedGamesTab.displayName = 'FollowedGamesTab';

export default FollowedGamesTab;
