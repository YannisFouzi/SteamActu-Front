import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import {Platform, ToastAndroid} from 'react-native';
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

// Delai de maintien en vie de la tache headless apres ToastAndroid.show().
// ToastAndroid.show poste un runnable sur l'UI thread ; si la tache Notifee
// background resout immediatement, le process est tue avant que ce runnable
// n'execute reellement Toast.show(). On garde donc la tache vivante ce delai
// pour laisser le systeme afficher le toast — apres quoi il est rendu par le
// systeme et survit a la mort du process.
const HEADLESS_TOAST_KEEPALIVE_MS = 1000;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Toast natif systeme apres unfollow via notification : popup flottant en bas
// d'ecran (style Messenger), pas une nouvelle notification. iOS : aucun
// equivalent natif standard, no-op.
function showUnfollowToast(data) {
  const gameName = data?.gameName || data?.name || '';
  if (!gameName || Platform.OS !== 'android') {
    return false;
  }

  try {
    const message = translate('notifications.unfollowConfirmedMessage', {
      gameName,
    });
    ToastAndroid.show(message, ToastAndroid.LONG);
    return true;
  } catch (error) {
    // Le toast est purement cosmetique : un echec ne doit jamais faire echouer
    // l'unfollow lui-meme.
    debugError('[FCM] Echec affichage toast unfollow:', error);
    return false;
  }
}

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
  keepAliveForToast = false,
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

    const toastShown = showUnfollowToast(data);

    // En contexte headless (app tuee/arriere-plan) la tache Notifee doit rester
    // vivante un instant, sinon le process meurt avant que l'UI thread n'affiche
    // le toast. En foreground le toast s'affiche immediatement : pas de delai.
    if (toastShown && keepAliveForToast) {
      await wait(HEADLESS_TOAST_KEEPALIVE_MS);
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
    keepAliveForToast: true,
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
