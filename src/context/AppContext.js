import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    debugError,
    debugLog,
    reportError,
    showAlert,
    showSuccessMessage,
} from '../hooks/hooksLogger';
import { useLastVerificationDate } from '../hooks/useAsyncStorage';
import { useGameSync } from '../hooks/useGameSync';
import { translate } from '../i18n';
import {
  clearQueuedLanguagePreferenceSync,
} from '../services/languagePreferenceSync';
import { clearPendingFollowMutations } from '../services/followStateLocalStore';
import { clearQueuedFollowSync } from '../services/followSync';
import {
  clearQueuedUserSettingsSync,
} from '../services/userSettingsSync';
import { clearMobileSession } from '../services/mobileSessionStore';
import { unregisterFCMToken } from '../services/notificationService';
import { getUserScopedStorageKeys } from './app/libraryHelpers';
import { useAppBootstrap } from './app/useAppBootstrap';
import { useAppLifecycleRefresh } from './app/useAppLifecycleRefresh';
import { useAppNotificationsBridge } from './app/useAppNotificationsBridge';
import { useFollowedGamesActions } from './app/useFollowedGamesActions';
import { useGamesFiltering } from './app/useGamesFiltering';
import { useGamesLibraryController } from './app/useGamesLibraryController';
import { useGlobalSearch } from './app/useGlobalSearch';
import { useNotificationSyncBus } from './app/useNotificationSyncBus';
import { useOfflineSyncRuntime } from './app/useOfflineSyncRuntime';
import { useUserSettingsController } from './app/useUserSettingsController';

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
  const [visibilityHint, setVisibilityHint] = useState(null);

  const updateVisibilityHint = useCallback(partial => {
    if (!partial) {
      setVisibilityHint(null);
      return;
    }
    setVisibilityHint(prev => ({...(prev || {}), ...partial}));
  }, []);

  useEffect(() => {
    setVisibilityHint(null);
  }, [steamId]);

  const onLogoutRef = useRef(null);

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
    lastRefreshTime,
    loadData,
    handleRefresh,
    checkForNewGames,
    maybeRefreshGames,
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

  const {searchQuery, setSearchQuery, clearSearchQuery} = useGlobalSearch();

  const {
    filteredGames,
    sortOption,
    setSortOption,
    filterAndSortGames,
  } = useGamesFiltering(games);

  const {
    applyNotificationUnfollowCommit,
    handleFollowGame,
    handleToggleGameNotifications,
    getResolvedFollowState,
    isGameFollowed,
    isGameNotified,
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
      notifyNotificationSync,
    });

  const {
    settingsStatus,
    isUserSettingsReady,
    loading: settingsLoading,
    saving: settingsSaving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    confirmUnfollowGames,
    resetUserSettingsState,
    hydrateUserSettings,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
    handleConfirmUnfollowGamesChange,
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
        'confirmUnfollowGames',
        'sortOption',
        'gamesVersion',
        'wishlistVersion',
        'pendingAuthToken',
        ...getUserScopedStorageKeys(currentSteamId),
      ].filter(Boolean);

      await AsyncStorage.multiRemove(storageKeys);
      await clearQueuedLanguagePreferenceSync().catch(error => {
        debugError('[LOGOUT] Failed to clear queued language sync:', error);
      });
      await clearQueuedUserSettingsSync().catch(error => {
        debugError('[LOGOUT] Failed to clear queued settings sync:', error);
      });
      await clearQueuedFollowSync(currentSteamId).catch(error => {
        debugError('[LOGOUT] Failed to clear queued follow sync:', error);
      });
      await clearPendingFollowMutations(currentSteamId).catch(error => {
        debugError('[LOGOUT] Failed to clear pending follow mutations:', error);
      });
      await clearMobileSession();
      debugLog('[LOGOUT] AsyncStorage cleared', storageKeys);

      resetGamesLibraryState();
      resetUserSettingsState();
      applySignedOutSession();
      setWishlistVersion(null);
      clearSearchQuery();
      await setSortOption('default');

      if (!navigation) {
        showSuccessMessage(
          translate('auth.logoutSuccessTitle'),
          translate('auth.logoutSuccessMessage'),
        );
      }

      debugLog('[LOGOUT] Sign-out completed\n');
    } catch (error) {
      reportError(error, {scope: 'logout'});
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
    clearSearchQuery,
    setSortOption,
    steamId,
  ]);

  onLogoutRef.current = handleLogout;

  useOfflineSyncRuntime({
    enabled: isAuthenticated,
    scopeKey: steamId,
  });

  useAppNotificationsBridge({
    steamId,
    settingsStatus,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    notifyNotificationSync,
    onNotificationUnfollowCommitted: applyNotificationUnfollowCommit,
    setUser,
  });

  useAppLifecycleRefresh({
    enabled: isAuthenticated,
    loadData,
    steamId,
    gamesLength: games.length,
    loading,
    refreshing,
    checkForNewGames,
    maybeRefreshGames,
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
      confirmUnfollowGames,
      searchQuery,
      sortOption,
      wishlistVersion,
      setSearchQuery,
      setSortOption,
      setWishlistVersion,
      loadData,
      handleRefresh,
      handleLogout,
      hydrateUserSettings,
      handleToggleNews,
      handleLibraryModeChange,
      handleWishlistModeChange,
      handleConfirmUnfollowGamesChange,
      applySignedInSession,
      handleFollowGame,
      handleToggleGameNotifications,
      getResolvedFollowState,
      filterAndSortGames,
      isGameFollowed,
      isGameNotified,
      isFollowPending,
      maybeRefreshGames,
      registerNotificationSyncHandler,
      visibilityHint,
      updateVisibilityHint,
    }),
    [
      filterAndSortGames,
      filteredGames,
      games,
      getResolvedFollowState,
      authStatus,
      applySignedInSession,
      handleFollowGame,
      handleToggleGameNotifications,
      handleLibraryModeChange,
      handleLogout,
      handleRefresh,
      handleToggleNews,
      handleWishlistModeChange,
      handleConfirmUnfollowGamesChange,
      hydrateUserSettings,
      isAuthenticated,
      isGameFollowed,
      isGameNotified,
      isAuthBootstrapping,
      isFollowPending,
      isUserSettingsReady,
      libraryFollowMode,
      confirmUnfollowGames,
      loadData,
      loading,
      maybeRefreshGames,
      newsNotifications,
      refreshing,
      registerNotificationSyncHandler,
      searchQuery,
      settingsLoading,
      settingsSaving,
      settingsStatus,
      setSearchQuery,
      setSortOption,
      sortOption,
      steamId,
      steamProfile,
      user,
      wishlistVersion,
      wishlistFollowMode,
      visibilityHint,
      updateVisibilityHint,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
