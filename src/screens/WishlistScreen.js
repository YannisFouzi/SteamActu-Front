import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Linking, RefreshControl, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import GameCard from '../components/GameCard';
import LoadingContainer from '../components/LoadingContainer';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {steamService} from '../services/api';
import {showDialog} from '../hooks/hooksLogger';
import {getGameImageFallback, getGameImageUrl} from '../utils/steamHelpers';
import EmptyStateMessage from './Home/components/EmptyStateMessage';
import NoResultsPlaceholder from './Home/components/NoResultsPlaceholder';
import SearchInput from './Home/components/SearchInput';
import SortOptions from './Home/components/SortOptions';
import styles from './Home/styles';

const STEAM_PRIVACY_URL = 'https://steamcommunity.com/my/edit/settings';

const WishlistScreen = ({
  wishlist,
  loading,
  refreshing,
  handleRefresh,
  filterWishlist,
  updateWishlistFollowState,
  maybeRefreshWishlist,
}) => {
  const {t} = useTranslation();
  const {steamId} = useAppContext();
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState('');
  const [wishlistSortBy, setWishlistSortBy] = useState('recent');
  const [checking, setChecking] = useState(false);
  const listRef = useRef(null);

  const sortOptions = useMemo(
    () => [
      {value: 'recent', label: t('games.recents')},
      {value: 'alphabetical', label: t('games.sortAZ')},
    ],
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      if (typeof maybeRefreshWishlist === 'function') {
        maybeRefreshWishlist('wishlistScreen');
      }
    }, [maybeRefreshWishlist]),
  );

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToOffset({offset: 0, animated: true});
    }
  }, [wishlistSortBy]);

  const getSortedWishlist = useCallback(() => {
    const filtered = wishlistSearchQuery
      ? filterWishlist(wishlistSearchQuery)
      : wishlist;

    if (wishlistSortBy === 'recent') {
      return [...filtered].sort((a, b) => b.date_added - a.date_added);
    }

    if (wishlistSortBy === 'alphabetical') {
      return [...filtered].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
    }

    return filtered;
  }, [filterWishlist, wishlist, wishlistSearchQuery, wishlistSortBy]);

  const checkVisibility = useCallback(async () => {
    if (!steamId || checking) {
      return;
    }

    setChecking(true);
    try {
      const response = await steamService.checkVisibility(steamId);
      if (response.data?.visible) {
        showDialog({
          title: t('common.success'),
          message: t('games.checkVisibilityWishlistSuccess'),
          tone: 'success',
          buttons: [{text: 'OK'}],
        });
        handleRefresh();
      } else {
        showDialog({
          title: t('common.info'),
          message: t('games.checkVisibilityStillPrivate'),
          tone: 'warning',
          buttons: [{text: 'OK'}],
        });
      }
    } catch (error) {
      showDialog({
        title: t('common.info'),
        message: t('games.checkVisibilityStillPrivate'),
        tone: 'warning',
        buttons: [{text: 'OK'}],
      });
    } finally {
      setChecking(false);
    }
  }, [checking, handleRefresh, steamId, t]);

  const wishlistEmptyComponent = useMemo(() => {
    if (wishlistSearchQuery !== '') {
      return <NoResultsPlaceholder styles={styles} />;
    }

    return (
      <EmptyStateMessage
        styles={styles}
        iconName="lock-closed-outline"
        title={t('games.wishlistEmptyTitle')}
        text={t('games.wishlistEmptyText')}
        actionText={t('games.wishlistEmptyPrivacyAction')}
        onAction={() => Linking.openURL(STEAM_PRIVACY_URL)}
        secondaryActionText={t('games.checkVisibilityAction')}
        onSecondaryAction={checkVisibility}
        secondaryActionLoading={checking}
        align="top"
      />
    );
  }, [checkVisibility, checking, t, wishlistSearchQuery]);

  const renderWishlistItem = useCallback(
    ({item}) => {
      const appId = item.appid ? item.appid.toString() : null;
      const gameName =
        item.name || (appId ? t('common.gameWithId', {appId}) : t('common.unknownGame'));
      const imageUrl = getGameImageUrl(item);
      const fallbackImageUrl = getGameImageFallback(item);

      return (
        <GameCard
          game={{name: gameName}}
          imageUrl={imageUrl}
          fallbackImageUrl={fallbackImageUrl}
          followConfig={
            appId
              ? {
                  appId,
                  name: gameName,
                  imageUrl,
                  isFollowed: item.isFollowed,
                  onToggle: ({nextIsFollowed}) =>
                    updateWishlistFollowState(appId, nextIsFollowed),
                }
              : null
          }
        />
      );
    },
    [t, updateWishlistFollowState],
  );

  const onRefresh = useCallback(() => {
    if (typeof handleRefresh === 'function') {
      handleRefresh();
    }
  }, [handleRefresh]);

  return (
    <View style={styles.container}>
      <SearchInput
        value={wishlistSearchQuery}
        onChangeText={setWishlistSearchQuery}
        placeholder={t('games.searchWishlistPlaceholder')}
      />

      <SortOptions
        options={sortOptions}
        selectedValue={wishlistSortBy}
        onSelect={setWishlistSortBy}
      />

      {loading && !refreshing ? (
        <LoadingContainer text={t('games.wishlistLoading')} />
      ) : (
        <FlatList
          ref={listRef}
          data={getSortedWishlist()}
          renderItem={renderWishlistItem}
          keyExtractor={(item, index) =>
            item.appid ? item.appid.toString() : `wishlist-${index}`
          }
          contentContainerStyle={styles.wishlistList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={wishlistEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={COLORS.STEAM_BLUE}
              colors={[COLORS.STEAM_BLUE]}
            />
          }
        />
      )}
    </View>
  );
};

export default WishlistScreen;
