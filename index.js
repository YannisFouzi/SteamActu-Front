/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import notifee, {EventType} from '@notifee/react-native';
import {AppRegistry} from 'react-native';
import 'react-native-gesture-handler';
import './src/i18n';
import App from './App';
import {name as appName} from './app.json';
import {displayRemoteNotification} from './src/services/notificationService';
import {setPendingNotification} from './src/services/initialNotificationStore';

// Background Notifee Event Handler — DOIT etre enregistre au top-level (index.js)
// pour fonctionner en headless mode (app killed). Les imports dynamiques
// (require) garantissent que le handler reste leger au boot.
notifee.onBackgroundEvent(async event => {
  console.log('[FCM] [BOOT] onBackgroundEvent type=' + event.type + ' pressAction=' + event.detail?.pressAction?.id + ' dataType=' + event.detail?.notification?.data?.type);

  if (
    event.type !== EventType.PRESS &&
    event.type !== EventType.ACTION_PRESS
  ) {
    return;
  }

  const {handleBackgroundNotifeeEvent, getBackgroundEventHandlers} =
    require('./src/services/notifications/events');

  const handlers = getBackgroundEventHandlers();
  console.log('[FCM] [BOOT] handlers.length=' + handlers.length);

  if (handlers.length === 0) {
    await handleBackgroundNotifeeEvent(event);
    return;
  }

  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (error) {
      console.error('[FCM] Erreur handler background Notifee', error);
    }
  }
});

// Capturer l'intent initial le plus tot possible (avant le render React)
// Si l'app a ete lancee par un tap sur une notification, on stocke l'info
// pour la consommer des que steamId est disponible
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('[FCM] [BOOT] Firebase getInitialNotification → OUI', remoteMessage.messageId, JSON.stringify(remoteMessage.data));
      setPendingNotification({source: 'firebase', data: remoteMessage});
    } else {
      console.log('[FCM] [BOOT] Firebase getInitialNotification → null');
    }
  })
  .catch(err => console.error('[FCM] Erreur getInitialNotification bootstrap:', err));

notifee
  .getInitialNotification()
  .then(initialNotification => {
    if (initialNotification) {
      console.log('[FCM] [BOOT] Notifee getInitialNotification → OUI', JSON.stringify(initialNotification?.notification?.data));
      setPendingNotification({source: 'notifee', data: initialNotification});
    } else {
      console.log('[FCM] [BOOT] Notifee getInitialNotification → null');
    }
  })
  .catch(err => console.error('[FCM] Erreur notifee.getInitialNotification bootstrap:', err));

// Background Message Handler - DOIT etre defini au top-level avant AppRegistry
// Deux cas :
// 1. Message notification+data (sans bouton action) → FCM l'a deja affichee, rien a faire
// 2. Message data-only (news avec unfollow, follow_prompt) → Notifee affiche avec boutons
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message recu en background:', remoteMessage);

  if (remoteMessage?.notification) {
    // FCM a deja affiche la notification nativement
    return;
  }

  // Data-only : affichage via Notifee (avec boutons action si applicable)
  await displayRemoteNotification(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
