import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useLastVerificationDate} from '../hooks/useAsyncStorage';
import {useGameSync} from '../hooks/useGameSync';
import {
  debugError,
  debugLog,
  showAlert,
  showSuccessMessage,
} from '../hooks/hooksLogger';
import {translate} from '../i18n';
import {unregisterFCMToken} from '../services/notificationService';
import {isRecentlyUpdated} from '../utils';
import {getUserScopedStorageKeys} from './app/libraryHelpers';
import {useAppBootstrap} from './app/useAppBootstrap';
import {useAppLifecycleRefresh} from './app/useAppLifecycleRefresh';
import {useAppNotificationsBridge} from './app/useAppNotificationsBridge';
import {useFollowedGamesActions} from './app/useFollowedGamesActions';
import {useGamesFiltering} from './app/useGamesFiltering';
import {useGamesLibraryController} from './app/useGamesLibraryController';
import {useNotificationSyncBus} from './app/useNotificationSyncBus';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({children, navigation = null}) => {
  const {syncRecentActiveGames} = useGameSync();
  const {updateVerificationDate, isOlderThanOneDay} = useLastVerificationDate();
  const {registerNotificationSyncHandler, notifyNotificationSync} =
    useNotificationSyncBus();

  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState(null);
  const [wishlistVersion, setWishlistVersion] = useState(null);

  const onLogoutRef = useRef(null);

  const {
    authStatus,
    isBootstrapping,
    isAuthenticated,
    applySignedInSession,
    applySignedOutSession,
  } = useAppBootstrap({
    setSteamId,
    setUser,
  });

  const {
    games,
    setGames,
    loading,
    refreshing,
    gamesVersion,
    setGamesVersion,
    lastRefreshTime,
    loadData,
    handleRefresh,
    checkForNewGames,
    maybeRefreshGames,
    refreshRecentsPlus,
    persistGamesCache,
    persistGamesVersion,
    markSkipNextGamesRefresh,
    resetGamesLibraryState,
  } = useGamesLibraryController({
    steamId,
    setSteamId,
    setUser,
    updateVerificationDate,
    syncRecentActiveGames,
    onLogoutRef,
  });

  const {
    filteredGames,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    filterAndSortGames,
  } = useGamesFiltering(games);

  const {
    applyNotificationUnfollowCommit,
    handleFollowGame,
    getResolvedFollowState,
    isGameFollowed,
    isFollowPending,
  } =
    useFollowedGamesActions({
      steamId,
      user,
      setUser,
      games,
      setGames,
      persistGamesCache,
      persistGamesVersion,
      markSkipNextGamesRefresh,
    });

  const handleLogout = useCallback(async () => {
    try {
      debugLog('\n[LOGOUT] Starting sign-out...');
      debugLog('[LOGOUT] steamId before reset:', steamId || '(empty)');
      debugLog('[LOGOUT] games count before reset:', games.length);

      if (steamId) {
        try {
          await unregisterFCMToken(steamId);
          debugLog('[LOGOUT] FCM token removed from backend');
        } catch (fcmError) {
          debugError('[LOGOUT] Failed to remove FCM token:', fcmError);
        }
      }

      const currentSteamId =
        steamId || (await AsyncStorage.getItem('steamId')) || null;

      const storageKeys = [
        'steamId',
        'lastVerificationDate',
        'newsNotifications',
        'libraryFollowMode',
        'wishlistFollowMode',
        'sortOption',
        'gamesVersion',
        'wishlistVersion',
        'pendingAuthToken',
        ...getUserScopedStorageKeys(currentSteamId),
      ].filter(Boolean);

      await AsyncStorage.multiRemove(storageKeys);
      debugLog('[LOGOUT] AsyncStorage cleared', storageKeys);

      resetGamesLibraryState();
      applySignedOutSession();
      setWishlistVersion(null);
      setSearchQuery('');
      await setSortOption('default');

      if (!navigation) {
        showSuccessMessage(
          translate('auth.logoutSuccessTitle'),
          translate('auth.logoutSuccessMessage'),
        );
      }

      debugLog('[LOGOUT] Sign-out completed\n');
    } catch (error) {
      debugError('[LOGOUT] Sign-out failed:', error);
      showAlert(
        translate('auth.logoutErrorTitle'),
        translate('auth.logoutErrorMessage'),
      );
    }
  }, [
    applySignedOutSession,
    games.length,
    navigation,
    resetGamesLibraryState,
    setSearchQuery,
    setSortOption,
    steamId,
  ]);

  onLogoutRef.current = handleLogout;

  useAppNotificationsBridge({
    steamId,
    notifyNotificationSync,
    onNotificationUnfollowCommitted: applyNotificationUnfollowCommit,
  });

  useAppLifecycleRefresh({
    enabled: isAuthenticated,
    loadData,
    steamId,
    gamesLength: games.length,
    loading,
    refreshing,
    checkForNewGames,
    lastRefreshTime,
    isOlderThanOneDay,
  });

  const contextValue = useMemo(
    () => ({
      games,
      filteredGames,
      loading,
      refreshing,
      authStatus,
      isBootstrapping,
      isAuthenticated,
      steamId,
      user,
      searchQuery,
      sortOption,
      gamesVersion,
      wishlistVersion,
      setSearchQuery,
      setSortOption,
      setGamesVersion,
      setWishlistVersion,
      loadData,
      handleRefresh,
      handleLogout,
      applySignedInSession,
      handleFollowGame,
      getResolvedFollowState,
      checkForNewGames,
      isRecentlyUpdated,
      filterAndSortGames,
      isGameFollowed,
      isFollowPending,
      maybeRefreshGames,
      refreshRecentsPlus,
      registerNotificationSyncHandler,
    }),
    [
      checkForNewGames,
      filterAndSortGames,
      filteredGames,
      games,
      gamesVersion,
      getResolvedFollowState,
      authStatus,
      applySignedInSession,
      handleFollowGame,
      handleLogout,
      handleRefresh,
      isAuthenticated,
      isGameFollowed,
      isBootstrapping,
      isFollowPending,
      loadData,
      loading,
      maybeRefreshGames,
      refreshRecentsPlus,
      refreshing,
      registerNotificationSyncHandler,
      searchQuery,
      setGamesVersion,
      setSearchQuery,
      setSortOption,
      sortOption,
      steamId,
      user,
      wishlistVersion,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
