import notifee from '@notifee/react-native';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking, Platform} from 'react-native';
import {translate} from '../../i18n';
import {userService} from '../../services/api';
import {
  getSettingsNotificationTokenAction,
  hasQueuedUserSettingsSync,
  queueUserSettingsSync,
  syncQueuedUserSettings,
} from '../../services/userSettingsSync';
import {ensureNotificationPermission} from '../../services/notifications/presentation';
import {debugError, debugLog, showAlert} from '../../hooks/hooksLogger';
import {
  DEFAULT_USER_SETTINGS,
  FOLLOW_MODES,
  persistUserSettingsToStorage,
  readStoredUserSettings,
  requiresNotifications,
  resolveConfirmUnfollowGames,
  resolveUserSettingsSnapshot,
  USER_SETTINGS_STATUS,
} from './userSettingsHelpers';

const LOCAL_UPDATE_GRACE_PERIOD_MS = 1000;

export const useUserSettingsController = ({steamId, user, isAuthenticated}) => {
  const [status, setStatus] = useState(USER_SETTINGS_STATUS.IDLE);
  const [saving, setSaving] = useState(false);
  const [newsNotifications, setNewsNotifications] = useState(
    DEFAULT_USER_SETTINGS.newsNotifications,
  );
  const [libraryFollowMode, setLibraryFollowMode] = useState(
    DEFAULT_USER_SETTINGS.libraryFollowMode,
  );
  const [wishlistFollowMode, setWishlistFollowMode] = useState(
    DEFAULT_USER_SETTINGS.wishlistFollowMode,
  );
  const [confirmUnfollowGames, setConfirmUnfollowGames] = useState(
    DEFAULT_USER_SETTINGS.confirmUnfollowGames,
  );

  const isMountedRef = useRef(true);
  const hydrationRequestIdRef = useRef(0);
  const lastHydratedSteamIdRef = useRef('');
  const lastLocalModificationRef = useRef(0);

  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  const applySettingsSnapshot = useCallback(
    snapshot => {
      safeSetState(
        setNewsNotifications,
        Boolean(snapshot.newsNotifications),
      );
      safeSetState(setLibraryFollowMode, snapshot.libraryFollowMode);
      safeSetState(setWishlistFollowMode, snapshot.wishlistFollowMode);
      safeSetState(
        setConfirmUnfollowGames,
        resolveConfirmUnfollowGames(snapshot.confirmUnfollowGames),
      );
    },
    [safeSetState],
  );

  const resetSettingsState = useCallback(() => {
    lastHydratedSteamIdRef.current = '';
    lastLocalModificationRef.current = 0;
    applySettingsSnapshot(DEFAULT_USER_SETTINGS);
    safeSetState(setSaving, false);
    safeSetState(setStatus, USER_SETTINGS_STATUS.IDLE);
  }, [applySettingsSnapshot, safeSetState]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const syncServerSettings = useCallback(
    async ({targetSteamId, localSnapshot, requestId}) => {
      try {
        const hasPendingLocalSync = await hasQueuedUserSettingsSync(
          targetSteamId,
        );

        if (hasPendingLocalSync) {
          debugLog(
            '[SETTINGS] Pending local settings sync found, keeping local values',
          );
          syncQueuedUserSettings({steamId: targetSteamId}).catch(error => {
            debugError('[SETTINGS] queued settings sync failed:', error);
          });
          return;
        }

        const response = await userService.getUser(targetSteamId);
        const resolvedServerSnapshot = resolveUserSettingsSnapshot(
          response?.data?.notificationSettings,
        );

        const hasChanged =
          resolvedServerSnapshot.newsNotifications !==
            localSnapshot.newsNotifications ||
          resolvedServerSnapshot.libraryFollowMode !==
            localSnapshot.libraryFollowMode ||
          resolvedServerSnapshot.wishlistFollowMode !==
            localSnapshot.wishlistFollowMode ||
          resolvedServerSnapshot.confirmUnfollowGames !==
            localSnapshot.confirmUnfollowGames;

        const timeSinceLastLocalMod =
          Date.now() - lastLocalModificationRef.current;
        const isStaleRequest = requestId !== hydrationRequestIdRef.current;

        if (isStaleRequest || !hasChanged || timeSinceLastLocalMod <= LOCAL_UPDATE_GRACE_PERIOD_MS) {
          return;
        }

        applySettingsSnapshot(resolvedServerSnapshot);
        await persistUserSettingsToStorage(resolvedServerSnapshot);
      } catch (error) {
        debugError(
          '[SETTINGS] Background settings sync failed, keeping local values:',
          error,
        );
      }
    },
    [applySettingsSnapshot],
  );

  const hydrateUserSettings = useCallback(async () => {
    if (!steamId || !isAuthenticated) {
      resetSettingsState();
      return false;
    }

    const requestId = ++hydrationRequestIdRef.current;
    safeSetState(setStatus, USER_SETTINGS_STATUS.HYDRATING);

    try {
      let localSnapshot = await readStoredUserSettings();

      if (
        user?.notificationSettings &&
        lastHydratedSteamIdRef.current !== steamId &&
        localSnapshot.newsNotifications ===
          DEFAULT_USER_SETTINGS.newsNotifications &&
        localSnapshot.libraryFollowMode ===
          DEFAULT_USER_SETTINGS.libraryFollowMode &&
        localSnapshot.wishlistFollowMode ===
          DEFAULT_USER_SETTINGS.wishlistFollowMode &&
        localSnapshot.confirmUnfollowGames ===
          DEFAULT_USER_SETTINGS.confirmUnfollowGames
      ) {
        localSnapshot = resolveUserSettingsSnapshot(user.notificationSettings);
      }

      if (!isMountedRef.current || requestId !== hydrationRequestIdRef.current) {
        return false;
      }

      applySettingsSnapshot(localSnapshot);
      lastHydratedSteamIdRef.current = steamId;
      safeSetState(setStatus, USER_SETTINGS_STATUS.READY);

      syncServerSettings({
        targetSteamId: steamId,
        localSnapshot,
        requestId,
      });

      return true;
    } catch (error) {
      debugError('[SETTINGS] Failed to hydrate user settings:', error);
      applySettingsSnapshot(DEFAULT_USER_SETTINGS);
      safeSetState(setStatus, USER_SETTINGS_STATUS.READY);
      showAlert(
        translate('common.error'),
        translate('errors.loadSettingsMessage'),
      );
      return false;
    }
  }, [
    applySettingsSnapshot,
    isAuthenticated,
    resetSettingsState,
    safeSetState,
    steamId,
    syncServerSettings,
    user?.notificationSettings,
  ]);

  const ensureNotificationsPermission = useCallback(async () => {
    try {
      const result = await ensureNotificationPermission();
      if (result?.granted) {
        return true;
      }

      if (result?.status === 'blocked') {
        showAlert(
          translate('notifications.blockedTitle'),
          translate('notifications.blockedMessage'),
          [
            {text: translate('common.cancel'), style: 'cancel'},
            {
              text: translate('common.openSettings'),
              onPress: async () => {
                try {
                  if (Platform.OS === 'android') {
                    await notifee.openNotificationSettings();
                  } else {
                    await Linking.openSettings();
                  }
                } catch (settingsError) {
                  debugError(
                    '[FCM] Failed to open notification settings:',
                    settingsError,
                  );
                }
              },
            },
          ],
        );
      } else {
        showAlert(
          translate('notifications.disabledTitle'),
          translate('notifications.disabledMessage'),
        );
      }

      return false;
    } catch (error) {
      debugError('[FCM] Failed to enable notifications:', error);
      showAlert(
        translate('common.error'),
        translate('notifications.disabledMessage'),
      );
      return false;
    }
  }, []);

  const persistSettings = useCallback(
    async (nextSnapshot, options = {}) => {
      if (!steamId) {
        debugError('[SETTINGS] Cannot persist settings without steamId');
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
        return false;
      }

      try {
        lastLocalModificationRef.current = Date.now();
        safeSetState(setSaving, true);

        applySettingsSnapshot(nextSnapshot);
        await persistUserSettingsToStorage(nextSnapshot);

        await queueUserSettingsSync(steamId, nextSnapshot, {
          notificationTokenAction: options.notificationTokenAction,
        });

        syncQueuedUserSettings({steamId}).catch(error => {
          debugError('[SETTINGS] background settings sync failed', error);
        });

        return true;
      } catch (error) {
        debugError('[SETTINGS] Failed to persist settings:', error);
        showAlert(
          translate('common.error'),
          translate('errors.saveSettingsMessage'),
        );
        return false;
      } finally {
        safeSetState(setSaving, false);
      }
    },
    [applySettingsSnapshot, safeSetState, steamId],
  );

  const applySettingsChange = useCallback(
    async nextSnapshot => {
      if (!steamId) {
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
        return false;
      }

      const previousRequires = requiresNotifications(
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode,
      );
      const nextRequires = requiresNotifications(
        nextSnapshot.newsNotifications,
        nextSnapshot.libraryFollowMode,
        nextSnapshot.wishlistFollowMode,
      );
      const previousSnapshot = {
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode,
        confirmUnfollowGames,
      };
      const notificationTokenAction = getSettingsNotificationTokenAction(
        previousSnapshot,
        nextSnapshot,
      );

      if (!previousRequires && nextRequires) {
        const granted = await ensureNotificationsPermission();
        if (!granted) {
          return false;
        }
      }

      return persistSettings(nextSnapshot, {notificationTokenAction});
    },
    [
      confirmUnfollowGames,
      ensureNotificationsPermission,
      libraryFollowMode,
      newsNotifications,
      persistSettings,
      steamId,
      wishlistFollowMode,
    ],
  );

  const handleToggleNews = useCallback(
    async value => {
      await applySettingsChange({
        newsNotifications: value,
        libraryFollowMode,
        wishlistFollowMode,
        confirmUnfollowGames,
      });
    },
    [
      applySettingsChange,
      confirmUnfollowGames,
      libraryFollowMode,
      wishlistFollowMode,
    ],
  );

  const handleLibraryModeChange = useCallback(
    async mode => {
      const safeMode = FOLLOW_MODES.includes(mode) ? mode : 'off';
      if (safeMode === libraryFollowMode) {
        return;
      }
      await applySettingsChange({
        newsNotifications,
        libraryFollowMode: safeMode,
        wishlistFollowMode,
        confirmUnfollowGames,
      });
    },
    [
      applySettingsChange,
      confirmUnfollowGames,
      libraryFollowMode,
      newsNotifications,
      wishlistFollowMode,
    ],
  );

  const handleWishlistModeChange = useCallback(
    async mode => {
      const safeMode = FOLLOW_MODES.includes(mode) ? mode : 'off';
      if (safeMode === wishlistFollowMode) {
        return;
      }
      await applySettingsChange({
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode: safeMode,
        confirmUnfollowGames,
      });
    },
    [
      applySettingsChange,
      confirmUnfollowGames,
      libraryFollowMode,
      newsNotifications,
      wishlistFollowMode,
    ],
  );

  const handleConfirmUnfollowGamesChange = useCallback(
    async value => {
      await applySettingsChange({
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode,
        confirmUnfollowGames: value,
      });
    },
    [
      applySettingsChange,
      libraryFollowMode,
      newsNotifications,
      wishlistFollowMode,
    ],
  );

  useEffect(() => {
    if (!isAuthenticated || !steamId) {
      resetSettingsState();
      return;
    }

    if (lastHydratedSteamIdRef.current === steamId) {
      return;
    }

    hydrateUserSettings();
  }, [hydrateUserSettings, isAuthenticated, resetSettingsState, steamId]);

  return {
    settingsStatus: status,
    isUserSettingsReady: status === USER_SETTINGS_STATUS.READY,
    loading: status !== USER_SETTINGS_STATUS.READY,
    saving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    confirmUnfollowGames,
    hydrateUserSettings,
    resetUserSettingsState: resetSettingsState,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
    handleConfirmUnfollowGamesChange,
  };
};
