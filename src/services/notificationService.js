import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';
import { getApp } from '@react-native-firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { Linking, Platform } from 'react-native';
import { debugError, debugLog, showAlert } from '../hooks/hooksLogger';
import { getCurrentAppLanguage, translate } from '../i18n';
import { userService } from './api';
import { consumePendingNotification } from './initialNotificationStore';

const NOTIFICATION_CHANNEL_ID = 'steam_news';
const IOS_CATEGORY_ID = 'steam_news_actions';
const ACTION_OPEN_NEWS = 'open-news';
const ACTION_UNFOLLOW_GAME = 'unfollow-game';
const ACTION_FOLLOW_GAME = 'follow-game';

let androidChannelLanguage = null;
let iosCategoriesLanguage = null;
const processedNotificationIds = new Set();
const appInstance = getApp();
const messagingInstance = getMessaging(appInstance);

const backgroundEventHandlers = new Set();

notifee.onBackgroundEvent(async event => {
  const handlers = Array.from(backgroundEventHandlers);

  if (handlers.length === 0) {
    try {
      if (
        (event.type === EventType.PRESS ||
          event.type === EventType.ACTION_PRESS) &&
        event.detail?.pressAction?.id === ACTION_OPEN_NEWS
      ) {
        const url = event.detail?.notification?.data?.url;
        if (url) {
          await openUrlSafely(url);
          const processedId = event.detail?.notification?.id;
          if (processedId) {
            processedNotificationIds.add(processedId);
          }
        }
      } else if (
        (event.type === EventType.PRESS ||
          event.type === EventType.ACTION_PRESS) &&
        event.detail?.pressAction?.id === ACTION_UNFOLLOW_GAME
      ) {
        const data = event.detail?.notification?.data || {};
        const notificationId = event.detail?.notification?.id;
        const success = await performHeadlessNotificationUnfollow(
          data,
          notificationId,
        );

        if (success && notificationId) {
          processedNotificationIds.add(notificationId);
        }
      }
    } catch (error) {
      debugError('[FCM] Erreur fallback background Notifee:', error);
    }
    return;
  }

  for (const handler of handlers) {
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
    let settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
      settings = await notifee.requestPermission();
    }

    const granted =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

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
    const token = await getToken(messagingInstance);
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

    const token = await getToken(messagingInstance);

    if (token) {
      await userService.unregisterFCMToken(steamId, token);
    }

    await deleteToken(messagingInstance);

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
  const language = getCurrentAppLanguage();

  if (Platform.OS !== 'android' || androidChannelLanguage === language) {
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

    androidChannelLanguage = language;
    debugLog('[FCM] Canal Android "steam_news" prêt');
  } catch (error) {
    debugError('[FCM] Erreur création canal Android:', error);
  }
}

async function ensureIosNotificationCategories() {
  const language = getCurrentAppLanguage();

  if (Platform.OS !== 'ios' || iosCategoriesLanguage === language) {
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
    iosCategoriesLanguage = language;
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
  const title = remoteMessage.notification?.title || data.title || '';
  const body = remoteMessage.notification?.body || data.body || '';

  if (!title && !body) {
    debugLog('[FCM] Pas de titre/corps dans le message FCM, notification ignorée');
    return null;
  }

  const notificationId =
    remoteMessage.messageId || data.notificationId || `${Date.now()}`;

  return {
    id: notificationId,
    title,
    body,
    allowUnfollow: data.allowUnfollow === 'true',
    data: {
      ...data,
      notificationId,
    },
    type: data.type || 'general',
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

async function performHeadlessNotificationUnfollow(data, notificationId) {
  const steamId = data?.steamId;
  const appId = data?.appId;

  if (!steamId || !appId) {
    debugLog(
      '[FCM] steamId ou appId manquant pour unfollow headless, action ignoree',
    );
    return false;
  }

  try {
    await userService.unfollowGame(steamId, appId);

    if (notificationId) {
      await notifee.cancelNotification(notificationId);
      await notifee.cancelDisplayedNotification(notificationId);
    }

    return true;
  } catch (error) {
    debugError('[FCM] Erreur unfollow headless via notification:', error);
    return false;
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

    // Validation robuste pour l'affichage du bouton "Ne plus suivre ce jeu"
    // Conditions requises :
    // 1. allowUnfollow est activé dans le payload
    // 2. appId existe et est valide (non vide, numérique)
    // 3. Type de notification est dans la whitelist (news uniquement)
    const appId = payload.data?.appId;
    const isValidAppId =
      appId && String(appId).trim() !== '' && !isNaN(parseInt(appId, 10));
    const isAllowedType = payload.type === 'news'; // Whitelist: seulement les news

    const canUnfollow = payload.allowUnfollow && isValidAppId && isAllowedType;

    // Debug logs pour troubleshooting
    if (payload.allowUnfollow && !canUnfollow) {
      debugLog(
        `[FCM] Bouton unfollow non affiché - appId:${appId} valid:${isValidAppId} type:${payload.type} allowed:${isAllowedType}`,
      );
    } else if (canUnfollow) {
      debugLog(
        `[FCM] ✅ Bouton unfollow activé - appId:${appId} type:${payload.type} platform:${Platform.OS}`,
      );
    }

    const actions =
      Platform.OS === 'android' && canUnfollow
        ? [
            {
              id: ACTION_UNFOLLOW_GAME,
              title: translate('notifications.unfollowAction'),
              pressAction: {id: ACTION_UNFOLLOW_GAME},
            },
          ]
        : [];

    const pressActionId =
      payload.type === 'follow_prompt' ? ACTION_FOLLOW_GAME : ACTION_OPEN_NEWS;

    await notifee.displayNotification({
      id: payload.id,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        pressAction: {id: pressActionId},
        actions,
        sound: 'default',
      },
      ios: {
        categoryId: canUnfollow ? IOS_CATEGORY_ID : undefined,
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
  const {
    onUnfollowGame,
    onNewsUnfollow,
    onWishlistUnfollow,
    onFollowedGamesTabUnfollow,
    onFollowPromptConfirm,
  } = options;

  // Créer le canal Android si nécessaire (obligatoire pour Android 8+)
  ensureAndroidNotificationChannel().catch(error => {
    debugError('[FCM] Erreur ensureAndroidNotificationChannel:', error);
  });
  ensureIosNotificationCategories().catch(error => {
    debugError('[FCM] Erreur ensureIosNotificationCategories:', error);
  });

  // Gestion du rafraîchissement du token FCM
  const unsubscribeTokenRefresh = onTokenRefresh(
    messagingInstance,
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
        type === EventType.ACTION_PRESS
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

          if (success) {
            try {
              if (typeof onNewsUnfollow === 'function') {
                onNewsUnfollow(appId);
              }
              if (typeof onWishlistUnfollow === 'function') {
                onWishlistUnfollow(appId);
              }
              if (typeof onFollowedGamesTabUnfollow === 'function') {
                onFollowedGamesTabUnfollow(appId);
              }
            } catch (syncError) {
              debugError(
                '[FCM] Erreur lors de la synchronisation locale après unfollow:',
                syncError,
              );
            }
          }

          if (success && notification?.id) {
            await notifee.cancelNotification(notification.id);
            await notifee.cancelDisplayedNotification(notification.id);
          }
        } else if (
          pressActionId === ACTION_FOLLOW_GAME ||
          (type === EventType.PRESS &&
            !pressActionId &&
            data.type === 'follow_prompt')
        ) {
          const appId = data.appId;
          if (!appId) {
            debugLog(
              '[FCM] Aucun appId trouvé pour follow_prompt, action ignorée',
            );
            return;
          }

          if (!steamId) {
            debugLog('[FCM] steamId manquant, impossible de suivre le jeu');
            return;
          }

          try {
            debugLog('[FCM] 📥 Confirmation follow_prompt pour', appId);
            await userService.followGame(
              steamId,
              appId,
              data.gameName || '',
              data.imageUrl || '',
            );

            if (typeof onFollowPromptConfirm === 'function') {
              onFollowPromptConfirm(appId);
            }
          } catch (error) {
            debugError('[FCM] Erreur lors du follow_prompt:', error);
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
          } catch (cancelError) {
            debugError(
              '[FCM] Erreur lors de la fermeture de la notification follow_prompt:',
              cancelError,
            );
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

  const unsubscribeOnMessage = onMessage(
    messagingInstance,
    async remoteMessage => {
      debugLog('[FCM] Message reçu (foreground):', remoteMessage);
      await displayRemoteNotification(remoteMessage);
    },
  );

  const unsubscribeOnNotificationOpenedApp = onNotificationOpenedApp(
    messagingInstance,
    async remoteMessage => {
      debugLog('[FCM] Notification ouverte (background via FCM):', remoteMessage);
      const payload = extractNotificationPayload(remoteMessage);
      if (payload?.data?.url) {
        await openUrlSafely(payload.data.url);
      }
    },
  );

  // Consommer la notification initiale capturee au bootstrap (index.js)
  // Elle a ete stockee le plus tot possible, avant le render React
  const pendingNotification = consumePendingNotification();
  if (pendingNotification) {
    const { source, data: initialData } = pendingNotification;
    debugLog(`[FCM] Notification initiale consommee (source: ${source})`);

    if (source === 'firebase' && initialData) {
      const payload = extractNotificationPayload(initialData);
      if (payload?.id && !processedNotificationIds.has(payload.id)) {
        if (payload?.data?.url) {
          openUrlSafely(payload.data.url);
          processedNotificationIds.add(payload.id);
        }
      }
    } else if (source === 'notifee' && initialData) {
      const notificationId = initialData.notification?.id;
      if (!notificationId || !processedNotificationIds.has(notificationId)) {
        handleNotificationEvent({
          type: EventType.PRESS,
          detail: initialData,
        }).catch(error => {
          debugError('[FCM] Erreur traitement notification initiale Notifee:', error);
        });
        if (notificationId) {
          processedNotificationIds.add(notificationId);
        }
      }
    }
  }

  // Retourner les fonctions de nettoyage
  return () => {
    unsubscribeTokenRefresh();
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpenedApp();
    backgroundEventHandlers.delete(handleNotificationEvent);
    foregroundSubscription();
  };
}
