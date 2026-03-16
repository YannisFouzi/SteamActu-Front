import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {
  registerFCMToken,
  setupNotificationHandlers,
} from '../../services/notificationService';
import {consumeNotificationActionsForSteamId} from '../../services/notifications/actionJournal';

const NOTIFICATION_REGISTRATION_DELAY_MS = 1500;

export const useAppNotificationsBridge = ({
  steamId,
  notifyNotificationSync,
  onNotificationUnfollowCommitted,
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

      consumeNotificationActionsForSteamId(steamId)
        .then(async actions => {
          if (canceled || !Array.isArray(actions) || actions.length === 0) {
            return;
          }

          for (const action of actions) {
            if (action?.kind !== 'unfollow' || !action?.appId) {
              continue;
            }

            try {
              if (typeof onNotificationUnfollowCommitted === 'function') {
                await onNotificationUnfollowCommitted({
                  appId: action.appId,
                  followedGames: action.followedGames,
                  gamesVersion: action.gamesVersion,
                });
              }

              notifyNotificationSync('news', action.appId);
              notifyNotificationSync('wishlist', action.appId);
              notifyNotificationSync('followed', action.appId);
            } catch (syncError) {
              debugError(
                '[FCM] Erreur lors de la consommation des actions de notification:',
                syncError,
              );
            }
          }
        })
        .catch(error => {
          debugError(
            '[FCM] Erreur lecture journal d actions notification:',
            error,
          );
        });

      cleanupNotifications = setupNotificationHandlers(steamId, {
        onNotificationUnfollowCommitted,
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
  }, [notifyNotificationSync, onNotificationUnfollowCommitted, steamId]);
};
