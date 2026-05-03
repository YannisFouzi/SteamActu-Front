import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import GameCard from '../../../components/GameCard';
import {COLORS} from '../../../constants';
import {useAppContext} from '../../../context/AppContext';
import {showSuccessMessage} from '../../../feedback/feedbackService';
import {useFollowedGames} from '../../../hooks/useFollowedGames';
import {
  getGameImageFallback,
  getGameImageUrl,
} from '../../../utils/steamHelpers';
import EmptyStateMessage from './EmptyStateMessage';
import NoResultsPlaceholder from './NoResultsPlaceholder';
import SearchInput from './SearchInput';
import SortOptions from './SortOptions';

const SORT_ALPHABETICAL = 'alphabetical';
const SORT_RECENT = 'recent';
const VALID_SORTS = new Set([SORT_ALPHABETICAL, SORT_RECENT]);

const FollowedGamesTab = React.memo(({styles}) => {
  const {t} = useTranslation();
  const {steamId, user, registerNotificationSyncHandler} = useAppContext();
  const route = useRoute();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(SORT_ALPHABETICAL);

  const followedAppIds = useMemo(
    () => (Array.isArray(user?.followedGames) ? user.followedGames : []),
    [user],
  );

  const {
    followedGames,
    loading,
    refreshing,
    hasFetchedFromNetwork,
    handleRefresh,
    removeFollowedGame,
  } = useFollowedGames({
    steamId,
    followedAppIds,
    registerSyncHandler: registerNotificationSyncHandler,
  });

  // Pattern stale-while-revalidate : on n'affiche EmptyState que sur un état
  // confirmé. Trois cas où on garde le spinner :
  // - user pas encore chargé (transient au cold-boot)
  // - user a des follows (followedAppIds.length > 0) mais détails pas encore
  //   en local ET pas de réponse réseau encore -> on attend le fetch
  // - fetch actif en cours (hors pull-to-refresh)
  const expectsFollowsDetails =
    followedAppIds.length > 0 && followedGames.length === 0;
  const isInitialLoading =
    !user ||
    (expectsFollowsDetails && !hasFetchedFromNetwork) ||
    (loading && !refreshing);

  // Tri demandé via deep-link (linking transmet `?initialSort=recent` quand
  // l'utilisateur arrive ici via tap notif follow_prompt). Param consommé
  // après application pour éviter qu'un retour ultérieur ne le re-force.
  useEffect(() => {
    const requested = route?.params?.initialSort;
    if (requested && VALID_SORTS.has(requested)) {
      setSortBy(requested);
      if (typeof navigation?.setParams === 'function') {
        navigation.setParams({initialSort: undefined});
      }
    }
  }, [navigation, route?.params?.initialSort]);

  // Toast "X a bien été suivi" — affiché QUAND l'écran monte avec le param
  // confirmedGameName (transmis par linking au moment du tap notif). Garantit
  // un timing visuel correct : le toast apparaît sur l'écran de destination.
  useEffect(() => {
    const confirmedName = route?.params?.confirmedGameName;
    if (!isInitialLoading && confirmedName) {
      showSuccessMessage(
        '',
        t('notifications.followConfirmedMessage', {gameName: confirmedName}),
        {duration: 2000},
      );
      if (typeof navigation?.setParams === 'function') {
        navigation.setParams({confirmedGameName: undefined});
      }
    }
  }, [isInitialLoading, navigation, route?.params?.confirmedGameName, t]);

  const sortOptions = useMemo(
    () => [
      {value: SORT_ALPHABETICAL, label: t('games.sortAZ')},
      {value: SORT_RECENT, label: t('games.recents')},
    ],
    [t],
  );

  const sortedFollowedGames = useMemo(() => {
    const list = Array.isArray(followedGames) ? followedGames.slice() : [];

    if (sortBy === SORT_RECENT) {
      return list.sort((a, b) => {
        const aTime = a?.followedAt ? new Date(a.followedAt).getTime() : 0;
        const bTime = b?.followedAt ? new Date(b.followedAt).getTime() : 0;
        if (bTime !== aTime) {
          return bTime - aTime;
        }
        return (a?.name || '').localeCompare(b?.name || '', 'fr', {
          sensitivity: 'base',
        });
      });
    }

    return list.sort((a, b) =>
      (a?.name || '').localeCompare(b?.name || '', 'fr', {
        sensitivity: 'base',
      }),
    );
  }, [followedGames, sortBy]);

  const filteredFollowedGames = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return sortedFollowedGames;
    }

    const query = searchQuery.toLowerCase().trim();
    return sortedFollowedGames.filter(
      game => game.name && game.name.toLowerCase().includes(query),
    );
  }, [sortedFollowedGames, searchQuery]);

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

  // Loading guard global : tant que le user n'est pas chargé OU que le hook
  // est en plein 1er fetch, on affiche un spinner. Évite le flash "aucun jeu
  // suivi" qui apparaissait au cold-boot via tap notif (user encore null →
  // followedAppIds === [] → EmptyState rendered à tort).
  if (isInitialLoading) {
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
        />
      );
    }

    if (searchQuery.trim() !== '' && filteredFollowedGames.length === 0) {
      return <NoResultsPlaceholder styles={styles} />;
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
      {followedGames.length > 0 ? (
        <SortOptions
          options={sortOptions}
          selectedValue={sortBy}
          onSelect={setSortBy}
        />
      ) : null}
      {renderContent()}
    </View>
  );
});

FollowedGamesTab.displayName = 'FollowedGamesTab';

export default FollowedGamesTab;
