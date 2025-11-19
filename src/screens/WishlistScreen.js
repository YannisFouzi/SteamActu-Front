import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import GameCard from '../components/GameCard';
import LoadingContainer from '../components/LoadingContainer';
import { COLORS } from '../constants';
import EmptyStateMessage from './Home/components/EmptyStateMessage';
import NoResultsPlaceholder from './Home/components/NoResultsPlaceholder';
import SortOptions from './Home/components/SortOptions';
import styles from './Home/styles';

const WISHLIST_SORT_OPTIONS = [
  {value: 'recent', label: 'Recents'},
  {value: 'alphabetical', label: 'A-Z'},
];

const WishlistScreen = ({
  wishlist,
  loading,
  refreshing,
  handleRefresh,
  filterWishlist,
  updateWishlistFollowState,
  maybeRefreshWishlist,
}) => {
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState('');
  const [wishlistSortBy, setWishlistSortBy] = useState('recent');

  useFocusEffect(
    useCallback(() => {
      if (typeof maybeRefreshWishlist === 'function') {
        maybeRefreshWishlist('wishlistScreen');
      }
    }, [maybeRefreshWishlist]),
  );

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

  const wishlistEmptyComponent = useMemo(() => {
    if (wishlistSearchQuery !== '') {
      return <NoResultsPlaceholder styles={styles} />;
    }

    return (
      <EmptyStateMessage
        styles={styles}
        iconName="sad-outline"
        title="Wishlist vide"
        text="Ajoutez les jeux qui vous interessent pour les suivre ici."
        align="top"
      />
    );
  }, [wishlistSearchQuery]);

  const renderWishlistItem = useCallback(
    ({item}) => {
      const appId = item.appid ? item.appid.toString() : null;
      const gameName = item.name || (appId ? `Jeu ${appId}` : 'Jeu Steam');
      const fallbackImage =
        appId &&
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
      const imageUrl = item.header_image || item.capsule || fallbackImage;

      return (
        <GameCard
          game={{name: gameName}}
          imageUrl={imageUrl}
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
    [updateWishlistFollowState],
  );

  const onRefresh = useCallback(() => {
    if (typeof handleRefresh === 'function') {
      handleRefresh();
    }
  }, [handleRefresh]);

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Icon
            name="search"
            size={20}
            color={COLORS.STEAM_TEXT_GRAY}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher dans ma wishlist..."
            placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
            value={wishlistSearchQuery}
            onChangeText={setWishlistSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {wishlistSearchQuery !== '' && (
            <TouchableOpacity
              style={styles.searchClearButton}
              onPress={() => setWishlistSearchQuery('')}>
              <Icon
                name="close-circle"
                size={20}
                color={COLORS.STEAM_TEXT_GRAY}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SortOptions
        options={WISHLIST_SORT_OPTIONS}
        selectedValue={wishlistSortBy}
        onSelect={setWishlistSortBy}
      />

      {loading && !refreshing ? (
        <LoadingContainer text="Chargement de la wishlist..." />
      ) : (
        <FlatList
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
