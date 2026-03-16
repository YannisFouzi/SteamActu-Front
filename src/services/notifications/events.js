import notifee, {EventType} from '@notifee/react-native';
import {consumePendingNotification} from '../initialNotificationStore';
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
import {
  executeFollowPromptAction,
  executeNotificationUnfollow,
  notifyUnfollowSyncCallbacks,
  performHeadlessNotificationUnfollow,
} from './actions';

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

  if (!pendingNotification) {
    return;
  }

  const {source, data} = pendingNotification;

  if (source === 'firebase' && data) {
    const payload = extractNotificationPayload(data);

    if (
      payload?.id &&
      !processedNotificationIds.has(payload.id) &&
      payload?.data?.url
    ) {
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

async function handleBackgroundNotifeeEvent(event) {
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
    }
  } catch (error) {
    logCriticalNotificationError(
      '[FCM] Erreur fallback background Notifee',
      error,
    );
  }
}

notifee.onBackgroundEvent(async event => {
  const handlers = Array.from(backgroundEventHandlers);

  if (handlers.length === 0) {
    await handleBackgroundNotifeeEvent(event);
    return;
  }

  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (error) {
      logCriticalNotificationError(
        '[FCM] Erreur handler background Notifee',
        error,
      );
    }
  }
});
