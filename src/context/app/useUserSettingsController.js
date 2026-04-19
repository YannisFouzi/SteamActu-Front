import notifee from '@notifee/react-native';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking, Platform} from 'react-native';
import {translate} from '../../i18n';
import {userService} from '../../services/api';
import {
  registerFCMToken,
  unregisterFCMToken,
} from '../../services/notificationService';
import {debugError, showAlert} from '../../hooks/hooksLogger';
import {
  DEFAULT_USER_SETTINGS,
  FOLLOW_MODES,
  persistUserSettingsToStorage,
  readStoredUserSettings,
  requiresNotifications,
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
            localSnapshot.wishlistFollowMode;

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
          DEFAULT_USER_SETTINGS.wishlistFollowMode
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
      const result = await registerFCMToken(steamId);
      if (result?.success) {
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
  }, [steamId]);

  const persistSettings = useCallback(
    async nextSnapshot => {
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

        await userService.updateNotificationSettings(steamId, {
          newsNotifications: nextSnapshot.newsNotifications,
          followPromptNotifications:
            nextSnapshot.libraryFollowMode === 'prompt' ||
            nextSnapshot.wishlistFollowMode === 'prompt',
          libraryFollowMode: nextSnapshot.libraryFollowMode,
          wishlistFollowMode: nextSnapshot.wishlistFollowMode,
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

      if (!previousRequires && nextRequires) {
        const granted = await ensureNotificationsPermission();
        if (!granted) {
          return false;
        }
      }

      if (previousRequires && !nextRequires) {
        await unregisterFCMToken(steamId);
      }

      return persistSettings(nextSnapshot);
    },
    [
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
      });
    },
    [applySettingsChange, libraryFollowMode, wishlistFollowMode],
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
      });
    },
    [
      applySettingsChange,
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
    hydrateUserSettings,
    resetUserSettingsState: resetSettingsState,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
  };
};
