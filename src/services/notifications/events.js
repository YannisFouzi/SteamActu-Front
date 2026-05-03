import { EventType } from '@notifee/react-native';
import {
  consumePendingNotification,
  setPendingNavigationFollowPromptIntent,
} from '../initialNotificationStore';
import {
  executeFollowPromptAction,
  executeNotificationUnfollow,
  notifyUnfollowSyncCallbacks,
  performHeadlessNotificationUnfollow,
} from './actions';
import {
  ACTION_FOLLOW_GAME,
  ACTION_OPEN_NEWS,
  ACTION_UNFOLLOW_GAME,
} from './constants';
import {
  appIdOrThrow,
  extractNotificationPayload,
  logCriticalNotificationError,
  openUrlSafely,
} from './helpers';
import {
  backgroundEventHandlers,
  processedNotificationIds,
} from './runtime';

export async function handleNotificationInteraction({
  eventType,
  detail,
  steamId,
  onNotificationUnfollowCommitted,
  onNewsUnfollow,
  onWishlistUnfollow,
  onFollowedGamesTabUnfollow,
  onFollowPromptConfirm,
}) {
  if (eventType !== EventType.PRESS && eventType !== EventType.ACTION_PRESS) {
    return;
  }

  const pressActionId = detail?.pressAction?.id;
  const notification = detail?.notification;
  const data = notification?.data || {};

  if (pressActionId === ACTION_OPEN_NEWS) {
    if (data.url) {
      await openUrlSafely(data.url);
    }
    return;
  }

  if (pressActionId === ACTION_UNFOLLOW_GAME) {
    const success = await executeNotificationUnfollow({
      data,
      notification,
      onCommitted: onNotificationUnfollowCommitted,
    });

    if (!success) {
      return;
    }

    try {
      notifyUnfollowSyncCallbacks(appIdOrThrow(data?.appId), {
        onNewsUnfollow,
        onWishlistUnfollow,
        onFollowedGamesTabUnfollow,
      });
    } catch (error) {
      logCriticalNotificationError(
        '[FCM] Erreur synchronisation locale apres unfollow',
        error,
        {
          appId: data?.appId || null,
        },
      );
    }

    return;
  }

  if (
    pressActionId === ACTION_FOLLOW_GAME ||
    (eventType === EventType.PRESS &&
      !pressActionId &&
      data.type === 'follow_prompt')
  ) {
    console.log('[FCM] handleNotificationInteraction → follow_prompt détecté', JSON.stringify({ pressActionId, eventType, type: data.type }));
    await executeFollowPromptAction({
      steamId,
      notification,
      data,
      onFollowPromptConfirm,
    });
    return;
  }

  if (eventType === EventType.PRESS && !pressActionId && data.url) {
    await openUrlSafely(data.url);
  }
}

export async function consumePendingInitialNotification({
  steamId,
  onNotificationUnfollowCommitted,
  onNewsUnfollow,
  onWishlistUnfollow,
  onFollowedGamesTabUnfollow,
  onFollowPromptConfirm,
}) {
  const pendingNotification = consumePendingNotification();
  console.log('[FCM] consumePendingInitialNotification:', pendingNotification ? 'source=' + pendingNotification.source + ' type=' + (pendingNotification.data?.data?.type || pendingNotification.data?.notification?.data?.type || '?') : 'null');

  if (!pendingNotification) {
    return;
  }

  const {source, data} = pendingNotification;

  if (source === 'firebase' && data) {
    const payload = extractNotificationPayload(data);

    if (!payload?.id || processedNotificationIds.has(payload.id)) {
      return;
    }

    // follow_prompt : déjà traité par handleBackgroundNotifeeEvent (POST follow
    // + push pendingFollowConfirmStore) au cold-boot, et la navigation est
    // gérée par linking.getInitialURL. Re-jouer ici causerait un double POST.
    if (payload.type === 'follow_prompt') {
      processedNotificationIds.add(payload.id);
      return;
    }

    if (payload?.data?.url) {
      await openUrlSafely(payload.data.url);
      processedNotificationIds.add(payload.id);
    }

    return;
  }

  if (source === 'notifee' && data) {
    const notificationId = data.notification?.id;

    if (notificationId && processedNotificationIds.has(notificationId)) {
      return;
    }

    // Idem : follow_prompt est entièrement géré ailleurs (cf. ci-dessus).
    if (data.notification?.data?.type === 'follow_prompt') {
      if (notificationId) {
        processedNotificationIds.add(notificationId);
      }
      return;
    }

    await handleNotificationInteraction({
      eventType: EventType.PRESS,
      detail: data,
      steamId,
      onNotificationUnfollowCommitted,
      onNewsUnfollow,
      onWishlistUnfollow,
      onFollowedGamesTabUnfollow,
      onFollowPromptConfirm,
    });

    if (notificationId) {
      processedNotificationIds.add(notificationId);
    }
  }
}

export async function handleBackgroundNotifeeEvent(event) {
  try {
    if (
      (event.type === EventType.PRESS ||
        event.type === EventType.ACTION_PRESS) &&
      event.detail?.pressAction?.id === ACTION_OPEN_NEWS
    ) {
      const url = event.detail?.notification?.data?.url;
      if (url) {
        await openUrlSafely(url);
      }

      if (event.detail?.notification?.id) {
        processedNotificationIds.add(event.detail.notification.id);
      }
      return;
    }

    if (
      (event.type === EventType.PRESS ||
        event.type === EventType.ACTION_PRESS) &&
      event.detail?.pressAction?.id === ACTION_UNFOLLOW_GAME
    ) {
      const notification = event.detail?.notification || null;
      const data = notification?.data || {};
      const success = await performHeadlessNotificationUnfollow(
        data,
        notification,
      );

      if (success && notification?.id) {
        processedNotificationIds.add(notification.id);
      }
      return;
    }

    if (
      (event.type === EventType.PRESS ||
        event.type === EventType.ACTION_PRESS) &&
      event.detail?.pressAction?.id === ACTION_FOLLOW_GAME
    ) {
      const notification = event.detail?.notification || null;
      const data = notification?.data || {};
      const steamId = data?.steamId;

      // Pose l'intent de navigation SYNCHRONIQUEMENT, avant tout await.
      // AppNavigator lira ce store une fois le React tree monte pour atterrir
      // sur "Jeux suivis". Sans ca, getInitialNotification (deja resolu a null
      // au boot headless) ne fournit pas l'intent et l'app reste sur Fil.
      setPendingNavigationFollowPromptIntent({
        appId: data?.appId,
        gameName: data?.gameName || '',
      });

      await executeFollowPromptAction({
        steamId,
        notification,
        data,
      });

      if (notification?.id) {
        processedNotificationIds.add(notification.id);
      }
    }
  } catch (error) {
    logCriticalNotificationError(
      '[FCM] Erreur fallback background Notifee',
      error,
    );
  }
}

export function getBackgroundEventHandlers() {
  return Array.from(backgroundEventHandlers);
}
