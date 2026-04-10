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
import {useUserSettingsController} from './app/useUserSettingsController';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({children, navigation = null}) => {
  const {syncRecentActiveGames} = useGameSync();
  const {updateVerificationDate, isOlderThanOneDay} = useLastVerificationDate();
  const {registerNotificationSyncHandler, notifyNotificationSync} =
    useNotificationSyncBus();

  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState(null);
  const [steamProfile, setSteamProfile] = useState(null);
  const [wishlistVersion, setWishlistVersion] = useState(null);

  const onLogoutRef = useRef(null);
  const pendingFollowsRef = useRef(new Set());

  const {
    authStatus,
    isBootstrapping: isAuthBootstrapping,
    isAuthenticated,
    applySignedInSession,
    applySignedOutSession,
  } = useAppBootstrap({
    setSteamId,
    setUser,
    setSteamProfile,
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
    pendingFollowsRef,
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

  const {
    settingsStatus,
    isUserSettingsReady,
    loading: settingsLoading,
    saving: settingsSaving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    resetUserSettingsState,
    hydrateUserSettings,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
  } = useUserSettingsController({
    steamId,
    user,
    isAuthenticated,
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
      resetUserSettingsState();
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
    resetUserSettingsState,
    resetGamesLibraryState,
    setSearchQuery,
    setSortOption,
    steamId,
  ]);

  onLogoutRef.current = handleLogout;

  useAppNotificationsBridge({
    steamId,
    settingsStatus,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    notifyNotificationSync,
    onNotificationUnfollowCommitted: applyNotificationUnfollowCommit,
    setUser,
    pendingFollowsRef,
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
      isBootstrapping: isAuthBootstrapping,
      isAuthenticated,
      steamId,
      user,
      settingsStatus,
      isUserSettingsReady,
      settingsLoading,
      settingsSaving,
      steamProfile,
      newsNotifications,
      libraryFollowMode,
      wishlistFollowMode,
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
      hydrateUserSettings,
      handleToggleNews,
      handleLibraryModeChange,
      handleWishlistModeChange,
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
      handleLibraryModeChange,
      handleLogout,
      handleRefresh,
      handleToggleNews,
      handleWishlistModeChange,
      hydrateUserSettings,
      isAuthenticated,
      isGameFollowed,
      isAuthBootstrapping,
      isFollowPending,
      isUserSettingsReady,
      libraryFollowMode,
      loadData,
      loading,
      maybeRefreshGames,
      newsNotifications,
      refreshRecentsPlus,
      refreshing,
      registerNotificationSyncHandler,
      searchQuery,
      settingsLoading,
      settingsSaving,
      settingsStatus,
      setGamesVersion,
      setSearchQuery,
      setSortOption,
      sortOption,
      steamId,
      steamProfile,
      user,
      wishlistVersion,
      wishlistFollowMode,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
