import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import {Platform} from 'react-native';
import {debugError, showAlert} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {
  applyLocalFollowState,
  buildFollowGameRef,
  normalizeFollowAppId,
} from '../followStateLocalStore';
import {queueFollowSync, syncQueuedFollow} from '../followSync';
import {pushPendingFollowConfirm} from '../pendingFollowConfirmStore';
import {queueNotificationAction} from './actionJournal';
import {
  ACTION_OPEN_NEWS,
  ACTION_UNFOLLOW_GAME,
  IOS_CATEGORY_ID,
  NOTIFICATION_CHANNEL_ID,
} from './constants';
import {
  canDisplayUnfollowAction,
  isValidAppId,
  logCriticalNotificationError,
} from './helpers';
import {
  ensureAndroidNotificationChannel,
  ensureIosNotificationCategories,
} from './presentation';

async function showUnfollowFailureNotification(notification, data) {
  try {
    await ensureAndroidNotificationChannel();
    await ensureIosNotificationCategories();

    const payload = {
      type: data?.type || 'general',
      allowUnfollow: data?.allowUnfollow === 'true',
      data,
    };

    await notifee.displayNotification({
      id: notification?.id || data?.notificationId || `${Date.now()}`,
      title:
        notification?.title ||
        translate('notifications.unfollowUnavailableTitle'),
      body: translate('notifications.unfollowUnavailableMessage'),
      data,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        pressAction: {id: ACTION_OPEN_NEWS},
        actions:
          Platform.OS === 'android' && canDisplayUnfollowAction(payload)
            ? [
                {
                  id: ACTION_UNFOLLOW_GAME,
                  title: translate('notifications.unfollowAction'),
                  pressAction: {id: ACTION_UNFOLLOW_GAME},
                },
              ]
            : [],
        sound: 'default',
      },
      ios: {
        categoryId: canDisplayUnfollowAction(payload)
          ? IOS_CATEGORY_ID
          : undefined,
        sound: 'default',
      },
    });
  } catch (error) {
    logCriticalNotificationError(
      '[FCM] Impossible de presenter le feedback echec unfollow',
      error,
      {
        appId: data?.appId || null,
        steamId: data?.steamId || null,
      },
    );
  }
}

const buildNotificationGameRef = (appId, data = {}) =>
  buildFollowGameRef({
    appId,
    name: data?.gameName || data?.name || '',
    imageUrl: data?.imageUrl || data?.logoUrl || '',
  });

export async function executeNotificationUnfollow({
  data,
  notification,
  onCommitted = null,
}) {
  const steamId = data?.steamId;
  const appId = normalizeFollowAppId(data?.appId);
  const notificationId = notification?.id;

  if (!steamId || !isValidAppId(appId)) {
    logCriticalNotificationError(
      '[FCM] Action unfollow ignoree: steamId ou appId manquant',
      null,
      {
        steamId: steamId || null,
        appId: appId || null,
      },
    );
    return false;
  }

  try {
    const gameRef = buildNotificationGameRef(appId, data);
    const mutationUpdatedAt = Date.now();

    const enqueued = await queueFollowSync({
      steamId,
      appId,
      targetIsFollowed: false,
      gameRef,
      updatedAt: mutationUpdatedAt,
    });

    if (!enqueued) {
      throw new Error('Failed to enqueue notification unfollow sync task');
    }

    const mutation = await applyLocalFollowState({
      steamId,
      appId,
      targetIsFollowed: false,
      gameRef,
      updatedAt: mutationUpdatedAt,
    });

    if (!mutation) {
      throw new Error('Unable to create local notification unfollow mutation');
    }

    syncQueuedFollow({
      steamId,
      reason: 'notification-unfollow',
    }).catch(error => {
      debugError('[FCM] Synchronisation unfollow notification differee:', error);
    });

    let committedInMemory = false;
    if (typeof onCommitted === 'function') {
      try {
        await onCommitted({
          appId,
          followedGames: null,
          gamesVersion: null,
          updatedUser: null,
        });
        committedInMemory = true;
      } catch (error) {
        logCriticalNotificationError(
          '[FCM] Echec application locale apres unfollow notification',
          error,
          {
            steamId,
            appId,
          },
        );
      }
    }

    if (!committedInMemory) {
      await queueNotificationAction({
        kind: 'unfollow',
        steamId,
        appId,
        followedGames: null,
        gamesVersion: null,
      });
    }

    if (notificationId) {
      await notifee.cancelNotification(notificationId);
      await notifee.cancelDisplayedNotification(notificationId);
    }

    return true;
  } catch (error) {
    logCriticalNotificationError(
      '[FCM] Erreur unfollow via notification',
      error,
      {
        steamId,
        appId,
      },
    );
    await showUnfollowFailureNotification(notification, data);
    return false;
  }
}

export async function performHeadlessNotificationUnfollow(data, notification) {
  return executeNotificationUnfollow({
    data,
    notification,
  });
}

export async function executeFollowPromptAction({
  steamId,
  notification,
  data,
  onFollowPromptConfirm,
}) {
  const appId = normalizeFollowAppId(data?.appId);
  let resolvedSteamId = steamId;

  if (!resolvedSteamId) {
    try {
      resolvedSteamId = await AsyncStorage.getItem('steamId');
    } catch (_) {}
  }

  if (!isValidAppId(appId)) {
    debugError('[FCM] Aucun appId trouve pour follow_prompt, action ignoree');
    return;
  }

  if (!resolvedSteamId) {
    debugError('[FCM] steamId manquant pour follow_prompt');
    return;
  }

  try {
    const gameRef = buildNotificationGameRef(appId, data);
    const mutationUpdatedAt = Date.now();

    const enqueued = await queueFollowSync({
      steamId: resolvedSteamId,
      appId,
      targetIsFollowed: true,
      gameRef,
      updatedAt: mutationUpdatedAt,
    });

    if (!enqueued) {
      throw new Error('Failed to enqueue follow prompt sync task');
    }

    const mutation = await applyLocalFollowState({
      steamId: resolvedSteamId,
      appId,
      targetIsFollowed: true,
      gameRef,
      updatedAt: mutationUpdatedAt,
    });

    if (!mutation) {
      throw new Error('Unable to create local follow prompt mutation');
    }

    syncQueuedFollow({
      steamId: resolvedSteamId,
      reason: 'notification-follow-prompt',
    }).catch(error => {
      debugError('[FCM] Synchronisation follow_prompt differee:', error);
    });
  } catch (error) {
    debugError('[FCM] Erreur follow_prompt:', error);
    showAlert(
      translate('notifications.followUnavailableTitle'),
      translate('notifications.followUnavailableMessage'),
    );
    return;
  }

  if (typeof onFollowPromptConfirm === 'function') {
    onFollowPromptConfirm(appId, data?.gameName || '');
  } else {
    pushPendingFollowConfirm(appId, data?.gameName || '');
  }

  try {
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
      await notifee.cancelDisplayedNotification(notification.id);
    }
  } catch (error) {
    debugError('[FCM] Erreur fermeture notification follow_prompt:', error);
  }
}

export function notifyUnfollowSyncCallbacks(appId, callbacks) {
  const {
    onNewsUnfollow,
    onWishlistUnfollow,
    onFollowedGamesTabUnfollow,
  } = callbacks;

  if (typeof onNewsUnfollow === 'function') {
    onNewsUnfollow(appId);
  }
  if (typeof onWishlistUnfollow === 'function') {
    onWishlistUnfollow(appId);
  }
  if (typeof onFollowedGamesTabUnfollow === 'function') {
    onFollowedGamesTabUnfollow(appId);
  }
}
