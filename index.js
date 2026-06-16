/**
 * @format
 */

import * as Sentry from '@sentry/react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {EventType} from '@notifee/react-native';
import {AppRegistry} from 'react-native';
import 'react-native-gesture-handler';
import './src/i18n';
import App from './App';
import {name as appName} from './app.json';
import {APP_CONFIG} from './src/config/env';
import {
  markInitialNotificationBootstrapResolved,
  setPendingNotification,
} from './src/services/initialNotificationStore';
import {displayRemoteNotification} from './src/services/notificationService';
import {initAnalytics} from './src/services/analytics';

// Configure la collecte analytics dès le boot (désactivée en dev). Firebase
// collecte ensuite pays/audience automatiquement en prod ; le suivi d'écrans et
// les events d'usage sont déclenchés depuis l'app.
initAnalytics();

if (APP_CONFIG.SENTRY_DSN) {
  Sentry.init({
    dsn: APP_CONFIG.SENTRY_DSN,
    environment: APP_CONFIG.ENVIRONMENT,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    sendDefaultPii: true,
    enableNative: true,
  });
  console.log('[Sentry] Initialise (env:', APP_CONFIG.ENVIRONMENT, ')');
} else {
  console.log('[Sentry] Desactive (SENTRY_DSN_MOBILE non defini)');
}

// Background Notifee Event Handler : DOIT etre enregistre au top-level
// pour fonctionner en headless mode (app killed).
notifee.onBackgroundEvent(async event => {
  console.log(
    '[FCM] [BOOT] onBackgroundEvent type=' +
      event.type +
      ' pressAction=' +
      event.detail?.pressAction?.id +
      ' dataType=' +
      event.detail?.notification?.data?.type,
  );

  if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) {
    return;
  }

  const {handleBackgroundNotifeeEvent, getBackgroundEventHandlers} = require(
    './src/services/notifications/events',
  );

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

// Capturer l'intent initial le plus tot possible (avant le render React).
// AppNavigator attend explicitement la resolution de ce bootstrap avant de
// monter NavigationContainer, pour choisir le bon ecran initial sans flash.
const firebaseInitialNotificationPromise = messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log(
        '[FCM] [BOOT] Firebase getInitialNotification -> OUI',
        remoteMessage.messageId,
        JSON.stringify(remoteMessage.data),
      );
      setPendingNotification({source: 'firebase', data: remoteMessage});
    } else {
      console.log('[FCM] [BOOT] Firebase getInitialNotification -> null');
    }
  })
  .catch(err =>
    console.error('[FCM] Erreur getInitialNotification bootstrap:', err),
  );

const notifeeInitialNotificationPromise = notifee
  .getInitialNotification()
  .then(initialNotification => {
    if (initialNotification) {
      console.log(
        '[FCM] [BOOT] Notifee getInitialNotification -> OUI',
        JSON.stringify(initialNotification?.notification?.data),
      );
      setPendingNotification({source: 'notifee', data: initialNotification});
    } else {
      console.log('[FCM] [BOOT] Notifee getInitialNotification -> null');
    }
  })
  .catch(err =>
    console.error('[FCM] Erreur notifee.getInitialNotification bootstrap:', err),
  );

Promise.allSettled([
  firebaseInitialNotificationPromise,
  notifeeInitialNotificationPromise,
]).finally(() => {
  markInitialNotificationBootstrapResolved();
});

// Background Message Handler - DOIT etre defini au top-level avant AppRegistry
// Deux cas :
// 1. Message notification+data (sans bouton action) : FCM l'a deja affichee
// 2. Message data-only : Notifee affiche avec boutons
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message recu en background:', remoteMessage);

  if (remoteMessage?.notification) {
    return;
  }

  await displayRemoteNotification(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
