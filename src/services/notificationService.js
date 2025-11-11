import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import {Platform, Linking} from 'react-native';
import {debugLog, debugError} from '../hooks/hooksLogger';
import {userService} from './api';

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

// Flag interne pour éviter de recréer le canal à chaque appel
let androidChannelInitialized = false;

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
      id: 'steam_news',
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

/**
 * Configure le handler pour les notifications et le rafraîchissement du token
 * @param {string} steamId - Steam ID pour ré-enregistrer le token si refresh
 */
export function setupNotificationHandlers(steamId) {
  // Créer le canal Android si nécessaire (obligatoire pour Android 8+)
  ensureAndroidNotificationChannel().catch(error => {
    debugError('[FCM] Erreur ensureAndroidNotificationChannel:', error);
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

  // Notification reçue en foreground
  const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
    debugLog('[FCM] Notification reçue (foreground):', remoteMessage);
    // Afficher une notification locale ou un toast
    // TODO: Implémenter l'affichage local si nécessaire
  });

  // Notification cliquée (app en background)
  const unsubscribeOnNotificationOpenedApp =
    messaging().onNotificationOpenedApp(remoteMessage => {
      debugLog('[FCM] Notification ouverte (background):', remoteMessage);
      const url = remoteMessage.data?.url;
      if (url) {
        Linking.openURL(url).catch(err =>
          debugError('[FCM] Erreur ouverture URL:', err),
        );
      }
    });

  // Notification cliquée (app complètement fermée)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        debugLog('[FCM] App ouverte depuis notification:', remoteMessage);
        const url = remoteMessage.data?.url;
        if (url) {
          Linking.openURL(url).catch(err =>
            debugError('[FCM] Erreur ouverture URL:', err),
          );
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
  };
}
