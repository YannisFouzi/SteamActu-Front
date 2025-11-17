/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import App from './App';
import { name as appName } from './app.json';
import { displayRemoteNotification } from './src/services/notificationService';

// ⚠️ IMPORTANT: Background Message Handler DOIT être défini ICI, au top-level
// Avant AppRegistry.registerComponent
// C'est obligatoire pour que les notifications en background fonctionnent sur Android/iOS
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message reçu en background:', remoteMessage);
  if (remoteMessage?.notification) {
    // Notification déjà affichée par FCM (payload notification present)
    return;
  }
  await displayRemoteNotification(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
