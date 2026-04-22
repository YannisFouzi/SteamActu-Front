import {Linking} from 'react-native';
import {debugError, debugLog} from '../../hooks/hooksLogger';

export const logCriticalNotificationError = (message, error, extra = {}) => {
  console.error(message, {
    ...extra,
    message: error?.message || null,
    status: error?.status || error?.response?.status || null,
    data: error?.data || error?.response?.data || null,
  });
};

export const logNotificationWarning = (message, extra = {}) => {
  console.warn(message, extra);
};

export const isValidAppId = appId =>
  Boolean(appId && String(appId).trim() !== '' && !isNaN(parseInt(appId, 10)));

export async function openUrlSafely(url) {
  if (!url) {
    return;
  }

  try {
    await Linking.openURL(url);
  } catch (error) {
    debugError('[FCM] Erreur ouverture URL:', error);
  }
}

export function extractNotificationPayload(remoteMessage) {
  if (!remoteMessage) {
    return null;
  }

  const data = remoteMessage.data || {};
  const title = remoteMessage.notification?.title || data.title || '';
  const body = remoteMessage.notification?.body || data.body || '';

  if (!title && !body) {
    debugLog('[FCM] Notification ignoree: titre et corps absents');
    return null;
  }

  const notificationId =
    remoteMessage.messageId || data.notificationId || `${Date.now()}`;

  return {
    id: notificationId,
    title,
    body,
    imageUrl: data.imageUrl || '',
    gameLogoUrl: data.gameLogoUrl || '',
    type: data.type || 'general',
    allowUnfollow: data.allowUnfollow === 'true',
    data: {
      ...data,
      notificationId,
    },
  };
}

export function canDisplayUnfollowAction(payload) {
  return (
    payload?.type === 'news' &&
    payload?.allowUnfollow &&
    isValidAppId(payload?.data?.appId)
  );
}

export function appIdOrThrow(appId) {
  if (!isValidAppId(appId)) {
    throw new Error('appId manquant');
  }

  return String(appId);
}
