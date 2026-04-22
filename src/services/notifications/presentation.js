import notifee, {
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {getCurrentAppLanguage, translate} from '../../i18n';
import {
  ACTION_FOLLOW_GAME,
  ACTION_OPEN_NEWS,
  ACTION_UNFOLLOW_GAME,
  IOS_CATEGORY_ID,
  NOTIFICATION_CHANNEL_ID,
} from './constants';
import {
  canDisplayUnfollowAction,
  logCriticalNotificationError,
  logNotificationWarning,
} from './helpers';
import {
  getAndroidChannelLanguage,
  getIosCategoriesLanguage,
  setAndroidChannelLanguage,
  setIosCategoriesLanguage,
} from './runtime';

export async function ensureNotificationPermission() {
  if (Platform.OS === 'android') {
    try {
      let settings = await notifee.getNotificationSettings();

      if (
        settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED ||
        settings.authorizationStatus === AuthorizationStatus.DENIED
      ) {
        settings = await notifee.requestPermission();
      }

      const blocked = settings?.android?.blocked === true;
      const granted =
        (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
          settings.authorizationStatus === AuthorizationStatus.PROVISIONAL) &&
        !blocked;

      if (granted) {
        debugLog('[FCM] Permission notifications Android accordee');
        return {granted: true, status: 'authorized'};
      }

      if (blocked) {
        debugLog('[FCM] Notifications Android bloquees');
        return {granted: false, status: 'blocked'};
      }

      debugLog('[FCM] Permission notifications Android refusee');
      return {granted: false, status: 'denied'};
    } catch (error) {
      debugError('[FCM] Erreur verification permission Android:', error);
      return {granted: false, status: 'error'};
    }
  }

  try {
    let settings = await notifee.getNotificationSettings();

    if (settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
      settings = await notifee.requestPermission();
    }

    const granted =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (granted) {
      debugLog('[FCM] Permission notifications iOS accordee');
      return {granted: true, status: 'authorized'};
    }

    debugLog('[FCM] Permission notifications iOS refusee');
    return {granted: false, status: 'denied'};
  } catch (error) {
    debugError('[FCM] Erreur demande permission iOS:', error);
    return {granted: false, status: 'error'};
  }
}

export async function ensureAndroidNotificationChannel() {
  const language = getCurrentAppLanguage();

  if (Platform.OS !== 'android' || getAndroidChannelLanguage() === language) {
    return;
  }

  try {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: translate('notifications.channelName'),
      description: translate('notifications.channelDescription'),
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    setAndroidChannelLanguage(language);
    debugLog('[FCM] Canal Android pret');
  } catch (error) {
    debugError('[FCM] Erreur creation canal Android:', error);
  }
}

export async function ensureIosNotificationCategories() {
  const language = getCurrentAppLanguage();

  if (Platform.OS !== 'ios' || getIosCategoriesLanguage() === language) {
    return;
  }

  try {
    await notifee.setNotificationCategories([
      {
        id: IOS_CATEGORY_ID,
        actions: [
          {
            id: ACTION_UNFOLLOW_GAME,
            title: translate('notifications.unfollowAction'),
          },
        ],
      },
    ]);

    setIosCategoriesLanguage(language);
    debugLog('[FCM] Categorie iOS prete');
  } catch (error) {
    debugError('[FCM] Erreur creation categorie iOS:', error);
  }
}

async function validateNotificationImageUrl(imageUrl) {
  const normalizedUrl = imageUrl?.trim();

  if (!normalizedUrl) {
    return null;
  }

  try {
    const headResponse = await fetch(normalizedUrl, {method: 'HEAD'});
    const contentType = headResponse.headers.get('content-type') || '';

    if (
      headResponse.ok &&
      (!contentType || contentType.toLowerCase().startsWith('image/'))
    ) {
      return normalizedUrl;
    }
  } catch (error) {
    debugLog('[FCM] Validation HEAD image echouee, fallback GET');
  }

  try {
    const getResponse = await fetch(normalizedUrl, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0',
      },
    });
    const contentType = getResponse.headers.get('content-type') || '';

    if (
      (getResponse.ok || getResponse.status === 206) &&
      (!contentType || contentType.toLowerCase().startsWith('image/'))
    ) {
      return normalizedUrl;
    }
  } catch (error) {
    debugLog('[FCM] Validation GET image echouee');
  }

  return null;
}

function buildBaseNotification(payload) {
  const canUnfollow = canDisplayUnfollowAction(payload);
  const isFollowPrompt = payload.type === 'follow_prompt';

  const androidActions = [];
  if (Platform.OS === 'android' && canUnfollow) {
    androidActions.push({
      id: ACTION_UNFOLLOW_GAME,
      title: translate('notifications.unfollowAction'),
      pressAction: {id: ACTION_UNFOLLOW_GAME},
    });
  }

  return {
    id: payload.id,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    timestamp: Date.now(),
    android: {
      showTimestamp: true,
      channelId: NOTIFICATION_CHANNEL_ID,
      smallIcon: 'ic_notification',
      color: '#1b2838',
      pressAction: {
        id: isFollowPrompt ? ACTION_FOLLOW_GAME : ACTION_OPEN_NEWS,
        launchActivity: 'default',
      },
      actions: androidActions,
      sound: 'default',
    },
    ios: {
      categoryId: canUnfollow ? IOS_CATEGORY_ID : undefined,
      sound: 'default',
    },
  };
}

const MEDIA_SUPPORTED_TYPES = new Set(['news', 'follow_prompt']);

async function buildNotificationMediaOptions(payload) {
  if (!MEDIA_SUPPORTED_TYPES.has(payload?.type)) {
    return {
      hasMedia: false,
      imageStatus: 'not_applicable',
      android: {},
      ios: {},
    };
  }

  const requestedImageUrl = payload.imageUrl?.trim();
  const requestedLogoUrl = payload.gameLogoUrl?.trim();

  // follow_prompt : logo en largeIcon uniquement (pas de BigPicture, diff
  // visuelle vs news qui elles s'affichent en grand via BigPictureStyle)
  if (payload.type === 'follow_prompt') {
    if (!requestedImageUrl) {
      return {
        hasMedia: false,
        imageStatus: 'missing',
        imageUrl: null,
        android: {},
        ios: {},
      };
    }

    const validatedLogo = await validateNotificationImageUrl(requestedImageUrl);

    if (!validatedLogo) {
      return {
        hasMedia: false,
        imageStatus: 'invalid',
        imageUrl: requestedImageUrl,
        android: {},
        ios: {},
      };
    }

    return {
      hasMedia: true,
      imageStatus: 'valid',
      imageUrl: validatedLogo,
      android: { largeIcon: validatedLogo },
      ios: { attachments: [{ url: validatedLogo }] },
    };
  }

  // news : image en grand via BigPictureStyle. Si pas d'image disponible,
  // fallback sur le logo du jeu (largeIcon uniquement — le logo serait moche
  // étiré en grand)
  const validatedImageUrl = requestedImageUrl
    ? await validateNotificationImageUrl(requestedImageUrl)
    : null;

  if (validatedImageUrl) {
    return {
      hasMedia: true,
      imageStatus: 'valid',
      imageUrl: validatedImageUrl,
      android: {
        largeIcon: validatedImageUrl,
        style: {
          type: AndroidStyle.BIGPICTURE,
          picture: validatedImageUrl,
        },
      },
      ios: {
        attachments: [{ url: validatedImageUrl }],
      },
    };
  }

  const validatedLogoUrl = requestedLogoUrl
    ? await validateNotificationImageUrl(requestedLogoUrl)
    : null;

  if (validatedLogoUrl) {
    return {
      hasMedia: true,
      imageStatus: 'valid',
      imageUrl: validatedLogoUrl,
      android: { largeIcon: validatedLogoUrl },
      ios: { attachments: [{ url: validatedLogoUrl }] },
    };
  }

  return {
    hasMedia: false,
    imageStatus: requestedImageUrl ? 'invalid' : 'missing',
    imageUrl: requestedImageUrl || null,
    android: {},
    ios: {},
  };
}

export async function displayNotificationPayload(payload) {
  try {
    if (!payload) {
      return;
    }

    await ensureAndroidNotificationChannel();
    await ensureIosNotificationCategories();

    const baseNotification = buildBaseNotification(payload);
    const mediaOptions = await buildNotificationMediaOptions(payload);

    if (MEDIA_SUPPORTED_TYPES.has(payload.type) && mediaOptions.imageStatus === 'invalid') {
      logNotificationWarning(
        `[FCM] Notification ${payload.type} affichee sans image: image invalide`,
        {
          notificationId: payload.id,
          appId: payload.data?.appId || null,
          imageUrl: mediaOptions.imageUrl,
        },
      );
    }

    await notifee.displayNotification(
      mediaOptions.hasMedia
        ? {
            ...baseNotification,
            android: {
              ...baseNotification.android,
              ...mediaOptions.android,
            },
            ios: {
              ...baseNotification.ios,
              ...mediaOptions.ios,
            },
          }
        : baseNotification,
    );
  } catch (error) {
    logCriticalNotificationError(
      "[FCM] Erreur lors de l'affichage de la notification",
      error,
    );
  }
}
