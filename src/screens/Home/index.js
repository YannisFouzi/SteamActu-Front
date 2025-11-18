import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    FlatList,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { State as GestureState, PanGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import GameCard from '../../components/GameCard';
import LoadingContainer from '../../components/LoadingContainer';
import { COLORS } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { debugLog } from '../../hooks/hooksLogger';
import { useNewsManager } from '../../hooks/useNewsManager';
import { useWishlist } from '../../hooks/useWishlist';
import TutorialTarget from '../../tutorial/TutorialTarget';
import { TUTORIAL_STEPS } from '../../tutorial/steps';
import { useTutorial } from '../../tutorial/useTutorial';
import EmptyStateMessage from './components/EmptyStateMessage';
import FollowedGamesTab from './components/FollowedGamesTab';
import GamesList from './components/GamesList';
import NewsTab from './components/NewsTab';
import NoResultsPlaceholder from './components/NoResultsPlaceholder';
import SearchBar from './components/SearchBar';
import SearchGameTab from './components/SearchGameTab';
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
  {key: NEWS_TABS.FEED, label: 'Fil'},
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

const buildFollowKey = subTab => `follow-${subTab}`;
const buildNewsKey = subTab => `news-${subTab}`;

const SWIPE_TRANSITIONS = {
  right: {
    [buildFollowKey(FOLLOW_GAME_TABS.SEARCH)]: {
      target: TABS.FOLLOW_GAMES,
      followTab: FOLLOW_GAME_TABS.WISHLIST,
    },
    [buildFollowKey(FOLLOW_GAME_TABS.WISHLIST)]: {
      target: TABS.FOLLOW_GAMES,
      followTab: FOLLOW_GAME_TABS.MY_GAMES,
    },
    [buildFollowKey(FOLLOW_GAME_TABS.MY_GAMES)]: {
      target: TABS.NEWS,
      newsTab: NEWS_TABS.FEED,
    },
    [buildNewsKey(NEWS_TABS.FOLLOWED_GAMES)]: {
      target: TABS.NEWS,
      newsTab: NEWS_TABS.FEED,
    },
    [buildNewsKey(NEWS_TABS.FEED)]: {
      target: TABS.FOLLOW_GAMES,
      followTab: FOLLOW_GAME_TABS.MY_GAMES,
    },
  },
  left: {
    [buildFollowKey(FOLLOW_GAME_TABS.MY_GAMES)]: {
      target: TABS.FOLLOW_GAMES,
      followTab: FOLLOW_GAME_TABS.WISHLIST,
    },
    [buildFollowKey(FOLLOW_GAME_TABS.WISHLIST)]: {
      target: TABS.FOLLOW_GAMES,
      followTab: FOLLOW_GAME_TABS.SEARCH,
    },
    [buildNewsKey(NEWS_TABS.FEED)]: {
      target: TABS.NEWS,
      newsTab: NEWS_TABS.FOLLOWED_GAMES,
    },
    [buildNewsKey(NEWS_TABS.FOLLOWED_GAMES)]: {
      target: TABS.FOLLOW_GAMES,
      followTab: FOLLOW_GAME_TABS.MY_GAMES,
    },
  },
};

const SWIPE_THRESHOLD = 60;
const SWIPE_VERTICAL_TOLERANCE = 35;

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
    registerNotificationSyncHandler,
  } = useAppContext();
  const { startTutorialIfNeeded, state: tutorialState } = useTutorial();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(TABS.NEWS);
  const [activeNewsTab, setActiveNewsTab] = useState(NEWS_TABS.FEED);
  const [activeFollowTab, setActiveFollowTab] = useState(
    FOLLOW_GAME_TABS.MY_GAMES,
  );
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState('');
  const [wishlistSortBy, setWishlistSortBy] = useState('recent');
  const [pendingTransition, setPendingTransition] = useState(null);
  const {width: windowWidth} = useWindowDimensions();
  const gestureTranslationX = useRef(new Animated.Value(0)).current;
  const gestureTranslationY = useRef(new Animated.Value(0)).current;
  const windowWidthAnimated = useRef(new Animated.Value(windowWidth)).current;
  useEffect(() => {
    windowWidthAnimated.setValue(windowWidth);
  }, [windowWidth, windowWidthAnimated]);
  const negativeWindowWidthAnimated = useMemo(
    () => Animated.multiply(windowWidthAnimated, -1),
    [windowWidthAnimated],
  );
  const pendingTransitionRef = useRef(pendingTransition);
  useEffect(() => {
    pendingTransitionRef.current = pendingTransition;
  }, [pendingTransition]);

  const tutorialStatus = tutorialState?.status;
  const tutorialStepIndex = tutorialState?.stepIndex;

  useEffect(() => {
    if (tutorialStatus !== 'running') {
      return;
    }

    const step =
      typeof tutorialStepIndex === 'number'
        ? TUTORIAL_STEPS[tutorialStepIndex]
        : null;
    if (!step || step.screen !== 'Home') {
      return;
    }

    switch (step.id) {
      case 'home-intro':
        if (activeTab !== TABS.NEWS) {
          setActiveTab(TABS.NEWS);
        }
        if (activeNewsTab !== NEWS_TABS.FEED) {
          setActiveNewsTab(NEWS_TABS.FEED);
        }
        break;
      case 'home-news-followed':
        if (activeTab !== TABS.NEWS) {
          setActiveTab(TABS.NEWS);
        }
        if (activeNewsTab !== NEWS_TABS.FOLLOWED_GAMES) {
          setActiveNewsTab(NEWS_TABS.FOLLOWED_GAMES);
        }
        break;
      case 'home-my-games':
        if (activeTab !== TABS.FOLLOW_GAMES) {
          setActiveTab(TABS.FOLLOW_GAMES);
        }
        if (activeFollowTab !== FOLLOW_GAME_TABS.MY_GAMES) {
          setActiveFollowTab(FOLLOW_GAME_TABS.MY_GAMES);
        }
        break;
      case 'home-wishlist':
        if (activeTab !== TABS.FOLLOW_GAMES) {
          setActiveTab(TABS.FOLLOW_GAMES);
        }
        if (activeFollowTab !== FOLLOW_GAME_TABS.WISHLIST) {
          setActiveFollowTab(FOLLOW_GAME_TABS.WISHLIST);
        }
        break;
      case 'home-search':
        if (activeTab !== TABS.FOLLOW_GAMES) {
          setActiveTab(TABS.FOLLOW_GAMES);
        }
        if (activeFollowTab !== FOLLOW_GAME_TABS.SEARCH) {
          setActiveFollowTab(FOLLOW_GAME_TABS.SEARCH);
        }
        break;
      default:
        break;
    }
  }, [
    activeFollowTab,
    activeNewsTab,
    activeTab,
    tutorialStatus,
    tutorialStepIndex,
  ]);
  const isNewsTab = activeTab === TABS.NEWS;
  const isFollowGamesTab = activeTab === TABS.FOLLOW_GAMES;
  const isFeedTab = activeNewsTab === NEWS_TABS.FEED;
  const handleMyGamesSortChange = useCallback(
    option => {
      setSortOption(option);
      filterAndSortGames();
    },
    [filterAndSortGames, setSortOption],
  );

  const applyTransition = useCallback(
    transition => {
      if (!transition) {
        return;
      }

      if (transition.target === TABS.NEWS) {
        if (activeTab !== TABS.NEWS) {
          setActiveTab(TABS.NEWS);
        }
        if (transition.newsTab && activeNewsTab !== transition.newsTab) {
          setActiveNewsTab(transition.newsTab);
        }
      } else if (transition.target === TABS.FOLLOW_GAMES) {
        if (activeTab !== TABS.FOLLOW_GAMES) {
          setActiveTab(TABS.FOLLOW_GAMES);
        }
        if (transition.followTab && activeFollowTab !== transition.followTab) {
          setActiveFollowTab(transition.followTab);
        }
      }
    },
    [
      activeTab,
      activeFollowTab,
      activeNewsTab,
      setActiveTab,
      setActiveFollowTab,
      setActiveNewsTab,
    ],
  );

  const computeTransitionState = useCallback(
    transition => {
      if (!transition) {
        return {
          tab: activeTab,
          newsTab: activeNewsTab,
          followTab: activeFollowTab,
        };
      }

      if (transition.target === TABS.NEWS) {
        return {
          tab: TABS.NEWS,
          newsTab: transition.newsTab || NEWS_TABS.FEED,
          followTab: activeFollowTab,
        };
      }

      return {
        tab: TABS.FOLLOW_GAMES,
        newsTab: activeNewsTab,
        followTab: transition.followTab || FOLLOW_GAME_TABS.MY_GAMES,
      };
    },
    [activeTab, activeFollowTab, activeNewsTab],
  );

  const resolveTransition = useCallback(
    direction => {
      const currentRoute = isNewsTab
        ? buildNewsKey(activeNewsTab)
        : buildFollowKey(activeFollowTab);

      return SWIPE_TRANSITIONS[direction]?.[currentRoute] || null;
    },
    [activeFollowTab, activeNewsTab, isNewsTab],
  );

  const handleGestureUpdate = useCallback(
    ({nativeEvent}) => {
      const {translationX, translationY, state} = nativeEvent;

      if (state === GestureState.BEGAN) {
        pendingTransitionRef.current = null;
        setPendingTransition(null);
        return;
      }

      if (state !== GestureState.ACTIVE) {
        return;
      }

      const clampedX = Math.max(-windowWidth, Math.min(windowWidth, translationX));
      if (clampedX !== translationX) {
        gestureTranslationX.setValue(clampedX);
      }

      if (Math.abs(translationY) > SWIPE_VERTICAL_TOLERANCE) {
        if (pendingTransitionRef.current) {
          pendingTransitionRef.current = null;
          setPendingTransition(null);
        }
        return;
      }

      if (!pendingTransitionRef.current) {
        if (Math.abs(clampedX) > 12) {
          const direction = clampedX > 0 ? 'right' : 'left';
          const transition = resolveTransition(direction);
          if (transition) {
            const nextPending = {direction, transition};
            pendingTransitionRef.current = nextPending;
            setPendingTransition(nextPending);
          }
        }
      } else {
        const expectedDirection = pendingTransitionRef.current.direction;
        if (
          (expectedDirection === 'left' && clampedX > 4) ||
          (expectedDirection === 'right' && clampedX < -4)
        ) {
          pendingTransitionRef.current = null;
          setPendingTransition(null);
        }
      }
    },
    [
      gestureTranslationX,
      pendingTransitionRef,
      resolveTransition,
      setPendingTransition,
      windowWidth,
    ],
  );

  const handleGestureEnd = useCallback(
    ({nativeEvent}) => {
      const {translationX, translationY} = nativeEvent;
      const absTranslationX = Math.abs(translationX);
      const absTranslationY = Math.abs(translationY);
      const activePending = pendingTransitionRef.current;
      const transition = activePending?.transition || null;
      const direction =
        activePending?.direction || (translationX > 0 ? 'right' : 'left');

      const resetGesture = () => {
        gestureTranslationX.stopAnimation();
        Animated.spring(gestureTranslationX, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: false,
        }).start(() => {
          gestureTranslationX.setValue(0);
          gestureTranslationY.setValue(0);
        });
        pendingTransitionRef.current = null;
        setPendingTransition(null);
      };

      if (
        absTranslationX < SWIPE_THRESHOLD ||
        absTranslationY > SWIPE_VERTICAL_TOLERANCE ||
        !transition
      ) {
        resetGesture();
        return;
      }

      const slideOutTarget =
        direction === 'left' ? -windowWidth : windowWidth;

      gestureTranslationX.stopAnimation();
      Animated.timing(gestureTranslationX, {
        toValue: slideOutTarget,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        applyTransition(transition);
        gestureTranslationY.setValue(0);
        if (activePending) {
          const committedTransition = {...activePending, committed: true};
          pendingTransitionRef.current = committedTransition;
          setPendingTransition(committedTransition);
        }
      });
    },
    [
      applyTransition,
      gestureTranslationX,
      gestureTranslationY,
      pendingTransitionRef,
      windowWidth,
    ],
  );

  const onGestureEvent = useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent: {
              translationX: gestureTranslationX,
              translationY: gestureTranslationY,
            },
          },
        ],
        {useNativeDriver: false, listener: handleGestureUpdate},
      ),
    [gestureTranslationX, gestureTranslationY, handleGestureUpdate],
  );

  useEffect(() => {
    const pending = pendingTransitionRef.current;
    if (pending && pending.committed) {
      const expectedState = computeTransitionState(pending.transition);
      if (
        expectedState.tab === activeTab &&
        expectedState.newsTab === activeNewsTab &&
        expectedState.followTab === activeFollowTab
      ) {
        gestureTranslationX.setValue(0);
        gestureTranslationY.setValue(0);
        pendingTransitionRef.current = null;
        setPendingTransition(null);
      }
    }
  }, [
    activeTab,
    activeNewsTab,
    activeFollowTab,
    computeTransitionState,
    gestureTranslationX,
    gestureTranslationY,
  ]);

  const previousTabState = useRef({isNewsTab, isFeedTab});
  const isFirstRender = useRef(true);
  const hasFetchedWishlistRef = useRef(false);
  const followedGamesExternalHandlerRef = useRef(null);
  useEffect(() => {
    if (steamId) {
      startTutorialIfNeeded();
    }
  }, [steamId, startTutorialIfNeeded]);


  const registerFollowedGamesExternalHandler = useCallback(handler => {
    followedGamesExternalHandlerRef.current = handler;
    return () => {
      if (followedGamesExternalHandlerRef.current === handler) {
        followedGamesExternalHandlerRef.current = null;
      }
    };
  }, []);

  // Hook wishlist
  const {
    wishlist,
    loading: wishlistLoading,
    refreshing: wishlistRefreshing,
    fetchWishlist,
    handleRefresh: handleWishlistRefresh,
    filterWishlist,
    updateWishlistFollowState,
    removeWishlistEntry,
    maybeRefreshWishlist,
  } = useWishlist(steamId);

  // Hook personnalisé pour la gestion des news
  const {
    newsState,
    fetchNews,
    isNewsInitialized,
    isNewsLoading,
    removeNewsByAppId,
  } = useNewsManager(steamId);

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
        if (!gamesLoading) {
          debugLog('[HOME] focus event -> maybeRefreshGames()');
          maybeRefreshGames('homeFocus');
        } else {
          debugLog('[HOME] focus event -> maybeRefreshGames() skip (loading)');
        }

        if (
          activeTab === TABS.FOLLOW_GAMES &&
          activeFollowTab === FOLLOW_GAME_TABS.WISHLIST
        ) {
          if (!wishlistLoading && !wishlistRefreshing) {
            debugLog('[HOME] focus event -> maybeRefreshWishlist()');
            maybeRefreshWishlist('homeFocus');
          } else {
            debugLog(
              '[HOME] focus event -> maybeRefreshWishlist() skip (loading)',
            );
          }
        }
      }
    };

    const focusUnsubscribe = navigation.addListener('focus', onFocus);

    return () => {
      focusUnsubscribe();
    };
    }, [
      navigation,
      isNewsTab,
      fetchNews,
      steamId,
      activeTab,
      activeFollowTab,
      gamesLoading,
      wishlistLoading,
      wishlistRefreshing,
      maybeRefreshGames,
      maybeRefreshWishlist,
    ]);

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
      if (!gamesLoading) {
        debugLog('[HOME] tab switch -> maybeRefreshGames()');
        maybeRefreshGames('tabSwitch');
      } else {
        debugLog('[HOME] tab switch -> maybeRefreshGames() skip (loading)');
      }
    }

    // Si on est sur l'onglet "Wishlist", check version
    if (
      activeTab === TABS.FOLLOW_GAMES &&
      activeFollowTab === FOLLOW_GAME_TABS.WISHLIST &&
      steamId
    ) {
      if (!wishlistLoading && !wishlistRefreshing) {
        debugLog('[HOME] tab switch -> maybeRefreshWishlist()');
        maybeRefreshWishlist('tabSwitch');
      } else {
        debugLog(
          '[HOME] tab switch -> maybeRefreshWishlist() skip (loading)',
        );
      }
    }
  }, [
    activeTab,
    activeFollowTab,
    gamesLoading,
    steamId,
    wishlistLoading,
    wishlistRefreshing,
    maybeRefreshGames,
    maybeRefreshWishlist,
  ]);

  useEffect(() => {
    if (typeof registerNotificationSyncHandler !== 'function') {
      return undefined;
    }

    const unregisterNews = registerNotificationSyncHandler('news', appId => {
      removeNewsByAppId(appId);
    });
    const unregisterWishlist = registerNotificationSyncHandler(
      'wishlist',
      appId => {
        removeWishlistEntry(appId);
      },
    );
    const unregisterFollowed = registerNotificationSyncHandler(
      'followed',
      appId => {
        if (followedGamesExternalHandlerRef.current) {
          followedGamesExternalHandlerRef.current(appId);
        }
      },
    );

    return () => {
      unregisterNews();
      unregisterWishlist();
      unregisterFollowed();
    };
  }, [
    registerNotificationSyncHandler,
    removeNewsByAppId,
    removeWishlistEntry,
  ]);

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

  const renderFollowTabContent = useCallback(
    followTabKey => {
      if (followTabKey === FOLLOW_GAME_TABS.MY_GAMES) {
  return (
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
        );
      }

      if (followTabKey === FOLLOW_GAME_TABS.WISHLIST) {
        return (
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
                  keyboardShouldPersistTaps="handled"
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
        );
      }

      return <SearchGameTab styles={styles} />;
    },
    [
      gamesLoading,
      getSortedWishlist,
      handleMyGamesSortChange,
      handleWishlistPullToRefresh,
      setWishlistSearchQuery,
      setWishlistSortBy,
      sortOption,
      styles,
      updateWishlistFollowState,
      wishlistEmptyComponent,
      wishlistLoading,
      wishlistRefreshing,
      wishlistSearchQuery,
      wishlistSortBy,
    ],
  );

  const renderSceneContent = useCallback(
    (tabKey, newsTabKey, followTabKey) => {
      if (tabKey === TABS.NEWS) {
        return newsTabKey === NEWS_TABS.FEED ? (
          <NewsTab
            steamId={steamId}
            newsState={newsState}
            fetchNews={fetchNews}
          />
        ) : (
          <FollowedGamesTab
            styles={styles}
            onToggleFollowState={updateWishlistFollowState}
            registerExternalUnfollowHandler={
              registerFollowedGamesExternalHandler
            }
          />
        );
      }

      if (tabKey === TABS.FOLLOW_GAMES) {
        return renderFollowTabContent(followTabKey);
      }

      return null;
    },
    [
      fetchNews,
      newsState,
      renderFollowTabContent,
      updateWishlistFollowState,
      steamId,
    styles,
    registerFollowedGamesExternalHandler,
    ],
  );

  const currentSceneContent = renderSceneContent(
    activeTab,
    activeNewsTab,
    activeFollowTab,
  );

  const targetState = pendingTransition
    ? computeTransitionState(pendingTransition.transition)
    : null;

  const targetSceneContent = targetState
    ? renderSceneContent(
        targetState.tab,
        targetState.newsTab,
        targetState.followTab,
      )
    : null;

  const nextTranslateX =
    pendingTransition && targetState
      ? Animated.add(
          gestureTranslationX,
          pendingTransition.direction === 'left'
            ? windowWidthAnimated
            : negativeWindowWidthAnimated,
        )
      : null;

  const currentTransforms = pendingTransition
    ? [{translateX: gestureTranslationX}]
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Steam Actu</Text>
        <TutorialTarget id="home-settings-button">
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
        </TutorialTarget>
      </View>

      <PanGestureHandler
        activeOffsetX={[-15, 15]}
        failOffsetY={[-15, 15]}
        onGestureEvent={onGestureEvent}
        onEnded={handleGestureEnd}>
        <View style={styles.gestureRoot}>
          <TutorialTarget id="home-tabs" style={styles.tabsContainer}>
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
          </TutorialTarget>

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
                      activeFollowTab === tab.key &&
                        styles.subTabButtonTextActive,
                    ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.contentHost}>
            {pendingTransition && targetState ? (
              <>
                <Animated.View
                  style={[
                    styles.pageContainer,
                    {width: windowWidth},
                    {transform: currentTransforms},
                  ]}>
                  {currentSceneContent}
                </Animated.View>
                <Animated.View
                  style={[
                    styles.pageContainer,
                    {width: windowWidth},
                    {transform: [{translateX: nextTranslateX}]},
                  ]}>
                  {targetSceneContent}
                </Animated.View>
              </>
            ) : (
              <View style={styles.contentInner}>{currentSceneContent}</View>
            )}
          </View>
        </View>
      </PanGestureHandler>

    </SafeAreaView>
  );
};

export default HomeScreen;
