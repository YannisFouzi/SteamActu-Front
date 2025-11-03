import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LoadingContainer from '../../components/common/LoadingContainer';
import {COLORS} from '../../constants/theme';
import {useAppContext} from '../../context/AppContext';
import {useNewsManager} from '../../hooks/useNewsManager';
import {useWishlist} from '../../hooks/useWishlist';
import FilterModal from './components/FilterModal';
import GamesList from './components/GamesList';
import NewsTab from './components/NewsTab';
import SearchBar from './components/SearchBar';
import SearchGameTab from './components/SearchGameTab';
import SortModal from './components/SortModal';
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
  FOLLOWED: 'followed',
  // ⚠️ DÉSACTIVÉ : Onglet "Tous mes jeux" trop gourmand en ressources
  // Pour réactiver : décommenter ci-dessous + cron checkNews + newsFeedService
  // ALL_GAMES: 'allGames',
};

const NEWS_TAB_ITEMS = [
  {key: NEWS_TABS.FOLLOWED, label: 'Jeux suivis'},
  // ⚠️ DÉSACTIVÉ : Voir commentaire ligne 38
  // {key: NEWS_TABS.ALL_GAMES, label: 'Tous mes jeux'},
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

const HomeScreen = () => {
  const {
    loading: gamesLoading,
    refreshing,
    handleRefresh,
    steamId,
    handleFollowGame,
    isGameFollowed,
  } = useAppContext();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(TABS.NEWS);
  const [activeNewsTab, setActiveNewsTab] = useState(NEWS_TABS.FOLLOWED);
  const [activeFollowTab, setActiveFollowTab] = useState(
    FOLLOW_GAME_TABS.MY_GAMES,
  );
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState('');
  const [wishlistSortBy, setWishlistSortBy] = useState('recent'); // 'recent' ou 'alphabetical'

  const isNewsTab = activeTab === TABS.NEWS;
  const isFollowGamesTab = activeTab === TABS.FOLLOW_GAMES;
  const showFollowedNewsOnly = activeNewsTab === NEWS_TABS.FOLLOWED;

  // Hook wishlist
  const {
    wishlist,
    loading: wishlistLoading,
    refreshing: wishlistRefreshing,
    fetchWishlist,
    handleRefresh: handleWishlistRefresh,
    filterWishlist,
  } = useWishlist(steamId);

  // Hook personnalisé pour la gestion des news
  const {
    newsState,
    fetchNews,
    updateNewsFollowStatus,
    isNewsInitialized,
    isNewsLoading,
  } = useNewsManager(steamId, showFollowedNewsOnly);

  // Charger les news au premier accès à l'onglet
  useEffect(() => {
    if (isNewsTab && !isNewsInitialized && !isNewsLoading) {
      fetchNews();
    }
  }, [isNewsTab, isNewsInitialized, isNewsLoading, fetchNews]);

  // Charger la wishlist au premier accès
  useEffect(() => {
    if (
      isFollowGamesTab &&
      activeFollowTab === FOLLOW_GAME_TABS.WISHLIST &&
      steamId &&
      wishlist.length === 0 &&
      !wishlistLoading
    ) {
      fetchWishlist();
    }
  }, [
    isFollowGamesTab,
    activeFollowTab,
    steamId,
    wishlist.length,
    wishlistLoading,
    fetchWishlist,
  ]);

  useEffect(() => {
    const onFocus = () => {
      if (!refreshing) {
        handleRefresh();
      }

      if (isNewsTab) {
        fetchNews({silent: true});
      }
    };

    const focusUnsubscribe = navigation.addListener('focus', onFocus);

    return () => {
      focusUnsubscribe();
    };
  }, [navigation, handleRefresh, refreshing, isNewsTab, fetchNews]);

  // Gestionnaire pour le suivi/désuivi des jeux depuis les news
  const handleNewsToggleFollow = useCallback(
    async (appId, isFollowed) => {
      if (!appId) return;

      try {
        await handleFollowGame(appId, isFollowed);
        updateNewsFollowStatus(appId, isFollowed);
      } catch (error) {
        console.error('Erreur lors du changement de suivi:', error);
      }
    },
    [handleFollowGame, updateNewsFollowStatus],
  );

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

      {/* Sous-onglets pour "Actus" */}
      {/* ⚠️ DÉSACTIVÉ : Plus besoin de sous-onglets avec un seul choix */}
      {/* {isNewsTab && NEWS_TAB_ITEMS.length > 1 && (
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
      )} */}

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
        <NewsTab
          steamId={steamId}
          showFollowedNewsOnly={showFollowedNewsOnly}
          newsState={newsState}
          fetchNews={fetchNews}
          handleFollowGame={handleNewsToggleFollow}
        />
      ) : isFollowGamesTab ? (
        <>
          {activeFollowTab === FOLLOW_GAME_TABS.MY_GAMES ? (
            <>
              <SearchBar />
              {gamesLoading ? (
                <LoadingContainer text="Chargement des jeux..." />
              ) : (
                <GamesList />
              )}
            </>
          ) : activeFollowTab === FOLLOW_GAME_TABS.WISHLIST ? (
            <>
              {/* Boutons de tri */}
              <View style={styles.wishlistSortContainer}>
                <TouchableOpacity
                  style={[
                    styles.wishlistSortButton,
                    wishlistSortBy === 'recent' &&
                      styles.wishlistSortButtonActive,
                  ]}
                  onPress={() => setWishlistSortBy('recent')}>
                  <Text
                    style={[
                      styles.wishlistSortButtonText,
                      wishlistSortBy === 'recent' &&
                        styles.wishlistSortButtonTextActive,
                    ]}>
                    📅 Récemment ajoutés
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.wishlistSortButton,
                    wishlistSortBy === 'alphabetical' &&
                      styles.wishlistSortButtonActive,
                  ]}
                  onPress={() => setWishlistSortBy('alphabetical')}>
                  <Text
                    style={[
                      styles.wishlistSortButtonText,
                      wishlistSortBy === 'alphabetical' &&
                        styles.wishlistSortButtonTextActive,
                    ]}>
                    🔤 Alphabétique
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher dans la wishlist..."
                  placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
                  value={wishlistSearchQuery}
                  onChangeText={setWishlistSearchQuery}
                />
                {wishlistSearchQuery !== '' && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setWishlistSearchQuery('')}>
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {wishlistLoading && !wishlistRefreshing ? (
                <LoadingContainer text="Chargement de la wishlist..." />
              ) : (
                <FlatList
                  data={getSortedWishlist()}
                  renderItem={({item}) => {
                    const appId = item.appid?.toString();
                    const isFollowed = appId ? isGameFollowed(appId) : false;

                    return (
                      <TouchableOpacity
                        style={styles.wishlistCardHorizontal}
                        onPress={() =>
                          navigation.navigate('GameDetails', {
                            appId: appId,
                            gameName: item.name,
                          })
                        }>
                        <Image
                          source={{uri: item.header_image || item.capsule}}
                          style={styles.wishlistImageHorizontal}
                          resizeMode="cover"
                        />
                        <View style={styles.wishlistInfoHorizontal}>
                          <Text
                            style={styles.wishlistNameHorizontal}
                            numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={styles.wishlistDateHorizontal}>
                            Ajouté le{' '}
                            {new Date(item.date_added * 1000).toLocaleDateString(
                              'fr-FR',
                            )}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.wishlistFollowButton}
                          onPress={e => {
                            e.stopPropagation();
                            if (appId) {
                              // Passer les infos du jeu pour la wishlist
                              handleFollowGame(appId, isFollowed, {
                                name: item.name,
                                logoUrl: item.header_image || item.capsule,
                              });
                            }
                          }}>
                          <Icon
                            name={
                              isFollowed
                                ? 'notifications'
                                : 'notifications-outline'
                            }
                            size={24}
                            color={isFollowed ? '#4CAF50' : '#757575'}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={item => item.appid.toString()}
                  contentContainerStyle={styles.wishlistList}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        {wishlistSearchQuery
                          ? 'Aucun jeu trouvé'
                          : 'Votre wishlist est vide'}
                      </Text>
                    </View>
                  }
                  refreshControl={
                    <RefreshControl
                      refreshing={wishlistRefreshing}
                      onRefresh={handleWishlistRefresh}
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

      {activeTab === TABS.FOLLOW_GAMES &&
      activeFollowTab === FOLLOW_GAME_TABS.MY_GAMES &&
      refreshing ? (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={COLORS.STEAM_BLUE} />
          <Text style={styles.loadingMoreText}>
            Analyse des jeux en cours... Les résultats seront mis à jour
            automatiquement.
          </Text>
        </View>
      ) : null}

      <SortModal />
      <FilterModal />
    </SafeAreaView>
  );
};

export default HomeScreen;
