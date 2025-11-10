import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import GameCard from '../../components/GameCard';
import LoadingContainer from '../../components/LoadingContainer';
import { COLORS } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { useNewsManager } from '../../hooks/useNewsManager';
import { useWishlist } from '../../hooks/useWishlist';
import EmptyStateMessage from './components/EmptyStateMessage';
import FilterModal from './components/FilterModal';
import FollowedGamesTab from './components/FollowedGamesTab';
import GamesList from './components/GamesList';
import NewsTab from './components/NewsTab';
import NoResultsPlaceholder from './components/NoResultsPlaceholder';
import SearchBar from './components/SearchBar';
import SearchGameTab from './components/SearchGameTab';
import SortModal from './components/SortModal';
import SortOptions from './components/SortOptions';
import styles from './styles';

const TABS = {
  NEWS: 'news',
  FOLLOW_GAMES: 'followGames',
};

const TAB_ITEMS = [
  {key: TABS.NEWS, label: 'Actus'},
  {key: TABS.FOLLOW_GAMES, label: 'Suivre un jeu'},
];

const NEWS_TABS = {
  FEED: 'feed',
  FOLLOWED_GAMES: 'followedGames',
};

const NEWS_TAB_ITEMS = [
  {key: NEWS_TABS.FEED, label: 'Feed'},
  {key: NEWS_TABS.FOLLOWED_GAMES, label: 'Jeux suivis'},
];

const FOLLOW_GAME_TABS = {
  MY_GAMES: 'myGames',
  WISHLIST: 'wishlist',
  SEARCH: 'search',
};

const FOLLOW_GAME_TAB_ITEMS = [
  {key: FOLLOW_GAME_TABS.MY_GAMES, label: 'Mes jeux'},
  {key: FOLLOW_GAME_TABS.WISHLIST, label: 'Wishlist'},
  {key: FOLLOW_GAME_TABS.SEARCH, label: 'Chercher un jeu'},
];

const MY_GAMES_SORT_OPTIONS = [
  {value: 'default', label: 'A-Z'},
  {value: 'recent', label: 'Joué récemment'},
  {value: 'mostPlayed', label: 'Plus joues'},
];

const WISHLIST_SORT_OPTIONS = [
  {value: 'recent', label: 'Récemment ajouté'},
  {value: 'alphabetical', label: 'A-Z'},
];



const HomeScreen = () => {
  const {
    loading: gamesLoading,
    steamId,
    sortOption,
    setSortOption,
    filterAndSortGames,
    maybeRefreshGames,
  } = useAppContext();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(TABS.NEWS);
  const [activeNewsTab, setActiveNewsTab] = useState(NEWS_TABS.FEED);
  const [activeFollowTab, setActiveFollowTab] = useState(
    FOLLOW_GAME_TABS.MY_GAMES,
  );
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState('');
  const [wishlistSortBy, setWishlistSortBy] = useState('recent');
  const handleMyGamesSortChange = useCallback(
    option => {
      setSortOption(option);
      filterAndSortGames(option);
    },
    [filterAndSortGames, setSortOption],
  );

  const isNewsTab = activeTab === TABS.NEWS;
  const isFollowGamesTab = activeTab === TABS.FOLLOW_GAMES;
  const isFeedTab = activeNewsTab === NEWS_TABS.FEED;
  const previousTabState = useRef({isNewsTab, isFeedTab});
  const isFirstRender = useRef(true);
  const hasFetchedWishlistRef = useRef(false);

  // Hook wishlist
  const {
    wishlist,
    loading: wishlistLoading,
    refreshing: wishlistRefreshing,
    fetchWishlist,
    handleRefresh: handleWishlistRefresh,
    filterWishlist,
    updateWishlistFollowState,
    maybeRefreshWishlist,
  } = useWishlist(steamId);

  // Hook personnalisé pour la gestion des news
  const {newsState, fetchNews, isNewsInitialized, isNewsLoading} =
    useNewsManager(steamId);

  // Charger les news au premier accès à l'onglet
  useEffect(() => {
    if (isNewsTab && !isNewsInitialized && !isNewsLoading) {
      fetchNews();
    }
  }, [isNewsTab, isNewsInitialized, isNewsLoading, fetchNews]);

  // Rafraîchir automatiquement le feed quand on revient sur l'onglet Actus
  useEffect(() => {
    const hasJustBecomeFeed =
      isNewsTab &&
      isFeedTab &&
      (!previousTabState.current.isNewsTab ||
        !previousTabState.current.isFeedTab);

    if (hasJustBecomeFeed && isNewsInitialized) {
      fetchNews({silent: true});
    }

    previousTabState.current = {isNewsTab, isFeedTab};
  }, [isNewsTab, isFeedTab, isNewsInitialized, fetchNews]);

  // Charger la wishlist au premier accès (garde le guard pour éviter les boucles)
  useEffect(() => {
    if (
      isFollowGamesTab &&
      activeFollowTab === FOLLOW_GAME_TABS.WISHLIST &&
      steamId &&
      !hasFetchedWishlistRef.current
    ) {
      hasFetchedWishlistRef.current = true;
      fetchWishlist();
    }
  }, [isFollowGamesTab, activeFollowTab, steamId, fetchWishlist]);

  useEffect(() => {
    hasFetchedWishlistRef.current = false;
  }, [steamId]);

  // ✨ Focus listener ÉCRAN (quand on revient sur Home depuis un autre écran)
  useEffect(() => {
    const onFocus = () => {
      if (isNewsTab) {
        fetchNews({silent: true});
      }

      // Check version quand on revient sur l'écran
      if (steamId) {
        maybeRefreshGames();
        maybeRefreshWishlist();
      }
    };

    const focusUnsubscribe = navigation.addListener('focus', onFocus);

    return () => {
      focusUnsubscribe();
    };
  }, [navigation, isNewsTab, fetchNews, steamId, maybeRefreshGames, maybeRefreshWishlist]);

  // ✨ Focus listener ONGLET (quand on change d'onglet dans Home)
  useEffect(() => {
    // Skip le premier render (au mount de la page)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Si on est sur l'onglet "Mes jeux", check version
    if (
      activeTab === TABS.FOLLOW_GAMES &&
      activeFollowTab === FOLLOW_GAME_TABS.MY_GAMES &&
      steamId
    ) {
      maybeRefreshGames();
    }

    // Si on est sur l'onglet "Wishlist", check version
    if (
      activeTab === TABS.FOLLOW_GAMES &&
      activeFollowTab === FOLLOW_GAME_TABS.WISHLIST &&
      steamId
    ) {
      maybeRefreshWishlist();
    }
  }, [activeTab, activeFollowTab, steamId, maybeRefreshGames, maybeRefreshWishlist]);

  // Gestionnaire pour le suivi/désuivi des jeux depuis les news
  // Tri de la wishlist
  const getSortedWishlist = useCallback(() => {
    let filtered = wishlistSearchQuery
      ? filterWishlist(wishlistSearchQuery)
      : wishlist;

    if (wishlistSortBy === 'recent') {
      // Tri par date d'ajout (plus récents d'abord)
      return [...filtered].sort((a, b) => b.date_added - a.date_added);
    } else if (wishlistSortBy === 'alphabetical') {
      // Tri alphabétique
      return [...filtered].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
    }
    return filtered;
  }, [wishlist, wishlistSearchQuery, wishlistSortBy, filterWishlist]);

  const wishlistEmptyComponent =
    wishlistSearchQuery !== '' ? (
      <NoResultsPlaceholder styles={styles} />
    ) : (
      <EmptyStateMessage
        styles={styles}
        iconName="sad-outline"
        title="Wishlist vide"
        text="Ajoutez les jeux qui vous intéressent pour les suivre ici."

        align="top"
      />
    );

  const handleWishlistPullToRefresh = useCallback(async () => {
    hasFetchedWishlistRef.current = false;
    await handleWishlistRefresh();
  }, [handleWishlistRefresh]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Steam Actu</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.headerButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Onglets principaux */}
      <View style={styles.tabsContainer}>
        {TAB_ITEMS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab.key)}>
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isNewsTab && (
        <View style={styles.subTabsContainer}>
          {NEWS_TAB_ITEMS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.subTabButton,
                activeNewsTab === tab.key && styles.subTabButtonActive,
              ]}
              onPress={() => setActiveNewsTab(tab.key)}>
              <Text
                style={[
                  styles.subTabButtonText,
                  activeNewsTab === tab.key && styles.subTabButtonTextActive,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sous-onglets pour "Suivre un jeu" */}
      {isFollowGamesTab && (
        <View style={styles.subTabsContainer}>
          {FOLLOW_GAME_TAB_ITEMS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.subTabButton,
                activeFollowTab === tab.key && styles.subTabButtonActive,
              ]}
              onPress={() => setActiveFollowTab(tab.key)}>
              <Text
                style={[
                  styles.subTabButtonText,
                  activeFollowTab === tab.key && styles.subTabButtonTextActive,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Contenu selon l'onglet actif */}
      {isNewsTab ? (
        isFeedTab ? (
          <NewsTab
            steamId={steamId}
            newsState={newsState}
            fetchNews={fetchNews}
          />
        ) : (
          <FollowedGamesTab styles={styles} />
        )
      ) : isFollowGamesTab ? (
        <>
          {activeFollowTab === FOLLOW_GAME_TABS.MY_GAMES ? (
            <>
              <SearchBar />
              <SortOptions
                options={MY_GAMES_SORT_OPTIONS}
                selectedValue={sortOption}
                onSelect={handleMyGamesSortChange}
              />
              {gamesLoading ? (
                <LoadingContainer text="Chargement des jeux..." />
              ) : (
                <GamesList />
              )}
            </>
          ) : activeFollowTab === FOLLOW_GAME_TABS.WISHLIST ? (
            <>
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

              {wishlistLoading && !wishlistRefreshing ? (
                <LoadingContainer text="Chargement de la wishlist..." />
              ) : (
                <FlatList
                  data={getSortedWishlist()}
                  renderItem={({item}) => {
                    const appId = item.appid ? item.appid.toString() : null;
                    const gameName =
                      item.name || (appId ? `Jeu ${appId}` : 'Jeu Steam');
                    const fallbackImage =
                      appId &&
                      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
                    const imageUrl =
                      item.header_image || item.capsule || fallbackImage;

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
                                  updateWishlistFollowState(
                                    appId,
                                    nextIsFollowed,
                                  ),
                              }
                            : null
                        }
                      />
                    );
                  }}
                  keyExtractor={(item, index) =>
                    item.appid ? item.appid.toString() : `wishlist-${index}`
                  }
                  contentContainerStyle={styles.wishlistList}
                  ListEmptyComponent={wishlistEmptyComponent}
                  refreshControl={
                  <RefreshControl
                    refreshing={wishlistRefreshing}
                    onRefresh={handleWishlistPullToRefresh}
                    tintColor={COLORS.STEAM_BLUE}
                    colors={[COLORS.STEAM_BLUE]}
                  />
                  }
                />
              )}
            </>
          ) : (
            <SearchGameTab styles={styles} />
          )}
        </>
      ) : null}

      <SortModal />
      <FilterModal />
    </SafeAreaView>
  );
};

export default HomeScreen;
