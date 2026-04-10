import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import {Platform} from 'react-native';
import {debugError, showAlert} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {userService} from '../api';
import {
  queueNotificationAction,
  reconcileNotificationUnfollowCaches,
} from './actionJournal';
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
      '[FCM] Impossible de presenter le feedback d echec unfollow',
      error,
      {
        appId: data?.appId || null,
        steamId: data?.steamId || null,
      },
    );
  }
}

export async function executeNotificationUnfollow({
  data,
  notification,
  onCommitted = null,
}) {
  const steamId = data?.steamId;
  const appId = data?.appId;
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
    const response = await userService.unfollowGame(steamId, appId);
    const updatedUser = response?.data || null;
    const normalizedAppId = String(appId);
    const followedGames = Array.isArray(updatedUser?.followedGames)
      ? updatedUser.followedGames.map(id => String(id))
      : null;
    const gamesVersion = updatedUser?.gamesVersion || null;

    await reconcileNotificationUnfollowCaches({
      steamId,
      appId: normalizedAppId,
      gamesVersion,
    });

    let committedInMemory = false;
    if (typeof onCommitted === 'function') {
      try {
        await onCommitted({
          appId: normalizedAppId,
          followedGames,
          gamesVersion,
          updatedUser,
        });
        committedInMemory = true;
      } catch (error) {
        logCriticalNotificationError(
          '[FCM] Echec application locale apres unfollow notification',
          error,
          {
            steamId,
            appId: normalizedAppId,
          },
        );
      }
    }

    if (!committedInMemory) {
      await queueNotificationAction({
        kind: 'unfollow',
        steamId,
        appId: normalizedAppId,
        followedGames,
        gamesVersion,
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
  const appId = data?.appId;
  let resolvedSteamId = steamId;

  if (!resolvedSteamId) {
    try {
      resolvedSteamId = await AsyncStorage.getItem('steamId');
      console.log('[FCM] steamId recupere depuis AsyncStorage:', resolvedSteamId ? 'OK' : 'null');
    } catch (_) {}
  }

  console.log('[FCM] executeFollowPromptAction CALLED', JSON.stringify({ steamId: resolvedSteamId, appId, gameName: data?.gameName, type: data?.type }));

  if (!isValidAppId(appId)) {
    debugError('[FCM] Aucun appId trouve pour follow_prompt, action ignoree');
    return;
  }

  if (!resolvedSteamId) {
    debugError('[FCM] steamId manquant (ni parametre ni AsyncStorage)');
    return;
  }

  try {
    console.log(`[FCM] Appel POST /follow steamId=${resolvedSteamId} appId=${appId}`);
    await userService.followGame(
      resolvedSteamId,
      appId,
      data.gameName || '',
      data.imageUrl || '',
    );
    console.log(`[FCM] POST /follow SUCCESS pour appId=${appId}`);

    if (typeof onFollowPromptConfirm === 'function') {
      onFollowPromptConfirm(appId);
      console.log(`[FCM] onFollowPromptConfirm appelé pour appId=${appId}`);
    } else {
      console.log('[FCM] onFollowPromptConfirm NON DISPONIBLE (background?)');
    }
  } catch (error) {
    debugError('[FCM] Erreur follow_prompt:', error);
    showAlert(
      translate('notifications.followUnavailableTitle'),
      translate('notifications.followUnavailableMessage'),
    );
    return;
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
