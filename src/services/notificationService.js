import notifee from '@notifee/react-native';
import {
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import {debugError} from '../hooks/hooksLogger';
import {
  consumePendingInitialNotification,
  handleNotificationInteraction,
} from './notifications/events';
import {executeFollowPromptAction} from './notifications/actions';
import {
  extractNotificationPayload,
  logCriticalNotificationError,
  openUrlSafely,
} from './notifications/helpers';
import {
  displayNotificationPayload,
  ensureAndroidNotificationChannel,
  ensureIosNotificationCategories,
} from './notifications/presentation';
import {
  backgroundEventHandlers,
  messagingInstance,
} from './notifications/runtime';
import {
  registerFCMToken,
  unregisterFCMToken,
} from './notifications/tokenService';

export {registerFCMToken, unregisterFCMToken};

export async function displayRemoteNotification(remoteMessage) {
  const payload = extractNotificationPayload(remoteMessage);
  return displayNotificationPayload(payload);
}

export function setupNotificationHandlers(steamId, options = {}) {
  const {
    onNotificationUnfollowCommitted,
    onNewsUnfollow,
    onWishlistUnfollow,
    onFollowedGamesTabUnfollow,
    onFollowPromptConfirm,
  } = options;

  ensureAndroidNotificationChannel().catch(error => {
    debugError('[FCM] Erreur ensureAndroidNotificationChannel:', error);
  });
  ensureIosNotificationCategories().catch(error => {
    debugError('[FCM] Erreur ensureIosNotificationCategories:', error);
  });

  const unsubscribeTokenRefresh = onTokenRefresh(
    messagingInstance,
    async () => {
      if (steamId) {
        await registerFCMToken(steamId);
      }
    },
  );

  const handleNotificationEvent = async event => {
    try {
      await handleNotificationInteraction({
        eventType: event?.type,
        detail: event?.detail,
        steamId,
        onNotificationUnfollowCommitted,
        onNewsUnfollow,
        onWishlistUnfollow,
        onFollowedGamesTabUnfollow,
        onFollowPromptConfirm,
      });
    } catch (error) {
      logCriticalNotificationError(
        '[FCM] Erreur gestion evenement notification',
        error,
      );
    }
  };

  const foregroundSubscription = notifee.onForegroundEvent(
    handleNotificationEvent,
  );
  backgroundEventHandlers.add(handleNotificationEvent);

  const unsubscribeOnMessage = onMessage(
    messagingInstance,
    async remoteMessage => {
      await displayRemoteNotification(remoteMessage);
    },
  );

  const unsubscribeOnNotificationOpenedApp = onNotificationOpenedApp(
    messagingInstance,
    async remoteMessage => {
      const payload = extractNotificationPayload(remoteMessage);

      if (payload?.type === 'follow_prompt') {
        await executeFollowPromptAction({
          steamId,
          data: payload.data,
          onFollowPromptConfirm,
        });
        return;
      }

      if (payload?.data?.url) {
        await openUrlSafely(payload.data.url);
      }
    },
  );

  consumePendingInitialNotification({
    steamId,
    onNotificationUnfollowCommitted,
    onNewsUnfollow,
    onWishlistUnfollow,
    onFollowedGamesTabUnfollow,
    onFollowPromptConfirm,
  }).catch(error => {
    logCriticalNotificationError(
      '[FCM] Erreur consommation notification initiale',
      error,
    );
  });

  return () => {
    unsubscribeTokenRefresh();
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpenedApp();
    backgroundEventHandlers.delete(handleNotificationEvent);
    foregroundSubscription();
  };
}
