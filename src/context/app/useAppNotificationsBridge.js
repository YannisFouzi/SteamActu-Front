import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {
  registerFCMToken,
  setupNotificationHandlers,
} from '../../services/notificationService';

const NOTIFICATION_REGISTRATION_DELAY_MS = 1500;

export const useAppNotificationsBridge = ({
  steamId,
  handleFollowGameRef,
  notifyNotificationSync,
}) => {
  useEffect(() => {
    let cleanupNotifications;
    let canceled = false;
    let registrationTimeout = null;

    async function initializeNotifications() {
      try {
        const storedNews = await AsyncStorage.getItem('newsNotifications');
        const storedLibraryMode = await AsyncStorage.getItem(
          'libraryFollowMode',
        );
        const storedWishlistMode = await AsyncStorage.getItem(
          'wishlistFollowMode',
        );

        const newsEnabled =
          storedNews !== null ? JSON.parse(storedNews) : false;
        const libraryMode = storedLibraryMode || 'off';
        const wishlistMode = storedWishlistMode || 'off';

        const needsNotifications =
          newsEnabled || libraryMode === 'prompt' || wishlistMode === 'prompt';

        if (canceled || !steamId) {
          return;
        }

        if (needsNotifications) {
          debugLog(
            '[FCM] Preferences notifications actives -> tentative enregistrement token',
          );
          const result = await registerFCMToken(steamId);

          if (!result?.success) {
            debugLog(
              `[FCM] Impossible de re-enregistrer le token (status=${result?.status})`,
            );
          }
        } else {
          debugLog('[FCM] Notifications inactives -> enregistrement ignore');
        }
      } catch (error) {
        debugError(
          '[FCM] Erreur lors de la lecture des preferences FCM:',
          error,
        );
      }
    }

    if (steamId) {
      debugLog('[FCM] Configuration des notifications pour:', steamId);
      cleanupNotifications = setupNotificationHandlers(steamId, {
        onUnfollowGame: async appId => {
          if (!appId) {
            return false;
          }

          const handler = handleFollowGameRef?.current;
          if (!handler) {
            return false;
          }

          debugLog(
            '[FCM] Action "Ne plus suivre" recue depuis la notification',
            appId,
          );

          try {
            const result = await handler({appId, isFollowed: true});
            return result !== false;
          } catch (error) {
            debugError(
              '[FCM] Erreur lors du traitement "Ne plus suivre" depuis la notification:',
              error,
            );
            return false;
          }
        },
        onNewsUnfollow: appId => notifyNotificationSync('news', appId),
        onWishlistUnfollow: appId => notifyNotificationSync('wishlist', appId),
        onFollowedGamesTabUnfollow: appId =>
          notifyNotificationSync('followed', appId),
        onFollowPromptConfirm: appId =>
          notifyNotificationSync('followed', appId),
      });
      registrationTimeout = setTimeout(() => {
        if (!canceled) {
          initializeNotifications();
        }
      }, NOTIFICATION_REGISTRATION_DELAY_MS);
    }

    return () => {
      canceled = true;
      if (registrationTimeout !== null) {
        clearTimeout(registrationTimeout);
      }
      if (cleanupNotifications) {
        debugLog('[FCM] Nettoyage des handlers de notifications');
        cleanupNotifications();
      }
    };
  }, [handleFollowGameRef, notifyNotificationSync, steamId]);
};
