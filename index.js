/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import {AppRegistry} from 'react-native';
import 'react-native-gesture-handler';
import App from './App';
import {name as appName} from './app.json';
import {displayRemoteNotification} from './src/services/notificationService';
import {setPendingNotification} from './src/services/initialNotificationStore';

// Capturer l'intent initial le plus tot possible (avant le render React)
// Si l'app a ete lancee par un tap sur une notification, on stocke l'info
// pour la consommer des que steamId est disponible
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('[FCM] Initial notification capturee au bootstrap:', remoteMessage.messageId);
      setPendingNotification({source: 'firebase', data: remoteMessage});
    }
  })
  .catch(err => console.error('[FCM] Erreur getInitialNotification bootstrap:', err));

notifee
  .getInitialNotification()
  .then(initialNotification => {
    if (initialNotification) {
      console.log('[FCM] Notifee initial notification capturee au bootstrap');
      setPendingNotification({source: 'notifee', data: initialNotification});
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
