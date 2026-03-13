import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import GameCard from '../../../components/GameCard';
import {COLORS} from '../../../constants';
import {useAppContext} from '../../../context/AppContext';
import {useFollowedGames} from '../../../hooks/useFollowedGames';
import {
  getGameImageFallback,
  getGameImageUrl,
} from '../../../utils/steamHelpers';
import EmptyStateMessage from './EmptyStateMessage';
import NoResultsPlaceholder from './NoResultsPlaceholder';
import SearchInput from './SearchInput';

const FollowedGamesTab = React.memo(({styles}) => {
  const {t} = useTranslation();
  const {steamId, user, registerNotificationSyncHandler} = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const followedAppIds = useMemo(
    () => (Array.isArray(user?.followedGames) ? user.followedGames : []),
    [user],
  );

  const {
    followedGames,
    loading,
    refreshing,
    handleRefresh,
    removeFollowedGame,
  } = useFollowedGames({
    steamId,
    followedAppIds,
    registerSyncHandler: registerNotificationSyncHandler,
  });

  useFocusEffect(
    useCallback(() => {
      if (steamId) {
        handleRefresh();
      }
    }, [handleRefresh, steamId]),
  );

  const filteredFollowedGames = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return followedGames;
    }

    const query = searchQuery.toLowerCase().trim();
    return followedGames.filter(
      game => game.name && game.name.toLowerCase().includes(query),
    );
  }, [followedGames, searchQuery]);

  const renderGameItem = useCallback(
    ({item}) => {
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
            },
          }}
        />
      );
    },
    [removeFollowedGame],
  );

  if (loading && !refreshing) {
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
          title={t('games.followedEmptyTitle')}
          text={t('games.followedEmptyText')}
          subtext={t('games.followedEmptySubtext')}
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
        refreshControl={
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={handleRefresh}
            tintColor={COLORS.STEAM_BLUE}
            colors={[COLORS.STEAM_BLUE]}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('search.placeholderFollowed')}
      />
      {renderContent()}
    </View>
  );
});

FollowedGamesTab.displayName = 'FollowedGamesTab';

export default FollowedGamesTab;
