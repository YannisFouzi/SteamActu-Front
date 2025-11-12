import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import { debugError, debugLog } from '../hooks/hooksLogger';
import { userService } from './api';

const NOTIFICATION_CHANNEL_ID = 'steam_news';
const IOS_CATEGORY_ID = 'steam_news_actions';
const ACTION_OPEN_NEWS = 'open-news';
const ACTION_UNFOLLOW_GAME = 'unfollow-game';

let androidChannelInitialized = false;
let iosCategoriesInitialized = false;

const backgroundEventHandlers = new Set();

notifee.onBackgroundEvent(async event => {
  for (const handler of Array.from(backgroundEventHandlers)) {
    try {
      await handler(event);
    } catch (error) {
      debugError('[FCM] Erreur handler background Notifee:', error);
    }
  }
});

async function ensureNotificationPermission() {
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
        debugLog('[FCM] Permission notifications Android accordée');
        return {granted: true, status: 'authorized'};
      }

      if (blocked) {
        debugLog('[FCM] Notifications Android bloquées par l’utilisateur');
        return {granted: false, status: 'blocked'};
      }

      debugLog('[FCM] Permission notifications Android refusée');
      return {granted: false, status: 'denied'};
    } catch (error) {
      debugError('[FCM] Erreur vérification permission Android:', error);
      return {granted: false, status: 'error'};
    }
  }

  try {
    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (granted) {
      debugLog('[FCM] Permission notifications iOS accordée');
      return {granted: true, status: 'authorized'};
    }

    debugLog('[FCM] Permission notifications iOS refusée');
    return {granted: false, status: 'denied'};
  } catch (error) {
    debugError('[FCM] Erreur demande permission iOS:', error);
    return {granted: false, status: 'error'};
  }
}

/**
 * Récupère le token FCM et l'envoie au backend
 * @param {string} steamId - Steam ID de l'utilisateur
 * @returns {Promise<boolean>} - Succès de l'enregistrement
 */
export async function registerFCMToken(steamId) {
  try {
    if (!steamId) {
      debugError(
        "[FCM] Steam ID manquant, impossible d'enregistrer le token",
      );
      return {success: false, status: 'missing-steamid'};
    }

    const permission = await ensureNotificationPermission();
    if (!permission.granted) {
      debugLog(
        `[FCM] Permission refusée ou notifications bloquées (status=${permission.status})`,
      );
      return {success: false, status: permission.status};
    }

    // Récupérer le token FCM
    const token = await messaging().getToken();
    debugLog('[FCM] Token obtenu:', token.substring(0, 20) + '...');

    // Envoyer le token au backend via userService
    const platform = Platform.OS; // 'android' ou 'ios'
    await userService.registerFCMToken(steamId, token, platform);

    debugLog('[FCM] Token enregistré avec succès sur le backend');
    return {success: true, status: 'authorized'};
  } catch (error) {
    debugError('[FCM] Erreur enregistrement token:', error);
    return {success: false, status: 'error'};
  }
}

/**
 * Supprime le token FCM du backend (logout, désactivation notifs)
 * @param {string} steamId - Steam ID de l'utilisateur
 * @returns {Promise<boolean>} - Succès de la suppression
 */
export async function unregisterFCMToken(steamId) {
  try {
    if (!steamId) {
      debugError('[FCM] Steam ID manquant, impossible de supprimer le token');
      return false;
    }

    const token = await messaging().getToken();

    await userService.unregisterFCMToken(steamId, token);

    debugLog('[FCM] Token supprimé du backend');
    return true;
  } catch (error) {
    debugError('[FCM] Erreur suppression token:', error);
    return false;
  }
}

/**
 * S'assure que le canal Android requis par les notifications FCM existe
 * @returns {Promise<void>}
 */
async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android' || androidChannelInitialized) {
    return;
  }

  try {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Actualités Steam',
      description: 'Notifications push pour les actualités des jeux suivis',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    androidChannelInitialized = true;
    debugLog('[FCM] Canal Android "steam_news" prêt');
  } catch (error) {
    debugError('[FCM] Erreur création canal Android:', error);
  }
}

async function ensureIosNotificationCategories() {
  if (Platform.OS !== 'ios' || iosCategoriesInitialized) {
    return;
  }

  try {
    await notifee.setNotificationCategories([
      {
        id: IOS_CATEGORY_ID,
        actions: [
          {
            id: ACTION_UNFOLLOW_GAME,
            title: 'Ne plus suivre ce jeu',
            options: {
              foreground: true,
            },
          },
        ],
      },
    ]);
    iosCategoriesInitialized = true;
    debugLog('[FCM] Catégorie iOS "steam_news_actions" prête');
  } catch (error) {
    debugError('[FCM] Erreur création catégorie iOS:', error);
  }
}

function extractNotificationPayload(remoteMessage) {
  if (!remoteMessage) {
    return null;
  }

  const data = remoteMessage.data || {};
  const title = data.title || remoteMessage.notification?.title || '';
  const body = data.body || remoteMessage.notification?.body || '';

  if (!title && !body) {
    debugLog('[FCM] Pas de titre/corps dans le message FCM, notification ignorée');
    return null;
  }

  const notificationId =
    data.notificationId || remoteMessage.messageId || `${Date.now()}`;

  return {
    id: notificationId,
    title,
    body,
    allowUnfollow:
      data.allowUnfollow === '1' ||
      data.allowUnfollow === 'true' ||
      data.allowUnfollow === 'yes',
    data: {
      ...data,
      notificationId,
    },
  };
}

async function openUrlSafely(url) {
  if (!url) {
    return;
  }

  try {
    await Linking.openURL(url);
  } catch (error) {
    debugError('[FCM] Erreur ouverture URL:', error);
  }
}

export async function displayRemoteNotification(remoteMessage) {
  try {
    const payload = extractNotificationPayload(remoteMessage);
    if (!payload) {
      return;
    }

    await ensureAndroidNotificationChannel();
    await ensureIosNotificationCategories();

    const actions =
      Platform.OS === 'android' && payload.allowUnfollow && payload.data?.appId
        ? [
            {
              id: ACTION_UNFOLLOW_GAME,
              title: 'Ne plus suivre ce jeu',
              pressAction: {id: ACTION_UNFOLLOW_GAME},
            },
          ]
        : [];

    await notifee.displayNotification({
      id: payload.id,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        pressAction: {id: ACTION_OPEN_NEWS},
        actions,
        sound: 'default',
      },
      ios: {
        categoryId: IOS_CATEGORY_ID,
        sound: 'default',
      },
    });
  } catch (error) {
    debugError('[FCM] Erreur lors de l’affichage de la notification:', error);
  }
}

/**
 * Configure le handler pour les notifications et le rafraîchissement du token
 * @param {string} steamId - Steam ID pour ré-enregistrer le token si refresh
 * @param {Object} options - callbacks pour actions personnalisées
 */
export function setupNotificationHandlers(steamId, options = {}) {
  const {onUnfollowGame} = options;

  // Créer le canal Android si nécessaire (obligatoire pour Android 8+)
  ensureAndroidNotificationChannel().catch(error => {
    debugError('[FCM] Erreur ensureAndroidNotificationChannel:', error);
  });
  ensureIosNotificationCategories().catch(error => {
    debugError('[FCM] Erreur ensureIosNotificationCategories:', error);
  });

  // Gestion du rafraîchissement du token FCM
  const unsubscribeTokenRefresh = messaging().onTokenRefresh(
    async newToken => {
      debugLog('[FCM] Token rafraîchi:', newToken.substring(0, 20) + '...');
      if (steamId) {
        // Ré-enregistrer automatiquement le nouveau token
        await registerFCMToken(steamId);
      }
    },
  );

  const handleNotificationEvent = async ({type, detail}) => {
    try {
      if (
        type === EventType.PRESS ||
        type === EventType.ACTION_PRESS ||
        type === EventType.DELIVERED
      ) {
        const pressActionId = detail?.pressAction?.id;
        const notification = detail?.notification;
        const data = notification?.data || {};

        if (pressActionId === ACTION_OPEN_NEWS) {
          if (data.url) {
            await openUrlSafely(data.url);
          }
        } else if (pressActionId === ACTION_UNFOLLOW_GAME) {
          const appId = data.appId;
          if (!appId) {
            debugLog(
              '[FCM] Aucun appId trouvé pour "Ne plus suivre ce jeu", action ignorée',
            );
            return;
          }

          let success = true;
          if (typeof onUnfollowGame === 'function') {
            try {
              const result = await onUnfollowGame(appId);
              success = result !== false;
            } catch (error) {
              success = false;
              debugError(
                '[FCM] Erreur lors de la désinscription via notification:',
                error,
              );
            }
          }

          if (success && notification?.id) {
            await notifee.cancelNotification(notification.id);
            await notifee.cancelDisplayedNotification(notification.id);
          }
        } else if (
          type === EventType.PRESS &&
          !pressActionId &&
          data.url
        ) {
          // Cas où aucune action n'est fournie mais URL disponible (fallback)
          await openUrlSafely(data.url);
        }
      }
    } catch (error) {
      debugError('[FCM] Erreur gestion événement notification:', error);
    }
  };

  const foregroundSubscription = notifee.onForegroundEvent(
    handleNotificationEvent,
  );
  backgroundEventHandlers.add(handleNotificationEvent);

  const unsubscribeOnMessage = messaging().onMessage(
    async remoteMessage => {
      debugLog('[FCM] Message reçu (foreground):', remoteMessage);
      await displayRemoteNotification(remoteMessage);
    },
  );

  const unsubscribeOnNotificationOpenedApp =
    messaging().onNotificationOpenedApp(async remoteMessage => {
      debugLog('[FCM] Notification ouverte (background via FCM):', remoteMessage);
      const payload = extractNotificationPayload(remoteMessage);
      if (payload?.data?.url) {
        await openUrlSafely(payload.data.url);
      }
    });

  messaging()
    .getInitialNotification()
    .then(async remoteMessage => {
      if (remoteMessage) {
        debugLog('[FCM] App ouverte depuis notification (initiale):', remoteMessage);
        const payload = extractNotificationPayload(remoteMessage);
        if (payload?.data?.url) {
          await openUrlSafely(payload.data.url);
        }
      }
    })
    .catch(err => {
      debugError('[FCM] Erreur getInitialNotification:', err);
    });

  // Retourner les fonctions de nettoyage
  return () => {
    unsubscribeTokenRefresh();
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpenedApp();
    backgroundEventHandlers.delete(handleNotificationEvent);
    foregroundSubscription();
  };
}
